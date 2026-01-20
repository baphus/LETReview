"use client";

import Link from "next/link";
import Logo from "./Logo";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted p-6 md:py-8 w-full">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg">LETReview</span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-muted-foreground">
            <p>
             © {currentYear} LETReview. All rights reserved.
            </p>
            <div className="flex gap-4">
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                <Link href="/terms" className="hover:underline">Terms of Service</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
