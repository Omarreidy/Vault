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

export function getMonthsToGoal(goal: Goal): number {
  const remaining = goal.target - goal.current;
  if (goal.monthlyContribution <= 0) return 999;
  return Math.ceil(remaining / goal.monthlyContribution);
}

export function getGoalProgress(goal: Goal): number {
  return Math.min(goal.current / goal.target, 1);
}
