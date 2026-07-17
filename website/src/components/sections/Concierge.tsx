'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

function TypingDots() {
  return (
    <span className="flex gap-1.5 px-1 py-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gold-dark"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

export default function Concierge() {
  return (
    <section className="bg-cream py-32 md:py-44">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-2">
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
            Feature 03 — AI Concierge
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
          >
            Advice that knows <em className="text-gold-dark italic">your numbers.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-sub"
          >
            Every money question you&rsquo;ve ever Googled returned advice written for someone
            else. Your concierge answers with your balances, your bills, your pace — like a
            private banker who never sleeps.
          </motion.p>
          <motion.p variants={fadeUp} className="mt-4 text-[13px] text-ink-dim">
            Informational insights, not licensed financial advice.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger(0.5, 0.2)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="rounded-[28px] border border-black/[0.07] bg-white p-6 shadow-[0_24px_80px_rgba(154,128,96,0.18)]"
        >
          <p className="mb-5 text-[9px] font-bold tracking-[0.3em] text-gold-dark">
            VAULT CONCIERGE
          </p>

          <motion.div variants={fadeUp} className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[14px] leading-snug text-cream">
              Can I actually afford Lisbon in October?
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-4 flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gold/10 px-4 py-3">
              <p className="text-[14px] leading-relaxed text-ink">
                Yes — comfortably. You&rsquo;re <strong>$1,240 ahead</strong> of your savings pace
                this quarter. Keep dining under <strong>$480</strong> this month and the trip fits
                without touching your emergency fund.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-4 flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gold/10 px-4 py-3">
              <p className="text-[14px] leading-relaxed text-ink">
                Want me to set a <strong>Lisbon fund</strong> and route $95/week into it starting
                Friday?
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-4 flex items-center gap-2 pl-1">
            <TypingDots />
            <span className="text-[11px] text-ink-dim">Concierge is thinking…</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
