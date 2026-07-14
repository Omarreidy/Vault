// Pure retry/backoff/fallback engine for the scanner's model calls — no Deno
// imports so it is unit-testable (tests/scanner.test.ts). index.ts supplies
// the actual providers (Anthropic primary, Anthropic fallback model, OpenAI);
// this module only decides what is retryable, how long to wait, and when to
// give up on a provider and move to the next one.

export type FailureKind =
  | 'timeout'       // attempt exceeded its time budget
  | 'rate_limited'  // provider returned 429
  | 'overloaded'    // provider returned 529 / "overloaded"
  | 'server_error'  // provider returned 5xx
  | 'network'       // transport-level failure reaching the provider
  | 'auth'          // provider rejected our API key (401/403) — retry won't help
  | 'bad_request'   // provider rejected the request shape (4xx) — retry won't help
  | 'unknown';

export interface AttemptFailure {
  provider: string;
  attempt: number;
  kind: FailureKind;
  message: string;
}

export interface Provider<T> {
  name: string;
  call: () => Promise<T>;
}

export class AllProvidersFailedError extends Error {
  failures: AttemptFailure[];
  constructor(failures: AttemptFailure[]) {
    super(`all providers failed: ${failures.map(f => `${f.provider}#${f.attempt}=${f.kind}`).join(', ')}`);
    this.name = 'AllProvidersFailedError';
    this.failures = failures;
  }
}

export function classifyFailure(err: unknown): FailureKind {
  const status = (err as { status?: unknown })?.status;
  if (typeof status === 'number') {
    if (status === 429) return 'rate_limited';
    if (status === 529) return 'overloaded';
    if (status >= 500) return 'server_error';
    if (status === 401 || status === 403) return 'auth';
    if (status >= 400) return 'bad_request';
  }
  const name = (err as { name?: string })?.name ?? '';
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  if (name === 'TimeoutError' || name === 'AbortError' || name === 'APIConnectionTimeoutError'
      || msg.includes('timed out') || msg.includes('timeout')) return 'timeout';
  if (name === 'APIConnectionError' || msg.includes('network') || msg.includes('fetch failed')
      || msg.includes('econn') || msg.includes('socket')) return 'network';
  if (msg.includes('overloaded')) return 'overloaded';
  return 'unknown';
}

// auth/bad_request are deterministic — the same call will fail the same way,
// so skip straight to the next provider. Everything else is worth one more try.
export function isRetryable(kind: FailureKind): boolean {
  return kind !== 'auth' && kind !== 'bad_request';
}

export interface ChainOptions {
  maxAttemptsPerProvider?: number;
  attemptTimeoutMs?: number;
  baseDelayMs?: number;
  /** Hard wall-clock cap for the whole chain, so a pathological run of slow
   *  timeouts can't hold the request open longer than the client will wait. */
  totalBudgetMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface ChainSuccess<T> {
  result: T;
  provider: string;
  attempts: number;
  /** Failures that were recovered from before this success — telemetry wants
   *  these too: a scan that only succeeded on the fallback is a vendor signal. */
  failures: AttemptFailure[];
}

const defaultSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const e = new Error(`attempt timed out after ${ms}ms`);
      e.name = 'TimeoutError';
      reject(e);
    }, ms);
    p.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function runProviderChain<T>(
  providers: Provider<T>[],
  opts: ChainOptions = {},
): Promise<ChainSuccess<T>> {
  const {
    maxAttemptsPerProvider = 2,
    attemptTimeoutMs = 26_000,
    baseDelayMs = 400,
    totalBudgetMs = 60_000,
    sleep = defaultSleep,
    now = Date.now,
  } = opts;

  const started = now();
  const failures: AttemptFailure[] = [];
  let attempts = 0;

  outer: for (const provider of providers) {
    for (let attempt = 1; attempt <= maxAttemptsPerProvider; attempt++) {
      if (now() - started >= totalBudgetMs) {
        failures.push({ provider: provider.name, attempt, kind: 'timeout', message: 'chain time budget exhausted' });
        break outer;
      }
      attempts++;
      try {
        const result = await withTimeout(provider.call(), attemptTimeoutMs);
        return { result, provider: provider.name, attempts, failures };
      } catch (err) {
        const kind = classifyFailure(err);
        failures.push({
          provider: provider.name,
          attempt,
          kind,
          message: String((err as { message?: string })?.message ?? err).slice(0, 300),
        });
        if (!isRetryable(kind)) break;
        if (attempt < maxAttemptsPerProvider) {
          await sleep(baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
        }
      }
    }
  }
  throw new AllProvidersFailedError(failures);
}
