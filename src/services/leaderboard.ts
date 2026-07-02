import { supabase } from './supabase';

export interface LeaderboardEntry {
  rank: number;
  initials: string;
  tier: string;
  score: number;
  weeklyChange: number;
  isMe: boolean;
}

export interface LeaderboardStats {
  totalMembers: number;
  userRank: number | null;
  topPercent: number | null;
}

/**
 * Rank data comes from the get_leaderboard_stats RPC (security definer) —
 * profiles RLS only exposes the caller's own row, so counting other
 * members' scores client-side would silently return zero.
 */
export async function fetchLeaderboardStats(_userTier: string): Promise<LeaderboardStats> {
  const { data, error } = await supabase.rpc('get_leaderboard_stats');
  if (error || !data) {
    return { totalMembers: 0, userRank: null, topPercent: null };
  }
  return {
    totalMembers: data.total_members ?? 0,
    userRank: data.user_rank ?? null,
    topPercent: data.top_percent ?? null,
  };
}
