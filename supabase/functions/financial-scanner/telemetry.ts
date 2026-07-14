// Structured scan telemetry — one JSON line per scan outcome, written to the
// function's log stream (queryable in the Supabase dashboard / log drains as
// `event = "scan_telemetry"`). Tagged with the REAL failure reason and the
// per-provider attempt trail; the client only ever sees sanitized error codes,
// so this is the source of truth for our actual failure rate and its causes.
// No Deno imports so it is unit-testable (tests/scanner.test.ts).

import type { AttemptFailure } from './chain.ts';

export interface ScanLogEvent {
  /** success = verdict returned; failure = we tried and could not;
   *  rejected = request refused up front (auth, rate limit, bad input). */
  outcome: 'success' | 'failure' | 'rejected';
  /** Machine-readable cause, e.g. 'all_providers_failed', 'image_too_large',
   *  'unauthorized', 'rate_limited', 'unhandled_exception'. */
  reason?: string;
  /** Provider that produced the verdict, when outcome = success. */
  provider?: string;
  attempts?: number;
  /** Per-attempt failure trail from the provider chain — present on failures
   *  AND on successes that needed a retry/fallback (early vendor-degradation
   *  signal even when the user never noticed). */
  failures?: AttemptFailure[];
  userId?: string;
  durationMs: number;
  detail?: string;
}

export function emitScanTelemetry(
  event: ScanLogEvent,
  write: (line: string) => void = console.log,
): void {
  try {
    write(JSON.stringify({ event: 'scan_telemetry', at: new Date().toISOString(), ...event }));
  } catch {
    // Telemetry must never break (or fail) a scan.
  }
}
