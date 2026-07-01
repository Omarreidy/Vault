import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  target: number;
  current: number;
  monthlyContribution: number;
  color: string;
  category: 'savings' | 'debt' | 'investment' | 'purchase';
}

export const GOALS: Goal[] = [];

const GOALS_KEY = '@vault_goals_v1';

/** Loads the user's saved goals from device storage. Returns [] if none/corrupt. */
export async function loadGoals(): Promise<Goal[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persists the full goals list so created goals + progress survive restarts. */
export async function saveGoals(goals: Goal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {}
}

export function getMonthsToGoal(goal: Goal): number {
  const remaining = goal.target - goal.current;
  if (goal.monthlyContribution <= 0) return 999;
  return Math.ceil(remaining / goal.monthlyContribution);
}

export function getGoalProgress(goal: Goal): number {
  return Math.min(goal.current / goal.target, 1);
}
