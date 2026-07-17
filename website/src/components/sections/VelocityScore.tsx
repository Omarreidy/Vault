'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/PhoneMock';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

const FACTORS = ['Savings rate', 'Investing cadence', 'Debt paydown', 'Income growth', 'Trajectory'];

export default function VelocityScore() {
  return (
    <section className="relative overflow-hidden bg-cream-deep py-32 md:py-44">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
          >
            Feature 02 — Wealth Velocity Score
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
          >
            Net worth says where you started.
            <em className="mt-1 block text-gold-dark italic">Velocity says where you’re going.</em>
          </motion.h2>
        </motion.div>

        <div className="relative mx-auto mt-16 w-full max-w-md">
          <svg viewBox="0 0 300 170" className="w-full" aria-hidden="true">
            <defs>
              <linearGradient id="scoreArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9A7A3A" />
                <stop offset="55%" stopColor="#C9A96E" />
                <stop offset="100%" stopColor="#E8C98A" />
              </linearGradient>
            </defs>
            <path
              d="M 30 160 A 120 120 0 0 1 270 160"
              fill="none"
              stroke="rgba(13,12,10,0.08)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <motion.path
              d="M 30 160 A 120 120 0 0 1 270 160"
              fill="none"
              stroke="url(#scoreArc)"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 0.684 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 pb-1">
            <p className="font-display text-[84px] leading-none font-medium tracking-tight text-ink">
              <AnimatedNumber to={684} duration={2.2} />
            </p>
            <p className="mt-1 text-[12px] font-semibold tracking-[0.2em] text-ink-dim">
              OF 1,000
            </p>
          </div>
        </div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mx-auto mt-10 max-w-xl text-[16px] leading-relaxed text-ink-sub"
        >
          One number, 0 to 1,000, built from how you actually behave with money. It doesn&rsquo;t
          care what you inherited. It cares what you did this week — which means it can climb from
          any starting point.
        </motion.p>

        <motion.div
          variants={stagger(0.07, 0.2)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {FACTORS.map((factor) => (
            <motion.span
              key={factor}
              variants={fadeUp}
              className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-ink-sub shadow-[0_4px_16px_rgba(154,128,96,0.08)]"
            >
              {factor}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
