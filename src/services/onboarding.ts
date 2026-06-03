import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { TierName } from '../types';
import { getTierFromScore, getTierProgress } from './velocity';

export interface OnboardingAnswers {
  name: string;
  age: string;
  income: string;
  goal: string;
}

export interface OnboardingResult {
  name: string;
  score: number;
  tier: TierName;
  tierProgress: number;
  percentile: number;
  gaps: Gap[];
}

export interface Gap {
  icon: string;
  text: string;
}

const AGE_SCORES: Record<string, number> = {
  '18–24': 420,
  '25–34': 510,
  '35–44': 580,
  '45+':   540,
};

const INCOME_MULTIPLIERS: Record<string, number> = {
  'Under $40K':   0.82,
  '$40K – $70K':  0.94,
  '$70K – $120K': 1.08,
  '$120K+':       1.18,
};

const GOAL_BOOSTS: Record<string, number> = {
  'Build wealth':     30,
  'Get out of debt':  10,
  'Save more':        20,
  'Grow investments': 40,
};

const GAP_MAP: Record<string, Gap[]> = {
  'Build wealth': [
    { icon: '📈', text: 'You may be leaving $1,200/yr in unclaimed employer match' },
    { icon: '💤', text: '$2,300+ sitting idle in checking earning near zero' },
    { icon: '🔍', text: '3 subscriptions likely charging you for nothing' },
  ],
  'Get out of debt': [
    { icon: '⛓', text: 'High-interest debt is costing you more than investments earn' },
    { icon: '💳', text: 'You may qualify for a balance transfer at 0% APR' },
    { icon: '📉', text: 'Minimum payments keep you in debt 4x longer than needed' },
  ],
  'Save more': [
    { icon: '💤', text: '$2,300+ sitting idle in checking earning near zero' },
    { icon: '🔍', text: '3 subscriptions likely charging you for nothing' },
    { icon: '🛡', text: 'Your emergency fund may be 2 months short of safe' },
  ],
  'Grow investments': [
    { icon: '📈', text: 'You may be leaving $1,200/yr in unclaimed employer match' },
    { icon: '💡', text: 'Your current allocation may be too conservative for your age' },
    { icon: '⚡', text: 'Investing $200/month more now could mean $180K extra at 60' },
  ],
};

export function calculateOnboardingScore(answers: OnboardingAnswers): OnboardingResult {
  const base = AGE_SCORES[answers.age] ?? 490;
  const multiplier = INCOME_MULTIPLIERS[answers.income] ?? 1.0;
  const boost = GOAL_BOOSTS[answers.goal] ?? 20;
  const raw = Math.round(base * multiplier + boost);
  const score = Math.min(Math.max(raw, 380), 724);

  const tier = getTierFromScore(score);
  const tierProgress = getTierProgress(score);
  const percentile = Math.round((score / 10) * 0.95);
  const gaps = GAP_MAP[answers.goal] ?? GAP_MAP['Build wealth'];

  return { score, tier, tierProgress, percentile, gaps };
}

const ONBOARDING_KEY = '@vault_onboarding_complete';
const ONBOARDING_RESULT_KEY = '@vault_onboarding_result';

export async function markOnboardingComplete(result: OnboardingResult): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  await AsyncStorage.setItem(ONBOARDING_RESULT_KEY, JSON.stringify(result));
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
  await AsyncStorage.removeItem(ONBOARDING_RESULT_KEY);
}

export function useUserName(fallback = 'Alex'): string {
  const [name, setName] = useState(fallback);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_RESULT_KEY).then(json => {
      if (!json) return;
      try {
        const result = JSON.parse(json) as OnboardingResult;
        if (result?.name) setName(result.name);
      } catch {}
    });
  }, []);
  return name;
}
