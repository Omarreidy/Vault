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
  const [{ count: totalCount }, { data: { user } }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_complete', true),
    supabase.auth.getUser(),
  ]);

  const totalMembers = totalCount ?? 0;

  if (!user || totalMembers === 0) {
    return { totalMembers, userRank: null, topPercent: null };
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('score')
    .eq('id', user.id)
    .single();

  if (!myProfile?.score) {
    return { totalMembers, userRank: null, topPercent: null };
  }

  const { count: aheadCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_complete', true)
    .gt('score', myProfile.score);

  const userRank = (aheadCount ?? 0) + 1;
  const topPercent = totalMembers > 0 ? Math.round((userRank / totalMembers) * 100) : null;

  return { totalMembers, userRank, topPercent };
}
