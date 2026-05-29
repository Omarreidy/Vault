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

export const GOALS: Goal[] = [
  {
    id: 'g1',
    title: 'Emergency Fund',
    emoji: '🛡',
    target: 15000,
    current: 9800,
    monthlyContribution: 400,
    color: '#00A878',
    category: 'savings',
  },
  {
    id: 'g2',
    title: 'New Car',
    emoji: '🚗',
    target: 8000,
    current: 3200,
    monthlyContribution: 250,
    color: '#C9A96E',
    category: 'purchase',
  },
  {
    id: 'g3',
    title: 'Investment Portfolio',
    emoji: '📈',
    target: 25000,
    current: 6400,
    monthlyContribution: 500,
    color: '#7A7A9A',
    category: 'investment',
  },
];

export function getMonthsToGoal(goal: Goal): number {
  const remaining = goal.target - goal.current;
  if (goal.monthlyContribution <= 0) return 999;
  return Math.ceil(remaining / goal.monthlyContribution);
}

export function getGoalProgress(goal: Goal): number {
  return Math.min(goal.current / goal.target, 1);
}
