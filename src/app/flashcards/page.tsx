
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and now redirects to the main reviewer page.
export default function DeprecatedFlashcardsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reviewer/review');
  }, [router]);

  return null;
}
