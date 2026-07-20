'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/track';

// Fires one page_view per route render (and captures attribution on the first).
// Reads search params from window.location inside the effect, so it needs no
// Suspense boundary and never affects prerendering.
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track('page_view');
  }, [pathname]);

  return null;
}
