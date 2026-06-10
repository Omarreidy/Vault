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

export async function fetchLeaderboardStats(userTier: string): Promise<LeaderboardStats> {
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_complete', true);

  return {
    totalMembers: count ?? 0,
    userRank: null,
    topPercent: null,
  };
}
