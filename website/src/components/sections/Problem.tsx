'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';

// Each statement sits dim in the dark and ignites as it crosses the reading line —
// the visitor literally scrolls through their own frustration.
function SpotlightLine({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.45'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [28, 0]);

  return (
    <motion.p
      ref={ref}
      style={{ opacity, y }}
      className="font-display text-[34px] leading-[1.15] font-light tracking-tight text-parchment sm:text-5xl md:text-[56px]"
    >
      {children}
    </motion.p>
  );
}

export default function Problem() {
  return (
    <section className="relative bg-night px-6 py-40 md:py-56">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-3xl">
        <p className="mb-20 text-[11px] font-bold tracking-[0.4em] text-gold uppercase">
          Be honest
        </p>

        <div className="space-y-28 md:space-y-36">
          <SpotlightLine>
            You make money. But you never <em className="text-gold-light italic">feel</em>{' '}
            wealthy.
          </SpotlightLine>
          <SpotlightLine>
            Budgeting apps show you charts. Then guilt. Then you delete them.
          </SpotlightLine>
          <SpotlightLine>
            Your bank knows everything about you — and tells you{' '}
            <em className="text-gold-light italic">nothing</em>.
          </SpotlightLine>
          <SpotlightLine>
            No one has ever looked at your money and said:{' '}
            <em className="text-gold-light italic">here&rsquo;s your next move.</em>
          </SpotlightLine>
        </div>

        <div className="mt-40 text-center md:mt-52">
          <SpotlightLine>
            Money shouldn&rsquo;t feel like fog.
            <span className="mt-3 block text-gold-light italic">
              It should feel like momentum.
            </span>
          </SpotlightLine>
        </div>
      </div>
    </section>
  );
}
