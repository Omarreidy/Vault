export interface CohortMember {
  id: string;
  name: string;
  initials: string;
  tier: string;
  streak: number;
  movesCompleted: number;
  mutualMoves: number;
  weeklyMoves: number;
  relativeScore: number;
  isMe: boolean;
  joinedWeeksAgo: number;
}

export interface CohortMilestone {
  label: string;
  progress: number;
  description: string;
  reward: string;
}

export interface CohortStats {
  totalMembers: number;
  avgStreak: number;
  totalMovesThisWeek: number;
  topMover: string;
}
