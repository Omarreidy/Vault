import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ServerPrefs, DEFAULT_SERVER_PREFS, canSendNow, localHour,
  shouldNotifyTier, dedupeKeyFor, pickVariant, classifyReceipt, chunk,
} from './logic.ts';
import { buildCopy, variantCount } from './copy.ts';

/**
 * The push dispatcher — the only writer of real (server-initiated) pushes.
 * pg_cron invokes it every 15 minutes (see migrations/20260718000000). Each
 * run advances three stages; all rules live in logic.ts / copy.ts (pure,
 * unit-tested), this file is the I/O shell:
 *
 *   1. ENQUEUE  — evaluate behavioral categories against real profile and
 *                 activity data; insert into notification_log. The unique
 *                 (user_id, dedupe_key) constraint makes duplicates
 *                 impossible no matter how often the cron fires.
 *   2. SEND     — queued rows whose member is eligible RIGHT NOW (prefs,
 *                 pause, quiet hours, local-time window, daily cap) go to
 *                 the Expo Push API in batches; tickets recorded.
 *   3. RECEIPTS — sent rows are confirmed against Expo receipts:
 *                 delivered / retry (≤3 attempts) / dead-letter; dead device
 *                 tokens are pruned from profiles so they never block again.
 */

const EXPO_SEND_URL    = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';

