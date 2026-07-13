import { WealthMove } from '../types';

/**
 * The Daily Vault Open — VAULT's signature ritual:
 * open → velocity delta since yesterday → today's moves (3 to close) →
 * act/skip → cohort sees it.
 *
 * This module owns the deterministic progress economy. XP is the single
 * engagement currency: fixed per action, never random, never mixed up with
 * Wealth Velocity points (the server-computed financial score, which no
 * client action can inflate — see qa/FINANCIAL_SPEC.md D1).
 */

/** Moves needed to close the vault for the day. */
export const DAILY_MOVES_TARGET = 3;

// Effort is the only thing that scales reward — harder moves earn more.
export const XP_BY_EFFORT: Record<WealthMove['effort'], number> = {
  instant: 10,
  quick: 20,
  medium: 30,
};

/** Bonus for moves generated from the user's real accounts. */
export const XP_PERSONALIZED_BONUS = 15;

/** Deterministic XP for acting on a move. Same move → same XP, always. */
export function xpForMove(move: Pick<WealthMove, 'effort' | 'personalized'>): number {
  return (XP_BY_EFFORT[move.effort] ?? XP_BY_EFFORT.quick) + (move.personalized ? XP_PERSONALIZED_BONUS : 0);
}

export interface BriefState {
  /** Velocity change since yesterday; null on the very first open. */
  delta: number | null;
  movesToday: number;
  target: number;
  /** True once today's moves are done — the vault is closed for the day. */
  closed: boolean;
  /** True once at least one move today has extended the streak. */
  streakSecured: boolean;
}

export function buildBriefState(input: {
  delta: number | null;
  movesToday: number;
}): BriefState {
  const movesToday = Math.max(0, Math.floor(input.movesToday));
  return {
    delta: input.delta,
    movesToday,
    target: DAILY_MOVES_TARGET,
    closed: movesToday >= DAILY_MOVES_TARGET,
    streakSecured: movesToday > 0,
  };
}

/** "+12", "−4", "±0" — display form of a velocity delta. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return '±0';
}

/** Body copy for the weekly recap push. Pure so the copy is testable. */
export function buildWeeklyRecapBody(weeklyGain?: number): string {
  if (typeof weeklyGain === 'number' && weeklyGain > 0) {
    return `+${weeklyGain} Wealth Velocity this week — see what moved.`;
  }
  return 'Your weekly wealth recap is ready — see where your money moved.';
}
