"use client";

import Link from "next/link";
import Logo from "./Logo";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-white">LETReview</span>
            </Link>
            <p className="text-slate-400">
              Welcome to LETReview, where we make preparing for the Licensure Examination for Teachers an engaging and effective experience.
            </p>
          </div>
          
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-2">
                <li><Link href="/#features" className="hover:text-primary transition-colors">Reviewer</Link></li>
                <li><Link href="/#features" className="hover:text-primary transition-colors">Daily Challenges</Link></li>
                <li><Link href="/#features" className="hover:text-primary transition-colors">Pomodoro Timer</Link></li>
                <li><Link href="/#features" className="hover:text-primary transition-colors">Gamification</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
             <div>
              <h3 className="font-semibold text-white mb-4">Get Started</h3>
              <ul className="space-y-2">
                 <li><Link href="/home" className="hover:text-primary transition-colors">Go to App</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-sm">
          <p className="text-slate-500">© {currentYear} LETReview. All rights reserved.</p>
          <p className="mt-4 sm:mt-0">Made with ❤️ by Josephus</p>
        </div>
      </div>
    </footer>
  );
}
