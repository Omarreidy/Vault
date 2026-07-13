export type TierName = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'BLACK';

export interface WealthMove {
  id: string;
  title: string;
  description: string;
  impact: string;
  impactValue: number;
  category: 'savings' | 'investment' | 'debt' | 'spending' | 'opportunity';
  effort: 'instant' | 'quick' | 'medium';
  actionLabel: string;
  lesson?: { headline: string; body: string; xp: number };
  // True when the move was generated from the user's own linked accounts.
  personalized?: boolean;
}

export interface VelocityScore {
  total: number;
  savings: number;
  investment: number;
  debt: number;
  spending: number;
  weeklyChange: number;
  percentile: number;
  tier: TierName;
  tierProgress: number;
}

export interface WealthWin {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  date: Date;
  category: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  tier: TierName;
  score: VelocityScore;
  streakDays: number;
  wins: WealthWin[];
  joinedAt: Date;
}
