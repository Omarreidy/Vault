import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

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
const AUTO_SEED_FLAG = '@vault_goals_autoseeded_v1';

/** The slice of PlaidSummary the goal generator needs. */
export interface GoalInputs {
  checking: number;
  savings: number;
  investments: number;
  creditDebt: number;
  estimatedMonthlyIncome: number;
  monthlySpend: number;
}

const num = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/** Rounds a target up to a clean, motivating number. */
function cleanTarget(n: number): number {
  if (n <= 0) return 0;
  if (n < 2_000)  return Math.ceil(n / 250) * 250;
  if (n < 10_000) return Math.ceil(n / 500) * 500;
  return Math.ceil(n / 1_000) * 1_000;
}

const INVEST_LADDER = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

/**
 * Builds tailored goals from the user's real bank data. Pure + deterministic:
 * same inputs always produce the same goals, so it's safe to call anywhere.
 */
export function buildGoalsFromPlaid(s: GoalInputs): Goal[] {
  const spend   = num(s.monthlySpend);
  const income  = num(s.estimatedMonthlyIncome);
  const savings = num(s.savings);
  const invest  = num(s.investments);
  const debt    = num(s.creditDebt);
  const surplus = Math.max(income - spend, 0);
  const goals: Goal[] = [];

  // 1. Emergency fund — 5 months of their actual spending.
  const efTarget = cleanTarget(spend > 0 ? spend * 5 : 5_000);
  goals.push({
    id: 'auto_emergency',
    title: spend > 0 ? '5-month emergency fund' : 'Build an emergency fund',
    emoji: '🛡️',
    target: efTarget,
    current: Math.min(savings, efTarget),
    monthlyContribution: Math.round(surplus * 0.4),
    color: COLORS.gold,
    category: 'savings',
  });

  // 2. Debt payoff when they carry a balance; otherwise a 1-month cash buffer.
  if (debt >= 100) {
    goals.push({
      id: 'auto_debt',
      title: 'Pay off credit cards',
      emoji: '💳',
      target: Math.round(debt),
      current: 0,
      monthlyContribution: Math.round(surplus * 0.3),
      color: COLORS.red,
      category: 'debt',
    });
  } else if (spend > 0) {
    const bufTarget = cleanTarget(spend);
    goals.push({
      id: 'auto_buffer',
      title: '1-month checking buffer',
      emoji: '💰',
      target: bufTarget,
      current: Math.min(num(s.checking), bufTarget),
      monthlyContribution: Math.round(surplus * 0.2),
      color: COLORS.green,
      category: 'savings',
    });
  }

  // 3. Next investment milestone above where they are today.
  const invTarget = INVEST_LADDER.find(m => m > invest) ?? cleanTarget(invest * 1.5);
  goals.push({
    id: 'auto_invest',
    title: invest > 0 ? `Grow portfolio to $${invTarget.toLocaleString()}` : 'Start investing — first $1,000',
    emoji: '📈',
    target: invTarget,
    current: Math.min(invest, invTarget),
    monthlyContribution: Math.round(surplus * 0.25),
    color: COLORS.goldLight,
    category: 'investment',
  });

  return goals;
}

/**
 * Single load path for the Goals tab. Seeds tailored goals exactly once
 * after a bank is connected (idempotent flag), never touches goals the
 * user created manually, and always returns the current full list.
 */
export async function loadGoalsWithAutoSeed(summary: GoalInputs | null): Promise<Goal[]> {
  const existing = await loadGoals();
  if (!summary) return existing;

  try {
    const seeded = await AsyncStorage.getItem(AUTO_SEED_FLAG);
    if (seeded) return existing;

    const existingIds = new Set(existing.map(g => g.id));
    const auto = buildGoalsFromPlaid(summary).filter(g => !existingIds.has(g.id));
    const merged = [...auto, ...existing];

    await saveGoals(merged);
    await AsyncStorage.setItem(AUTO_SEED_FLAG, new Date().toISOString());
    return merged;
  } catch {
    return existing;
  }
}

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
  const remaining = Math.max(goal.target - goal.current, 0);
  if (remaining === 0) return 0; // funded or over-funded — never negative months
  if (goal.monthlyContribution <= 0) return 999;
  return Math.ceil(remaining / goal.monthlyContribution);
}

export function getGoalProgress(goal: Goal): number {
  // A non-positive target is degenerate data — report no progress rather
  // than NaN/Infinity leaking into progress-bar widths.
  if (!(goal.target > 0)) return 0;
  return Math.min(Math.max(goal.current / goal.target, 0), 1);
}
