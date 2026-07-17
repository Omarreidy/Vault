'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

// Real member quotes go here as they arrive — name, detail, quote.
// While empty, the section renders the honest founding-cohort invitation instead.
// Example shape: { quote: '…', name: 'Jordan M.', detail: 'Member since 2026' }
const TESTIMONIALS: { quote: string; name: string; detail: string }[] = [];

function FoundingInvite() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.div variants={stagger(0.12)} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
        <motion.p
          variants={fadeUp}
          className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
        >
          The First Cohort
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
        >
          This page has no reviews.
          <em className="mt-1 block text-gold-dark italic">On purpose.</em>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-ink-sub"
        >
          VAULT is new. We could have filled this section with invented praise from people who
          don&rsquo;t exist — most landing pages do. We&rsquo;d rather earn yours.
        </motion.p>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-sub"
        >
          The founding cohort is climbing the first tiers right now. The first words written here
          will be theirs — maybe yours.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10">
          <a
            href="#download"
            className="inline-block rounded-full border border-gold-dark/40 px-8 py-4 text-[15px] font-semibold text-gold-dark transition-all duration-500 hover:bg-gold/10 hover:shadow-[0_8px_40px_rgba(201,169,110,0.25)]"
          >
            Become a founding member
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}

function TestimonialGrid() {
  return (
    <div>
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
          From The Members
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
        >
          In their words.
        </motion.h2>
      </motion.div>
      <motion.div
        variants={stagger(0.12, 0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="mt-14 grid gap-6 md:grid-cols-3"
      >
        {TESTIMONIALS.map((t) => (
          <motion.blockquote
            key={t.name}
            variants={fadeUp}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-[0_12px_40px_rgba(154,128,96,0.1)]"
          >
            <p className="font-display text-xl leading-relaxed font-light text-ink italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <footer className="mt-6">
              <p className="text-[14px] font-semibold text-ink">{t.name}</p>
              <p className="text-[12px] text-ink-dim">{t.detail}</p>
            </footer>
          </motion.blockquote>
        ))}
      </motion.div>
    </div>
  );
}

export default function Founding() {
  return (
    <section className="bg-cream-deep py-32 md:py-44">
      <div className="mx-auto max-w-6xl px-6">
        {TESTIMONIALS.length === 0 ? <FoundingInvite /> : <TestimonialGrid />}
      </div>
    </section>
  );
}
