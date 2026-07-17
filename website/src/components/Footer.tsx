import Link from 'next/link';
import { SITE } from '@/lib/brand';

const EXPLORE = [
  { label: 'Features', href: '#features' },
  { label: 'Experience', href: '#demo' },
  { label: 'Why VAULT', href: '#why' },
  { label: 'Security', href: '#trust' },
];

const LEGAL = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Support', href: '/support' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-night">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <p className="text-[13px] font-bold tracking-[0.35em] text-gold">VAULT</p>
            <p className="mt-4 font-display text-xl font-light text-parchment-dim italic">
              Made for people going somewhere.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-parchment-faint">
                EXPLORE
              </p>
              <ul className="mt-4 space-y-3">
                {EXPLORE.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-[14px] text-parchment-dim transition-colors hover:text-parchment"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-parchment-faint">
                COMPANY
              </p>
              <ul className="mt-4 space-y-3">
                {LEGAL.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-parchment-dim transition-colors hover:text-parchment"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href={`mailto:${SITE.supportEmail}`}
                    className="text-[14px] text-parchment-dim transition-colors hover:text-parchment"
                  >
                    {SITE.supportEmail}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/[0.06] pt-8">
          <p className="text-[12px] leading-relaxed text-parchment-faint">
            VAULT is not a bank. VAULT provides informational and educational insights only and
            does not provide financial, investment, tax, or legal advice. Bank connections are
            provided read-only via Plaid.
          </p>
          <p className="mt-4 text-[12px] text-parchment-faint">
            © 2026 VAULT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
