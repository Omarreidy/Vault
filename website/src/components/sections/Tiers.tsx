'use client';

import { motion } from 'framer-motion';
import { TIERS } from '@/lib/brand';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

const TIER_COPY: Record<string, string> = {
  Bronze: 'Everyone starts here. Nowhere to go but up.',
  Silver: 'Consistency, unlocked.',
  Gold: 'The habits are compounding now.',
  Platinum: 'Rarefied air. Few sustain this pace.',
  Black: 'Reserved for the relentless.',
};

export default function Tiers() {
  return (
    <section className="relative bg-night">
      {/* The descent — daylight fades as the climb gets serious */}
      <div className="dusk-band h-48" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-6 pt-8 pb-36 md:pb-44">
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold uppercase"
          >
            Feature 05 — Status
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-parchment md:text-6xl"
          >
            Climb from Bronze <em className="text-gold-light italic">to Black.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-parchment-dim"
          >
            Five tiers, earned by behavior — never by balance. A trust-fund can&rsquo;t buy
            Platinum. A barista can out-climb a banker.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger(0.12, 0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {TIERS.map((tier) => {
            const isBlack = tier.name === 'Black';
            return (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className={`relative rounded-3xl border p-6 transition-shadow duration-500 ${
                  isBlack
                    ? 'border-gold/40 bg-gradient-to-b from-[#161511] to-[#0B0A08] shadow-[0_0_60px_rgba(201,169,110,0.15)] hover:shadow-[0_0_90px_rgba(201,169,110,0.3)]'
                    : 'border-white/[0.07] bg-night-soft hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
                }`}
              >
                <span
                  className="inline-block h-10 w-10 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${tier.color}EE, ${tier.color}66)`,
                    boxShadow: `0 0 28px ${tier.glow}`,
                    border: isBlack ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  }}
                  aria-hidden="true"
                />
                <h3
                  className={`mt-5 font-display text-2xl font-medium tracking-tight ${
                    isBlack ? 'text-gold-light' : 'text-parchment'
                  }`}
                >
                  {tier.name}
                </h3>
                <p className="mt-1 text-[11px] font-semibold tracking-[0.15em] text-parchment-faint">
                  {tier.minScore}–{tier.maxScore}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-parchment-dim">
                  {TIER_COPY[tier.name]}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-16 text-center font-display text-2xl font-light text-parchment-dim italic md:text-3xl"
        >
          Status you can&rsquo;t buy. Only <span className="text-gold-light">earn.</span>
        </motion.p>
      </div>
    </section>
  );
}
