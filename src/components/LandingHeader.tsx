"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { useUser } from "@/firebase/auth/use-user";

export default function LandingHeader() {
  const { user } = useUser();

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm sticky top-0 bg-background/95 backdrop-blur z-50">
      <Link href="/" className="flex items-center justify-center">
        <Logo className="h-8 w-8 text-primary" />
        <span className="sr-only">LETReview</span>
        <span className="font-bold text-lg ml-2">LETReview</span>
      </Link>
      <nav className="ml-auto flex gap-2 sm:gap-4 items-center">
        {user ? (
           <Link href="/home">
             <Button>Dashboard</Button>
           </Link>
        ) : (
            <>
                <Link href="/login">
                    <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                    <Button>Sign Up</Button>
                </Link>
            </>
        )}
      </nav>
    </header>
  );
}
