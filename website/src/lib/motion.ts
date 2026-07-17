// Shared motion vocabulary — every section speaks the same physics.
// Transform + opacity only: these composite on the GPU and never trigger repaints.
import type { Transition, Variants } from 'framer-motion';

export const EASE_LUXE: Transition['ease'] = [0.22, 1, 0.36, 1];

export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 0.8 };
export const SPRING_SNAP: Transition = { type: 'spring', stiffness: 400, damping: 28 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_LUXE },
  },
};

export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: '0.5em' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_LUXE },
  },
};

export const VIEWPORT_ONCE = { once: true, margin: '-15% 0px' } as const;
