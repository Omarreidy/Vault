import MagneticButton from '@/components/MagneticButton';
import { APP_STORE_URL } from '@/lib/brand';

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 814 1000" className={className} aria-hidden="true" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

// Primary conversion CTA. Renders a live App Store link once APP_STORE_URL is set
// in src/lib/brand.ts; until then it's a styled placeholder pointing at #download.
export default function AppStoreButton({ light = false }: { light?: boolean }) {
  const href = APP_STORE_URL ?? '#download';
  return (
    <MagneticButton>
      <a
        href={href}
        aria-label="Download VAULT on the App Store"
        className={`group flex items-center gap-3 rounded-full px-7 py-4 transition-shadow duration-500 ${
          light
            ? 'bg-ink text-cream shadow-[0_8px_40px_rgba(13,12,10,0.25)] hover:shadow-[0_12px_56px_rgba(13,12,10,0.35)]'
            : 'bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep text-night shadow-[0_8px_40px_rgba(201,169,110,0.25)] hover:shadow-[0_12px_64px_rgba(201,169,110,0.45)]'
        }`}
      >
        <AppleLogo className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] opacity-80">
            Download on the
          </span>
          <span className="block text-[17px] font-bold tracking-tight">App Store</span>
        </span>
      </a>
    </MagneticButton>
  );
}
