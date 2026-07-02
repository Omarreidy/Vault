import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { fetchLiveScore, fetchProfileScore, getTierFromScore } from './velocity';
import { VelocityScore, TierName } from '../types';
import { usePlaid } from '../context/PlaidContext';

export interface RealProfile {
  name: string;
  email: string;
  tier: TierName;
  score: VelocityScore | null;
  joinedAt: Date | null;
  isPremium: boolean;
  isLoading: boolean;
}

const EMPTY_SCORE: VelocityScore = {
  total: 0, savings: 0, investment: 0, debt: 0, spending: 0,
  weeklyChange: 0, percentile: 0, tier: 'BRONZE', tierProgress: 0,
};

export function useRealProfile(): RealProfile {
  // Re-load whenever Plaid data changes so score/tier update the moment a bank
  // is connected (screens stay mounted in the tab navigator, so a mount-only
  // fetch would show stale data until the next app restart).
  const { plaidConnected, plaidSummary } = usePlaid();

  const [profile, setProfile] = useState<RealProfile>({
    name: '',
    email: '',
    tier: 'BRONZE',
    score: null,
    joinedAt: null,
    isPremium: false,
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
        .select('name, tier, score, is_premium')
        .eq('id', user.id)
        .single();

      const name       = profileData?.name ?? email.split('@')[0] ?? '';
      const profileTier = (profileData?.tier as TierName) ?? 'BRONZE';
      const isPremium  = profileData?.is_premium === true;

      if (cancelled) return;
      setProfile(prev => ({ ...prev, name, email, tier: profileTier, isPremium, joinedAt, isLoading: false }));

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
  }, [plaidConnected, plaidSummary]);

  return profile;
}
