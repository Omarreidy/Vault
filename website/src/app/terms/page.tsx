import type { Metadata } from 'next';
import LegalShell, { Markdown } from '@/components/LegalShell';
import { TERMS_OF_SERVICE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Service — VAULT',
  description: 'The terms that govern your use of VAULT.',
};

export default function TermsPage() {
  return (
    <LegalShell>
      <Markdown source={TERMS_OF_SERVICE} />
    </LegalShell>
  );
}
