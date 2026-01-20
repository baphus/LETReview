"use client";

import Link from "next/link";
import Logo from "./Logo";

export default function LandingFooter() {
  const currentYear = 2024;

  return (
    <footer className="bg-muted p-6 md:py-8 w-full">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg">LETReview</span>
        </div>
        <div className="text-center sm:text-right">
            <div className="flex gap-4 justify-center sm:justify-end mb-2">
                <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                <Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm text-muted-foreground">
            © {currentYear} LETReview. All rights reserved.
            </p>
        </div>
      </div>
    </footer>
  );
}
