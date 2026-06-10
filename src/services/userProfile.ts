import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { fetchLiveScore, fetchProfileScore, getTierFromScore } from './velocity';
import { VelocityScore, TierName } from '../types';

export interface RealProfile {
  name: string;
  email: string;
  tier: TierName;
  score: VelocityScore | null;
  joinedAt: Date | null;
  isLoading: boolean;
}

const EMPTY_SCORE: VelocityScore = {
  total: 0, savings: 0, investment: 0, debt: 0, spending: 0,
  weeklyChange: 0, percentile: 0, tier: 'BRONZE', tierProgress: 0,
};

export function useRealProfile(): RealProfile {
  const [profile, setProfile] = useState<RealProfile>({
    name: '',
    email: '',
    tier: 'BRONZE',
    score: null,
    joinedAt: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const joinedAt = user.created_at ? new Date(user.created_at) : null;
      const email = user.email ?? '';

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, tier, score')
        .eq('id', user.id)
        .single();

      const name = profileData?.name ?? email.split('@')[0] ?? '';
      const profileTier = (profileData?.tier as TierName) ?? 'BRONZE';

      if (cancelled) return;
      setProfile(prev => ({ ...prev, name, email, tier: profileTier, joinedAt, isLoading: false }));

      const liveScore = await fetchLiveScore();
      if (cancelled) return;
      if (liveScore) {
        setProfile(prev => ({ ...prev, score: liveScore, tier: liveScore.tier }));
        return;
      }

      const profileScore = await fetchProfileScore();
      if (!cancelled && profileScore) {
        setProfile(prev => ({ ...prev, score: profileScore, tier: profileScore.tier }));
      }
    }

    load().catch(() => {
      if (!cancelled) setProfile(prev => ({ ...prev, isLoading: false }));
    });

    return () => { cancelled = true; };
  }, []);

  return profile;
}
