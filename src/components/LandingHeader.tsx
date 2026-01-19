"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";

export default function LandingHeader() {
  const { user, firebaseUser, linkGoogleAccount } = useUser();
  const isAnonymous = firebaseUser?.isAnonymous;
  const router = useRouter();

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm sticky top-0 bg-background/95 backdrop-blur z-10">
      <Link href="/" className="flex items-center justify-center">
        <Logo className="h-8 w-8 text-primary" />
        <span className="sr-only">LETReview</span>
        <span className="font-bold text-lg ml-2">LETReview</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4">
          Features
        </Link>
        <Link href="#testimonials" className="text-sm font-medium hover:underline underline-offset-4">
          Testimonials
        </Link>
        {user && !isAnonymous ? (
           <Link href="/home">
             <Button>Dashboard</Button>
           </Link>
        ) : (
            <Button onClick={linkGoogleAccount}>Login with Google</Button>
        )}
      </nav>
    </header>
  );
}
