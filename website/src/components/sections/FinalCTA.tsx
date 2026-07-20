'use client';

import { motion, useReducedMotion } from 'framer-motion';
import AppStoreButton from '@/components/AppStoreButton';
import PhoneMock from '@/components/PhoneMock';
import VaultRing from '@/components/VaultRing';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

export default function FinalCTA() {
  const reduced = useReducedMotion();

  return (
    <section id="download" className="relative overflow-hidden bg-night">
      {/* Nightfall — the page returns to where it began */}
      <div className="dusk-band h-48" aria-hidden="true" />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70vh]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 100%, rgba(201,169,110,0.14), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-32 text-center md:pb-40">
        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold uppercase"
          >
            The Beginning
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-[1.05] font-light tracking-tight text-parchment sm:text-6xl md:text-7xl"
          >
            Your first move is
            <em className="mt-1 block text-gold-light italic">already waiting.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-parchment-dim"
          >
            Download VAULT and get your starting score in 60 seconds — three questions, no bank
            login. Connect your accounts when you&rsquo;re ready, and wake up tomorrow to moves
            dealt from your real numbers.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-12 flex flex-col items-center gap-4">
            <AppStoreButton location="final_cta" />
            <p className="text-[12px] tracking-wide text-parchment-faint">
              Free to download · iPhone · Read-only via Plaid
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-24 flex justify-center"
        >
          {!reduced && (
            <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
              <VaultRing size={520} duration={160} />
              <VaultRing size={680} duration={220} reverse />
            </div>
          )}
          <motion.div
            animate={reduced ? undefined : { y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PhoneMock />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
