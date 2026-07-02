import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { TierName } from '../types';
import { getTierFromScore, getTierProgress } from './velocity';
import { supabase } from './supabase';
import { postActivity } from './cohort';

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
  '18–24': 190,
  '25–34': 290,
  '35–44': 400,
  '45+':   360,
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

// Gap text varies by income so specific numbers are never embarrassingly wrong
function buildGaps(goal: string, income: string): Gap[] {
  const isLowIncome  = income === 'Under $40K';
  const isHighIncome = income === '$120K+';

  switch (goal) {
    case 'Build wealth':
      return [
        {
          icon: '📈',
          text: isLowIncome
            ? 'You may be missing employer match — even small contributions compound fast'
            : `You may be leaving ${isHighIncome ? '$3,000+' : '$1,200+'}/yr in unclaimed employer match`,
        },
        {
          icon: '💤',
          text: isLowIncome
            ? 'Cash sitting idle in checking is losing value to inflation every day'
            : `Cash sitting idle in checking is likely earning near zero — a HYSA earns 50x more`,
        },
        { icon: '🔍', text: 'Subscription charges you\'ve forgotten are quietly draining your account' },
      ];

    case 'Get out of debt':
      return [
        { icon: '⛓', text: 'High-interest debt is costing you more annually than most investments earn' },
        { icon: '💳', text: 'You may qualify for a balance transfer at 0% APR — most people never check' },
        { icon: '📉', text: 'Minimum payments keep you in debt 4x longer than a targeted paydown plan' },
      ];

    case 'Save more':
      return [
        {
          icon: '💤',
          text: isLowIncome
            ? 'Cash in checking earns near zero — a high-yield account costs nothing to open'
            : 'Cash sitting in checking is losing purchasing power while HYSA rates sit above 4%',
        },
        { icon: '🔍', text: 'Forgotten subscriptions are likely costing more than you think per year' },
        { icon: '🛡', text: 'Most people are 1–2 months short of a real emergency fund cushion' },
      ];

    case 'Grow investments':
      return [
        {
          icon: '📈',
          text: isLowIncome
            ? 'Even small employer match contributions are a 100% instant return — easy to miss'
            : `You may be leaving ${isHighIncome ? '$3,000+' : '$1,200+'}/yr in unclaimed employer match`,
        },
        { icon: '💡', text: 'Your current allocation may be more conservative than your age and timeline warrant' },
        {
          icon: '⚡',
          text: isHighIncome
            ? 'Increasing contributions by $400/month now could mean $360K+ extra at 60'
            : 'Investing $100–200/month more now could mean $150K+ extra at retirement',
        },
      ];

    default:
      return buildGaps('Build wealth', income);
  }
}

export function calculateOnboardingScore(answers: OnboardingAnswers): OnboardingResult {
  const base       = AGE_SCORES[answers.age] ?? 290;
  const multiplier = INCOME_MULTIPLIERS[answers.income] ?? 1.0;
  const boost      = GOAL_BOOSTS[answers.goal] ?? 20;
  const raw        = Math.round(base * multiplier + boost);
  // Allow Bronze at the low end; cap below Platinum so real data drives tier growth
  const score      = Math.min(Math.max(raw, 150), 620);

  const tier        = getTierFromScore(score);
  const tierProgress = getTierProgress(score);
  const percentile  = Math.round((score / 10) * 0.95); // kept for DB compat, not shown in UI
  const gaps        = buildGaps(answers.goal, answers.income);

  return { name: '', score, tier, tierProgress, percentile, gaps };
}

const ONBOARDING_RESULT_KEY   = '@vault_onboarding_result';
const ONBOARDING_ANSWERS_KEY  = '@vault_onboarding_answers';

// Mid-points for bracket → numeric conversion used in trajectory math
const INCOME_MIDPOINTS: Record<string, number> = {
  'Under $40K':   32_000,
  '$40K – $70K':  55_000,
  '$70K – $120K': 92_000,
  '$120K+':       140_000,
};

const AGE_MIDPOINTS: Record<string, number> = {
  '18–24': 22,
  '25–34': 29,
  '35–44': 39,
  '45+':   50,
};

export async function storeOnboardingAnswers(answers: OnboardingAnswers): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(answers));
}

export interface StoredTrajectoryInputs {
  age: number;
  annualIncome: number;
  annualExpenses: number;
  currentNetWorth: number;
  annualReturn: number;
  actionsCompleted: number;
}

export async function getTrajectoryInputs(): Promise<StoredTrajectoryInputs | null> {
  try {
    const json = await AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY);
    if (!json) return null;
    const answers: OnboardingAnswers = JSON.parse(json);
    const age = AGE_MIDPOINTS[answers.age] ?? 29;
    const annualIncome = INCOME_MIDPOINTS[answers.income] ?? 55_000;
    // Estimate expenses at 70% of income — replaced by real Plaid data when connected
    const annualExpenses = Math.round(annualIncome * 0.70);
    return { age, annualIncome, annualExpenses, currentNetWorth: 0, annualReturn: 0.07, actionsCompleted: 0 };
  } catch {
    return null;
  }
}

export async function markOnboardingComplete(result: OnboardingResult): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_RESULT_KEY, JSON.stringify(result));

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({
      name: result.name,
      score: result.score,
      tier: result.tier,
      tier_progress: result.tierProgress,
      percentile: result.percentile,
      onboarding_complete: true,
    }).eq('id', user.id);
    // Announce the new member to the cohort feed; best-effort.
    postActivity('joined', 'Joined VAULT', 'New member in the cohort. First move unlocked.').catch(() => {});
  }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_RESULT_KEY);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ onboarding_complete: false }).eq('id', user.id);
  }
}

export function useUserName(fallback = ''): string {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('name').eq('id', user.id).single().then(({ data }) => {
        if (data?.name) { setName(data.name); return; }
        AsyncStorage.getItem(ONBOARDING_RESULT_KEY).then(json => {
          if (!json) return;
          try {
            const result = JSON.parse(json) as OnboardingResult;
            if (result?.name) setName(result.name);
          } catch {}
        });
      });
    });
  }, []);

  return name;
}