const MAX_SENDS_PER_RUN   = 500;  // blast-radius cap
const RECEIPT_DELAY_MS    = 10 * 60 * 1000;
const ACTIVITY_WINDOW_MS  = 35 * 24 * 60 * 60 * 1000;
const DORMANT_7_MS        = 7  * 24 * 60 * 60 * 1000;
const DORMANT_30_MS       = 30 * 24 * 60 * 60 * 1000;

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Cron-only endpoint. Fails closed: without a configured secret nothing runs.
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return json(401, { error: 'unauthorized' });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const started = Date.now();
  const now = new Date();
  const stats = { enqueued: 0, sent: 0, delivered: 0, retried: 0, dead: 0, tokensPruned: 0, errors: [] as string[] };

  try {
    // ── Shared reads ────────────────────────────────────────────────────────
    const { data: profiles, error: profErr } = await db
      .from('profiles')
      .select('id, push_token, tier, score, is_premium, timezone')
      .not('push_token', 'is', null)
      .limit(5000);
    if (profErr) throw profErr;
    const members = profiles ?? [];
    const byId = new Map(members.map(p => [p.id, p]));

    // One activity sweep serves dormancy detection AND the timing engine.
    const { data: events } = await db
      .from('analytics_events')
      .select('user_id, created_at')
      .gte('created_at', new Date(now.getTime() - ACTIVITY_WINDOW_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(20000);

    const lastActive = new Map<string, number>();
    const hourHistogram = new Map<string, number[]>();
    for (const e of events ?? []) {
      if (!e.user_id) continue;
      const t = Date.parse(e.created_at);
      if (!Number.isFinite(t)) continue;
      if (!lastActive.has(e.user_id)) lastActive.set(e.user_id, t); // rows are desc
      const tz = byId.get(e.user_id)?.timezone ?? null;
      const hours = hourHistogram.get(e.user_id) ?? [];
      if (hours.length < 200) hours.push(localHour(new Date(t), tz));
      hourHistogram.set(e.user_id, hours);
    }

    // ── 1. ENQUEUE ──────────────────────────────────────────────────────────
    const { data: tierLogs } = await db
      .from('notification_log')
      .select('user_id, dedupe_key')
      .in('category', ['tier_up', 'premium_welcome']);
    const notifiedTiers = new Map<string, string[]>();
    const premiumNotified = new Set<string>();
    for (const row of tierLogs ?? []) {
      if (row.dedupe_key === 'premium_welcome') { premiumNotified.add(row.user_id); continue; }
      const tiers = notifiedTiers.get(row.user_id) ?? [];
      tiers.push(row.dedupe_key.replace(/^tier:/, ''));
      notifiedTiers.set(row.user_id, tiers);
    }

    const toEnqueue: Record<string, unknown>[] = [];
    for (const m of members) {
      const last = lastActive.get(m.id) ?? 0;
      const idleMs = last === 0 ? Infinity : now.getTime() - last;

      let category: string | null = null;
      if (idleMs >= DORMANT_30_MS) category = 'dormant_30';
      else if (idleMs >= DORMANT_7_MS) category = 'dormant_7';

      if (category) {
        const key = dedupeKeyFor(category, now);
        const copy = buildCopy(category, pickVariant(m.id, key, variantCount(category)), {});
        if (copy) {
          toEnqueue.push({
            user_id: m.id, category, dedupe_key: key,
            title: copy.title, body: copy.body, data: copy.data,
          });
        }
      }

      if (m.tier && shouldNotifyTier(m.tier, notifiedTiers.get(m.id) ?? [])) {
        const key = dedupeKeyFor('tier_up', now, m.tier);
        const copy = buildCopy('tier_up', pickVariant(m.id, key, variantCount('tier_up')), {
          tier: m.tier, score: m.score ?? undefined,
        });
        if (copy) {
          toEnqueue.push({
            user_id: m.id, category: 'tier_up', dedupe_key: key,
            title: copy.title, body: copy.body, data: copy.data,
          });
        }
      }

      if (m.is_premium && !premiumNotified.has(m.id)) {
        const copy = buildCopy('premium_welcome', 0, {});
        if (copy) {
          toEnqueue.push({
            user_id: m.id, category: 'premium_welcome', dedupe_key: 'premium_welcome',
            title: copy.title, body: copy.body, data: copy.data,
          });
        }
      }
    }

    if (toEnqueue.length > 0) {
      const { error } = await db
        .from('notification_log')
        .upsert(toEnqueue, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
      if (error) stats.errors.push(`enqueue: ${error.message}`);
      else stats.enqueued = toEnqueue.length;
    }

    // ── 2. SEND ─────────────────────────────────────────────────────────────
    const { data: queued } = await db
      .from('notification_log')
      .select('id, user_id, category, title, body, data, attempts')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(MAX_SENDS_PER_RUN * 2);

    const queuedRows = queued ?? [];
    const queuedUserIds = [...new Set(queuedRows.map(r => r.user_id))];

    const prefsByUser = new Map<string, ServerPrefs>();
    if (queuedUserIds.length > 0) {
      const { data: prefRows } = await db
        .from('notification_prefs')
        .select('user_id, prefs, quiet_start, quiet_end, paused_until')
        .in('user_id', queuedUserIds);
      for (const p of prefRows ?? []) {
        prefsByUser.set(p.user_id, {
          prefs: p.prefs ?? {}, quiet_start: p.quiet_start ?? 22,
          quiet_end: p.quiet_end ?? 8, paused_until: p.paused_until,
        });
      }
    }

    const lastSentByUser = new Map<string, string>();
    if (queuedUserIds.length > 0) {
      const { data: sentRows } = await db
        .from('notification_log')
        .select('user_id, sent_at')
        .in('user_id', queuedUserIds)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(2000);
      for (const r of sentRows ?? []) {
        if (!lastSentByUser.has(r.user_id)) lastSentByUser.set(r.user_id, r.sent_at);
      }
    }

    type Sendable = { row: typeof queuedRows[number]; token: string };
    const sendable: Sendable[] = [];
    const perUserThisRun = new Set<string>();
    for (const row of queuedRows) {
      if (sendable.length >= MAX_SENDS_PER_RUN) break;
      if (perUserThisRun.has(row.user_id)) continue; // one per member per run
      const member = byId.get(row.user_id);
      if (!member?.push_token) continue;

      const ok = canSendNow({
        category: row.category,
        now,
        timezone: member.timezone ?? null,
        serverPrefs: prefsByUser.get(row.user_id) ?? DEFAULT_SERVER_PREFS,
        lastSentAtIso: lastSentByUser.get(row.user_id) ?? null,
        eventLocalHours: hourHistogram.get(row.user_id) ?? [],
      });
      if (!ok) continue;

      sendable.push({ row, token: member.push_token });
      perUserThisRun.add(row.user_id);
    }

    for (const batch of chunk(sendable, 100)) {
      const messages = batch.map(s => ({
        to: s.token,
        title: s.row.title,
        body: s.row.body,
        data: s.row.data ?? {},
        sound: 'default',
        badge: 1,
      }));

      let tickets: Array<{ status?: string; id?: string; details?: { error?: string }; message?: string }> = [];
      try {
        const res = await fetch(EXPO_SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
        const parsed = await res.json();
        tickets = Array.isArray(parsed?.data) ? parsed.data : [];
      } catch (e) {
        stats.errors.push(`expo send: ${e}`);
      }

      for (let i = 0; i < batch.length; i++) {
        const { row } = batch[i];
        const ticket = tickets[i];
        const attempts = (row.attempts ?? 0) + 1;

        if (ticket?.status === 'ok') {
          await db.from('notification_log').update({
            status: 'sent', attempts, sent_at: now.toISOString(),
            expo_ticket_id: ticket.id ?? null, error: null,
          }).eq('id', row.id);
          stats.sent++;
        } else if (ticket?.details?.error === 'DeviceNotRegistered') {
          await db.from('notification_log').update({
            status: 'failed', attempts, error: 'DeviceNotRegistered',
          }).eq('id', row.id);
          await db.from('profiles').update({ push_token: null }).eq('id', row.user_id);
          stats.tokensPruned++;
        } else {
          const dead = attempts >= 3;
          await db.from('notification_log').update({
            status: dead ? 'dead' : 'queued', attempts,
            error: ticket?.message ?? ticket?.details?.error ?? 'no ticket returned',
          }).eq('id', row.id);
          if (dead) stats.dead++; else stats.retried++;
        }
      }
    }

    // ── 3. RECEIPTS ─────────────────────────────────────────────────────────
    const { data: awaiting } = await db
      .from('notification_log')
      .select('id, user_id, attempts, expo_ticket_id')
      .eq('status', 'sent')
      .is('checked_at', null)
      .not('expo_ticket_id', 'is', null)
      .lt('sent_at', new Date(now.getTime() - RECEIPT_DELAY_MS).toISOString())
      .limit(900);

    for (const batch of chunk(awaiting ?? [], 300)) {
      let receipts: Record<string, { status?: string; details?: { error?: string } }> = {};
      try {
        const res = await fetch(EXPO_RECEIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch.map(r => r.expo_ticket_id) }),
        });
        const parsed = await res.json();
        receipts = parsed?.data ?? {};
      } catch (e) {
        stats.errors.push(`expo receipts: ${e}`);
        continue; // leave rows unchecked; next run retries the lookup
      }

      for (const row of batch) {
        const outcome = classifyReceipt(receipts[row.expo_ticket_id!], row.attempts ?? 1);
        const checked = { checked_at: now.toISOString() };

        if (outcome === 'delivered') {
          await db.from('notification_log').update({ status: 'delivered', ...checked }).eq('id', row.id);
          stats.delivered++;
        } else if (outcome === 'device_gone') {
          await db.from('notification_log').update({
            status: 'failed', error: 'DeviceNotRegistered (receipt)', ...checked,
          }).eq('id', row.id);
          await db.from('profiles').update({ push_token: null }).eq('id', row.user_id);
          stats.tokensPruned++;
        } else if (outcome === 'retry') {
          await db.from('notification_log').update({
            status: 'queued', error: 'receipt error — retrying', checked_at: null,
          }).eq('id', row.id);
          stats.retried++;
        } else {
          await db.from('notification_log').update({
            status: 'dead', error: receipts[row.expo_ticket_id!]?.details?.error ?? 'receipt error', ...checked,
          }).eq('id', row.id);
          stats.dead++;
        }
      }
    }

    if (stats.errors.length > 0) console.error('push-dispatch partial errors:', stats.errors);
    return json(200, { ok: true, ...stats, ms: Date.now() - started });
  } catch (err) {
    console.error('push-dispatch failed:', err);
    return json(500, { ok: false, error: String(err), ...stats });
  }
});
