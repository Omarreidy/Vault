import { Share } from 'react-native';
import { EVENTS, track } from './analytics';
import { supabase } from './supabase';

/**
 * Real referral system. Every profile gets a unique invite code
 * (generated server-side); a new member redeems it once and both
 * sides earn XP. All reads/writes go through security-definer RPCs.
 */

export const XP_PER_REFERRAL = 75;
export const COHORT_SPOTS = 5;

export interface ReferralInvite {
  name: string;     // anonymized "First L."
  daysAgo: number;
}

export interface ReferralInfo {
  code: string;
  xpEarned: number;
  redeemed: boolean;  // whether this user already used someone's code
  invites: ReferralInvite[];
}

export type RedeemError =
  | 'not_authenticated'
  | 'already_redeemed'
  | 'invalid_code'
  | 'own_code'
  | 'network';

export async function fetchReferralInfo(): Promise<ReferralInfo | null> {
  try {
    const { data, error } = await supabase.rpc('get_referral_stats');
    if (error || !data?.ok) return null;
    return {
      code: data.code ?? '',
      xpEarned: data.xp_earned ?? 0,
      redeemed: !!data.redeemed,
      invites: (data.invites ?? []).map((i: any) => ({
        name: i.name ?? 'Vault member',
        daysAgo: i.days_ago ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

export async function redeemReferralCode(
  code: string,
): Promise<{ ok: boolean; error?: RedeemError; xp?: number }> {
  try {
    const { data, error } = await supabase.rpc('redeem_referral_code', {
      invite_code: code.trim(),
    });
    if (error || !data) return { ok: false, error: 'network' };
    const result = data as { ok: boolean; error?: RedeemError; xp?: number };
    if (result.ok) track(EVENTS.REFERRAL_REDEEMED).catch(() => {});
    return result;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export const REDEEM_ERROR_MESSAGES: Record<RedeemError, string> = {
  not_authenticated: 'You need to be signed in to redeem a code.',
  already_redeemed:  "You've already used an invite code.",
  invalid_code:      "That code doesn't match any member.",
  own_code:          "That's your own code — share it with someone else!",
  network:           "Couldn't reach the server. Try again in a moment.",
};

export function buildShareMessage(code: string): string {
  return (
    `Join my VAULT cohort — we're building wealth together.\n\n` +
    `Download VAULT and enter my invite code: ${code}\n\n` +
    `You'll be matched with people at your exact financial stage. ` +
    `We both earn +${XP_PER_REFERRAL} XP when you join.`
  );
}

/** Opens the native share sheet with the user's real invite code. */
export async function shareInvite(prefetchedCode?: string): Promise<void> {
  const code = prefetchedCode || (await fetchReferralInfo())?.code;
  if (!code) return;
  try {
    track(EVENTS.REFERRAL_SHARED).catch(() => {});
    await Share.share({ message: buildShareMessage(code) });
  } catch {}
}
