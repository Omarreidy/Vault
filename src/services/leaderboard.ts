export interface LeaderboardEntry {
  rank: number;
  initials: string;
  tier: string;
  score: number;
  weeklyChange: number;
  isMe: boolean;
}

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,   initials: 'MK', tier: 'Platinum', score: 812, weeklyChange: +94, isMe: false },
  { rank: 2,   initials: 'JR', tier: 'Platinum', score: 798, weeklyChange: +71, isMe: false },
  { rank: 3,   initials: 'SA', tier: 'Platinum', score: 761, weeklyChange: +55, isMe: false },
  { rank: 4,   initials: 'TC', tier: 'Platinum', score: 749, weeklyChange: +88, isMe: false },
  { rank: 5,   initials: 'BL', tier: 'Platinum', score: 712, weeklyChange: +42, isMe: false },
  { rank: 47,  initials: 'AX', tier: 'Gold',     score: 647, weeklyChange: +47, isMe: true  },
  { rank: 48,  initials: 'PW', tier: 'Gold',     score: 641, weeklyChange: +29, isMe: false },
  { rank: 49,  initials: 'DM', tier: 'Gold',     score: 635, weeklyChange: +18, isMe: false },
];

export const LEADERBOARD_STATS = {
  totalMembers: 2847,
  userRank: 47,
  topPercent: 2,
  weeklyMoverRank: 12,
};

export interface FriendEntry {
  rank: number;          // rank within your friend group
  name: string;
  initials: string;
  tier: string;
  score: number;
  weeklyChange: number;
  isMe: boolean;
  mutualMoves: number;   // moves you've both completed — social proof
  streak: number;
}

// Friends ranked by score — you sit at #4, above two friends, below two
// Psychology: not first (aspirational gap), not last (not embarrassing)
// The sweet spot that maximises competition and FOMO simultaneously
export const FRIENDS_LEADERBOARD: FriendEntry[] = [
  { rank: 1, name: 'Marcus K.',  initials: 'MK', tier: 'Platinum', score: 724, weeklyChange: +61, isMe: false, mutualMoves: 4, streak: 41 },
  { rank: 2, name: 'Jordan R.',  initials: 'JR', tier: 'Gold',     score: 688, weeklyChange: +38, isMe: false, mutualMoves: 6, streak: 17 },
  { rank: 3, name: 'Sofia A.',   initials: 'SA', tier: 'Gold',     score: 671, weeklyChange: +55, isMe: false, mutualMoves: 3, streak: 29 },
  { rank: 4, name: 'You',        initials: 'AX', tier: 'Gold',     score: 647, weeklyChange: +47, isMe: true,  mutualMoves: 0, streak: 23 },
  { rank: 5, name: 'Taylor C.',  initials: 'TC', tier: 'Gold',     score: 619, weeklyChange: +22, isMe: false, mutualMoves: 5, streak: 8  },
  { rank: 6, name: 'Blake L.',   initials: 'BL', tier: 'Silver',   score: 581, weeklyChange: +14, isMe: false, mutualMoves: 2, streak: 3  },
];

export const FRIENDS_STATS = {
  totalFriends: 5,
  yourRank: 4,
  closestAbove: 'Sofia A.',
  pointsBehind: 24,       // points behind the person directly above you
};
