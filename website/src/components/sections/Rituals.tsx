'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

const RITUALS = [
  {
    eyebrow: 'THE DAILY OPEN',
    title: 'One tap. Every morning.',
    body: 'Your change since yesterday, your streak, your moves for the day — served in the time it takes your coffee to brew. The ritual that quietly rebuilds your relationship with money.',
    stat: '21-day streak',
  },
  {
    eyebrow: 'INSIGHTS',
    title: 'Leaks, spotted for you.',
    body: 'The subscriptions you forgot. The cash earning nothing. The balance quietly hurting your credit. VAULT flags where money slips and shows you — before it compounds against you.',
    stat: 'Automatic · Always watching',
  },
];

export default function Rituals() {
  return (
    <section className="bg-cream pb-32 md:pb-44">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
        >
          Feature 04 — The Rituals
        </motion.p>

        <motion.div
          variants={stagger(0.15, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-8 grid gap-6 md:grid-cols-2"
        >
          {RITUALS.map((ritual) => (
            <motion.div
              key={ritual.eyebrow}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="group rounded-[28px] border border-black/[0.07] bg-white p-9 shadow-[0_16px_56px_rgba(154,128,96,0.12)] transition-shadow duration-500 hover:shadow-[0_28px_80px_rgba(154,128,96,0.22)]"
            >
              <p className="text-[10px] font-bold tracking-[0.3em] text-gold-dark">
                {ritual.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-4xl leading-tight font-light tracking-tight text-ink">
                {ritual.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-sub">{ritual.body}</p>
              <p className="mt-6 inline-block rounded-full bg-gold/12 px-4 py-1.5 text-[12px] font-semibold text-gold-dark">
                {ritual.stat}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
