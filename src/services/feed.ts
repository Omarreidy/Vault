import { WealthMove } from '../types';
import { Insight } from './insights';
import { WealthWin } from '../types';

export type FeedItemType = 'move' | 'pulse' | 'win' | 'beliefs';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  data: WealthMove | Insight | WealthWin | null;
}

// Mix moves, pulse cards, and wins into a variable-reward sequence.
// Pattern: move, move, pulse, move, move, move, win, move, move, pulse, move...
// Unpredictable enough to create the "what's next?" pull.
export function buildFeed(
  moves: WealthMove[],
  insights: Insight[],
  wins: WealthWin[],
): FeedItem[] {
  const feed: FeedItem[] = [];
  let mIdx = 0;
  let pIdx = 0;
  let wIdx = 0;

  // Insertion pattern: 0=move, 1=pulse, 2=win, 3=beliefs audit
  // Beliefs audit drops in at position 5 — after the user is warmed up
  const pattern = [0, 0, 1, 0, 0, 3, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 1];

  for (const slot of pattern) {
    if (slot === 3) {
      feed.push({ id: 'beliefs-audit', type: 'beliefs', data: null });
    } else if (slot === 0 && mIdx < moves.length) {
      feed.push({ id: `move-${moves[mIdx].id}`, type: 'move', data: moves[mIdx++] });
    } else if (slot === 1 && pIdx < insights.length) {
      feed.push({ id: `pulse-${insights[pIdx].id}`, type: 'pulse', data: insights[pIdx++] });
    } else if (slot === 2 && wIdx < wins.length) {
      feed.push({ id: `win-${wins[wIdx].id}`, type: 'win', data: wins[wIdx++] });
    } else if (mIdx < moves.length) {
      feed.push({ id: `move-${moves[mIdx].id}`, type: 'move', data: moves[mIdx++] });
    }
  }

  return feed;
}
