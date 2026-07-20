'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { APP_STORE_URL } from '@/lib/brand';
import { track } from '@/lib/track';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Experience', href: '#demo' },
  { label: 'Why VAULT', href: '#why' },
  { label: 'Security', href: '#trust' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-gold/15 bg-night/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-[13px] font-bold tracking-[0.35em] text-gold"
          aria-label="VAULT home"
        >
          VAULT
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-parchment transition-colors duration-300 hover:text-gold-light"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href={APP_STORE_URL ?? '#download'}
          onClick={() => track('appstore_cta_click', { location: 'nav', live: APP_STORE_URL != null })}
          className="rounded-full bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep px-5 py-2 text-[13px] font-bold text-night transition-shadow duration-500 hover:shadow-[0_4px_24px_rgba(201,169,110,0.5)]"
        >
          Get VAULT
        </a>
      </nav>
    </header>
  );
}
