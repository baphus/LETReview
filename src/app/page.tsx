
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem('currentUser', user.uid);
        router.replace("/home");
      } else {
        localStorage.removeItem('currentUser');
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Return a loading state while redirecting
  return (
    <div className="flex flex-col h-dvh">
      <main className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </main>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
