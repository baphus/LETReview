
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldReviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reviewer/review');
  }, [router]);

  return null; // Or a loading spinner
}
