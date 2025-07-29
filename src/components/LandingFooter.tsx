
"use client";

import Link from "next/link";
import Logo from "./Logo";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted p-6 md:py-8 w-full">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">LETReview</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {currentYear} LETReview. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
