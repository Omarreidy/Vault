/**
 * Pulse insight honesty: the evergreen fallback set must never masquerade as
 * live news (no fake timestamps, no fabricated product perks, no claims about
 * the member's own accounts), and the live-news mapping must only replace the
 * fallback when a real batch of news arrives.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INSIGHTS, newsToInsight, liveNewsToInsights, buildImpactPill,
} from '../src/services/insights';
import type { NewsItem } from '../src/services/marketSignal';

const news = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: 'n1',
  headline: 'Fed signals patience on rate cuts',
  source: 'Reuters',
  minutesAgo: 30,
  sentiment: 'neutral',
  category: 'FED',
  impact: 'Rates likely to hold steady for now.',
  ...overrides,
});

// ── Evergreen fallback set ───────────────────────────────────────────────────

test('evergreen insights carry no fake relative timestamps', () => {
  for (const i of INSIGHTS) {
    assert.ok(!/\bago\b/i.test(i.timeAgo), `${i.id} timeAgo "${i.timeAgo}" fakes freshness`);
    assert.ok(!/^\d+\s*[mhd]/i.test(i.timeAgo), `${i.id} timeAgo "${i.timeAgo}" looks like a timestamp`);
  }
});

test('evergreen insights make no fabricated product or personal claims', () => {
  const banned = [
    /partner (card|rate)/i,          // perks VAULT does not offer
    /you qualify/i,                  // fake personalized eligibility
    /you're in that window/i,        // fake personalized timing claim
    /months? short of/i,             // fake claim about the member's own buffer
    /vault (gold|silver|platinum|black) tier/i, // tier-gated perks that don't exist
  ];
  for (const i of INSIGHTS) {
    const text = `${i.headline} ${i.body} ${i.impact}`;
    for (const rx of banned) {
      assert.ok(!rx.test(text), `${i.id} contains fabricated claim matching ${rx}: "${text.slice(0, 120)}…"`);
    }
  }
});

test('evergreen insights do not claim to report current events', () => {
  // Phrases that frame a static card as breaking/current news.
  const newsy = [/\btoday\b/i, /this week/i, /just (hit|announced)/i, /came in at/i, /\bheld rates\b/i];
  for (const i of INSIGHTS) {
    for (const rx of newsy) {
      assert.ok(!rx.test(i.headline), `${i.id} headline reads as live news (${rx}): "${i.headline}"`);
    }
  }
});

test('evergreen set keeps valid shape for the feed and filters', () => {
  const validTags = new Set(['MACRO', 'MARKETS', 'CAREER', 'CREDIT', 'ECONOMY']);
  const ids = new Set<string>();
  for (const i of INSIGHTS) {
    assert.ok(validTags.has(i.tag), `${i.id} tag ${i.tag} has no filter`);
    assert.ok(['positive', 'negative', 'neutral'].includes(i.impactType));
    assert.ok(i.headline.length > 0 && i.body.length > 0 && i.impact.length > 0);
    assert.ok(!ids.has(i.id), `duplicate id ${i.id}`);
    ids.add(i.id);
  }
  assert.ok(INSIGHTS.length >= 8, 'fallback set is large enough for a full day of pulse cards');
});

// ── Live news mapping ────────────────────────────────────────────────────────

test('newsToInsight maps category, sentiment, and real timestamps', () => {
  const i = newsToInsight(news({ sentiment: 'bullish', category: 'FED', minutesAgo: 45 }), 0);
  assert.equal(i.id, 'live-n1');
  assert.equal(i.tag, 'MACRO');
  assert.equal(i.impactType, 'positive');
  assert.equal(i.timeAgo, '45m ago');
  assert.equal(i.saved, false);

  const bearishTech = newsToInsight(news({ id: 'n2', sentiment: 'bearish', category: 'TECH', minutesAgo: 120 }), 1);
  assert.equal(bearishTech.tag, 'MARKETS');
  assert.equal(bearishTech.impactType, 'negative');
  assert.equal(bearishTech.timeAgo, '2h ago');
});

test('newsToInsight falls back to index id and MACRO tag for unknown input', () => {
  const i = newsToInsight(news({ id: undefined as any, category: 'UNKNOWN' as any }), 7);
  assert.equal(i.id, 'live-7');
  assert.equal(i.tag, 'MACRO');
});

test('liveNewsToInsights only replaces the fallback with a real batch (3+)', () => {
  assert.equal(liveNewsToInsights(null), null);
  assert.equal(liveNewsToInsights(undefined), null);
  assert.equal(liveNewsToInsights([]), null);
  assert.equal(liveNewsToInsights([news(), news({ id: 'n2' })]), null);

  const batch = liveNewsToInsights([news(), news({ id: 'n2' }), news({ id: 'n3' })]);
  assert.ok(batch);
  assert.equal(batch!.length, 3);
  assert.ok(batch!.every(i => i.id.startsWith('live-')));
});

test('buildImpactPill returns guidance for every sentiment/category combo', () => {
  const sentiments = ['bullish', 'bearish', 'neutral'];
  const categories = ['FED', 'TECH', 'ENERGY', 'CRYPTO', 'EARNINGS', 'MACRO', 'LEGAL', 'UNKNOWN'];
  for (const s of sentiments) {
    for (const c of categories) {
      assert.ok(buildImpactPill(s, c).length > 0, `empty pill for ${s}/${c}`);
    }
  }
});
