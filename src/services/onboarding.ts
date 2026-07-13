import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { TierName } from '../types';
import { supabase, functionAuthHeaders } from './supabase';
import { postActivity } from './cohort';
import { computeOnboardingScore, Gap } from './onboardingScore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';

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

export type { Gap } from './onboardingScore';

// Client-side estimate — drives the reveal animation ONLY. The value persisted
// to `profiles` is recomputed authoritatively by the submit-onboarding edge
// function from the same shared formula (qa/FINANCIAL_SPEC.md §12, D1), so the
// number shown here always matches the number stored.
export function calculateOnboardingScore(answers: OnboardingAnswers): OnboardingResult {
  const r = computeOnboardingScore(answers);
  return { name: '', score: r.score, tier: r.tier as TierName, tierProgress: r.tierProgress, percentile: r.percentile, gaps: r.gaps };
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

export async function markOnboardingComplete(
  result: OnboardingResult,
  answers?: OnboardingAnswers,
): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_RESULT_KEY, JSON.stringify(result));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Score/tier/percentile are guarded columns — clients cannot write them
  // (D1). The edge function recomputes them from the raw answers under the
  // service role and persists authoritatively. `name` is passed through; the
  // client only supplies inputs, never the resulting score.
  const payload = answers
    ? { name: result.name, age: answers.age, income: answers.income, goal: answers.goal }
    : { name: result.name };
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/submit-onboarding`, {
      method: 'POST',
      headers: await functionAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal: local reveal + AsyncStorage already reflect the result; the
    // score can be reconciled on next score fetch / app open.
  }
  // Announce the new member to the cohort feed; best-effort.
  postActivity('joined', 'Joined VAULT', 'New member in the cohort. First move unlocked.').catch(() => {});
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
