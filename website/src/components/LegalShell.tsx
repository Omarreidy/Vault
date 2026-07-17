import Link from 'next/link';
import type { ReactNode } from 'react';

// Renders the limited markdown subset used by src/lib/legal.ts:
// #/##/### headings, "- " lists, **bold**, paragraphs.
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-parchment">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split('\n');
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="mb-4 list-disc space-y-2 pl-5 text-parchment-dim">
        {list.map((item, i) => (
          <li key={i}>{inline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const key = `b${i}`;
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      return;
    }
    flushList(`ul-${i}`);
    if (line === '') return;
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key} className="mt-6 mb-2 text-[15px] font-semibold text-parchment">
          {inline(line.slice(4), key)}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={key}
          className="mt-10 mb-3 text-[13px] font-bold uppercase tracking-[0.15em] text-gold"
        >
          {inline(line.slice(3), key)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h1
          key={key}
          className="mb-2 font-display text-4xl font-light tracking-tight text-parchment"
        >
          {inline(line.slice(2), key)}
        </h1>,
      );
    } else {
      blocks.push(
        <p key={key} className="mb-4 text-parchment-dim">
          {inline(line, key)}
        </p>,
      );
    }
  });
  flushList('ul-end');

  return <>{blocks}</>;
}

export default function LegalShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-night text-[15px] leading-[1.7]">
      <div className="mx-auto max-w-[720px] px-6 pt-16 pb-24">
        <Link
          href="/"
          className="mb-12 block text-[11px] font-bold tracking-[0.3em] text-gold uppercase"
        >
          Vault
        </Link>
        {children}
        <hr className="my-10 border-night-border" />
        <p className="text-xs text-parchment-faint">© 2026 VAULT. All rights reserved.</p>
      </div>
    </main>
  );
}
