// Pure parsing/validation of the model's scan verdict — no Deno imports so it
// is unit-testable (tests/ai.test.ts). The client renders this
// object directly (colors/icons are keyed by verdict, XP is credited), so
// every field the model returns is validated before it leaves the server.

export type ScanVerdict = 'ASSET' | 'LIABILITY' | 'BUDGET CHECK';

const VERDICTS: ScanVerdict[] = ['ASSET', 'LIABILITY', 'BUDGET CHECK'];

// Design range for scan XP (see the prompt: "number between 10 and 25").
const XP_MIN = 0;
const XP_MAX = 25;
const XP_DEFAULT = 10;

export interface ParsedScanResult {
  verdict: ScanVerdict;
  itemName: string;
  emoji: string;
  tagline: string;
  monthlyCost?: string;
  annualImpact: string;
  wealthScoreImpact: string;
  insight: string;
  tip: string;
  xp: number;
}

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim().length > 0 ? v : fallback;

function clampXp(v: unknown): number {
  const n = typeof v === 'number' && isFinite(v) ? Math.round(v) : XP_DEFAULT;
  return Math.min(Math.max(n, XP_MIN), XP_MAX);
}

/** Honest fallback when the model's reply contains no parseable verdict. */
export function fallbackScanResult(modelText: string): ParsedScanResult {
  return {
    verdict: 'BUDGET CHECK',
    itemName: 'Scanned Item',
    emoji: '📄',
    tagline: 'Could not fully analyze — try a clearer photo.',
    annualImpact: 'Unknown',
    wealthScoreImpact: 'Neutral',
    insight: modelText.slice(0, 300),
    tip: 'Take a clearer, well-lit photo for a more precise verdict.',
    xp: XP_DEFAULT,
  };
}

/**
 * Extracts and validates the JSON verdict from the model's raw text.
 * Never throws; anything malformed degrades to the honest fallback or a
 * safe default per field (verdict coerced into the enum, xp clamped 0–25).
 */
export function parseScanResult(text: string): ParsedScanResult {
  let raw: any = null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = JSON.parse(jsonMatch[0]);
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return fallbackScanResult(text);

  const result: ParsedScanResult = {
    verdict: VERDICTS.includes(raw.verdict) ? raw.verdict : 'BUDGET CHECK',
    itemName: str(raw.itemName, 'Scanned Item'),
    emoji: str(raw.emoji, '📄'),
    tagline: str(raw.tagline, 'Financial verdict'),
    annualImpact: str(raw.annualImpact, 'Unknown'),
    wealthScoreImpact: str(raw.wealthScoreImpact, 'Neutral'),
    insight: str(raw.insight, ''),
    tip: str(raw.tip, ''),
    xp: clampXp(raw.xp),
  };
  if (typeof raw.monthlyCost === 'string' && raw.monthlyCost.trim()) {
    result.monthlyCost = raw.monthlyCost;
  }
  return result;
}
