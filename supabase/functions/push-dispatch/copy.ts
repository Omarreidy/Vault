// Notification copy templates — pure and unit-testable. Every interpolated
// value comes from a typed field the caller read from the database; templates
// cannot invent numbers, comparisons, or urgency that isn't real. Variants
// exist so repeat sends across periods don't repeat wording (variant choice
// is deterministic — logic.pickVariant).

export interface CopyInput {
  /** Server-authoritative profile fields. */
  tier?: string;
  score?: number;
}

export interface NotificationCopy {
  title: string;
  body: string;
  /** Client deep-link route — must be a key the app's routing table knows. */
  data: { screen: string; category: string };
}

type Variant = (input: CopyInput) => { title: string; body: string };

const TEMPLATES: Record<string, { screen: string; variants: Variant[] }> = {
  // ~1-4 weeks away. Warm door back in — never guilt.
  dormant_7: {
    screen: 'moves',
    variants: [
      () => ({
        title: 'Your vault is where you left it',
        body: "Today's wealth moves are loaded. A few minutes puts you back in motion.",
      }),
      () => ({
        title: 'Fresh moves are waiting',
        body: 'New wealth moves landed since your last visit. Pick one — momentum beats perfection.',
      }),
      () => ({
        title: 'Ready when you are',
        body: 'Your feed refreshed with new moves. One small action restarts the habit.',
      }),
    ],
  },

  // A month or more away. Honest reset framing — no fake scarcity.
  dormant_30: {
    screen: 'moves',
    variants: [
      () => ({
        title: 'Start fresh today',
        body: "It's been a while. Your vault is intact and today's moves are ready — begin with one.",
      }),
      () => ({
        title: 'Your comeback move is ready',
        body: 'Wealth building survives breaks. Open VAULT and take one move to restart.',
      }),
    ],
  },

  // Server recomputed the score and the member crossed a tier boundary.
  tier_up: {
    screen: 'score',
    variants: [
      i => ({
        title: `Welcome to ${i.tier} tier`,
        body: i.score
          ? `Your Wealth Velocity reached ${i.score} — that crosses into ${i.tier}. See what changed.`
          : `Your Wealth Velocity crossed into ${i.tier}. See what changed.`,
      }),
      i => ({
        title: `${i.tier} tier — unlocked`,
        body: i.score
          ? `Score ${i.score}. The work added up. Your new tier is live in the app.`
          : `The work added up. Your new tier is live in the app.`,
      }),
    ],
  },

  premium_welcome: {
    screen: 'profile',
    variants: [
      () => ({
        title: 'Premium is live on your account',
        body: 'Every VAULT feature is now unlocked. Your membership is active across all your devices.',
      }),
    ],
  },
};

export const COPY_CATEGORIES = Object.keys(TEMPLATES);

export function variantCount(category: string): number {
  return TEMPLATES[category]?.variants.length ?? 0;
}

export function buildCopy(category: string, variant: number, input: CopyInput): NotificationCopy | null {
  const t = TEMPLATES[category];
  if (!t || t.variants.length === 0) return null;
  const v = t.variants[Math.abs(variant) % t.variants.length](input);
  return { title: v.title, body: v.body, data: { screen: t.screen, category } };
}
