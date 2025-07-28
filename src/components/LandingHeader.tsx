
"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm">
      <Link href="/" className="flex items-center justify-center">
        <BookOpen className="h-6 w-6 text-primary" />
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
        <Link href="/login">
            <Button>Login</Button>
        </Link>
      </nav>
    </header>
  );
}
