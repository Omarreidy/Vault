'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/PhoneMock';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

const HOOKS = [
  {
    title: 'A new hand every morning',
    body: 'The feed refreshes every day. What’s in today’s hand? There’s only one way to know.',
  },
  {
    title: 'Streaks that hurt to break',
    body: 'Day 21 feels different from day 2. Momentum becomes something you protect.',
    streak: true,
  },
  {
    title: 'A score that remembers',
    body: 'Every move you make is banked in your Velocity. Progress that compounds instead of resetting.',
  },
  {
    title: 'Achievements with weight',
    body: 'No participation trophies. Badges mark real financial firsts — first $1k moved, first leak sealed.',
  },
  {
    title: 'Small wins, banked daily',
    body: 'Two-minute moves that pay off for years. The app is engineered so you never leave empty-handed.',
  },
  {
    title: 'Insights that surprise',
    body: 'VAULT notices what you don’t. The best sessions start with “wait — it caught what?”',
  },
];

export default function WhyReturn() {
  return (
    <section id="why" className="relative bg-cream">
      {/* Surfacing — back into daylight */}
      <div className="dawn-band h-48" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-6 pt-4 pb-32 md:pb-44">
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
          >
            Why it sticks
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
          >
            Built to be opened <em className="text-gold-dark italic">daily.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-ink-sub"
          >
            Most finance apps get opened twice: the day you download them and the day you delete
            them. VAULT is engineered around the psychology of coming back.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger(0.08, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {HOOKS.map((hook) => (
            <motion.div
              key={hook.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="rounded-3xl border border-black/[0.07] bg-white p-7 shadow-[0_12px_40px_rgba(154,128,96,0.1)] transition-shadow duration-500 hover:shadow-[0_24px_64px_rgba(154,128,96,0.2)]"
            >
              {hook.streak ? (
                <p className="font-display text-4xl font-light text-gold-dark">
                  Day&nbsp;
                  <AnimatedNumber to={21} duration={1.6} />
                </p>
              ) : (
                <span
                  className="inline-block h-2 w-8 rounded-full bg-gradient-to-r from-gold-dark to-gold-light"
                  aria-hidden="true"
                />
              )}
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">
                {hook.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-sub">{hook.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
