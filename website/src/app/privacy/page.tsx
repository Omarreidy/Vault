import type { Metadata } from 'next';
import LegalShell, { Markdown } from '@/components/LegalShell';
import { PRIVACY_POLICY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — VAULT',
  description: 'How VAULT collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalShell>
      <Markdown source={PRIVACY_POLICY} />
    </LegalShell>
  );
}
