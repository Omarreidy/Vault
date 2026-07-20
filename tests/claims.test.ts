/**
 * Claims regression guard (2026-07-19 remediation pass).
 *
 * VAULT's public-claims policy lives in docs/marketing/MARKETING_SOURCE_OF_TRUTH.md.
 * This test scans every user-facing text surface in the repo for claims that were
 * removed because they were fabricated, unsupported, or legally risky — and fails
 * if any of them come back:
 *
 *   - nonexistent tier/Premium perks (partner rates, member card, priority concierge…)
 *   - fabricated statistics (the 73% raise stat, "top X% of members/your age"…)
 *   - "advisor" framing (VAULT is educational; only negations like "not a financial
 *     adviser" are allowed)
 *   - unsupported freshness claims ("real-time")
 *   - unqualified "guaranteed" outcome language (negated disclaimers are allowed)
 *   - hardcoded subscription prices (RevenueCat/App Store Connect is the only source)
 *   - fabricated example recency ("annual fee posts Friday", "haven't used since March")
 *
 * docs/marketing/*.md are deliberately NOT scanned: they must be able to name the
 * banned phrases in their prohibition lists.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.join(__dirname, '..');

// User-facing surfaces: app screens/components/services/constants, the concierge
// system prompt and shared onboarding copy, the marketing site, store metadata.
const SCAN_DIRS = [
  'src/screens',
  'src/components',
  'src/services',
  'src/constants',
  'src/context',
  'supabase/functions/concierge',
  'supabase/functions/_shared',
  'website/src',
  'store',
];
const EXTS = new Set(['.ts', '.tsx', '.md']);

function collectFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(p));
    else if (EXTS.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const FILES = SCAN_DIRS.flatMap(collectFiles);

interface Rule {
  name: string;
  pattern: RegExp;
  /** A match is allowed when this tests true against the 60 chars before it (negations, comments). */
  allowBefore?: RegExp;
}

const RULES: Rule[] = [
  { name: 'partner-rate promises', pattern: /partner rates?\b|partner access/i },
  { name: 'member-card promises', pattern: /member card/i },
  { name: 'priority/dedicated concierge tiers', pattern: /priority concierge|concierge priority|dedicated advis\w+|white-glove/i },
  { name: 'nonexistent wealth reports', pattern: /wealth report\b|weekly report\b/i },
  { name: 'the unsourced 73% statistic', pattern: /\b73%/ },
  { name: '"sees everything" data overclaim', pattern: /sees everything/i },
  {
    name: 'advisor framing (only negations allowed)',
    pattern: /(wealth|financial|ai) advis(or|er)|private advisory|advisory session/i,
    // "not a financial adviser", "is not … investment adviser", code comments.
    allowBefore: /\bnot\b[^.]*$|\/\/[^\n]*$/i,
  },
  {
    name: 'unsupported real-time claims',
    pattern: /real[- ]time/i,
    allowBefore: /\/\/[^\n]*$/,
  },
  {
    name: 'unqualified "guaranteed" outcomes',
    pattern: /\bguaranteed?\b/i,
    // Negated legal/disclaimer usage and code comments are fine.
    allowBefore: /\b(not|no|never|without|do not|does not|guarantees)\b[^.]*$|\/\/[^\n]*$/i,
  },
  {
    // Only x.99-style subscription prices — educational examples like a
    // "$100/mo contribution" are legitimate content, not price claims.
    name: 'hardcoded subscription price',
    pattern: /\$\d+\.99\s*(\/|per\s*)?(mo|month)?\b/i,
  },
  { name: 'fabricated population percentiles', pattern: /top \d+% of |in the top \d+%|top \d+% for/i },
  {
    name: 'invented cohort/age comparisons',
    pattern: /of (people|members|americans|wealth builders) your age|for your age group|of all vault (users|members)|building wealth faster than/i,
  },
  { name: '"addictive" framing', pattern: /as addictive/i },
  { name: 'fabricated example recency', pattern: /annual fee posts|haven'?t used since/i },
  { name: 'absolute behavior-not-balance claim', pattern: /never by balance|behavior, not balance|behavior alone/i },
];

test('claims guard scans a sensible number of user-facing files', () => {
  assert.ok(FILES.length > 60, `expected >60 files, found ${FILES.length} — scan dirs moved?`);
});

for (const rule of RULES) {
  test(`no user-facing surface contains ${rule.name}`, () => {
    const violations: string[] = [];
    for (const file of FILES) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      for (let m = re.exec(text); m !== null; m = re.exec(text)) {
        const before = text.slice(Math.max(0, m.index - 60), m.index);
        // Only look at the current line for negation/comment context.
        const beforeOnLine = before.slice(before.lastIndexOf('\n') + 1);
        if (rule.allowBefore && rule.allowBefore.test(beforeOnLine)) continue;
        const line = text.slice(0, m.index).split('\n').length;
        violations.push(`${file}:${line} → "${m[0]}"`);
      }
    }
    assert.deepEqual(violations, [], `Prohibited claim pattern returned:\n${violations.join('\n')}`);
  });
}
