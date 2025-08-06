
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home, Lightbulb, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";
import { Badge } from "./ui/badge";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/review", label: "Review", icon: BookOpen },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Timer", icon: Clock },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { time, isActive } = useTimer();

  const TimerIndicator = () => {
    if (!isActive) return null;
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    
    return (
        <Badge variant="destructive" className="absolute -top-1 right-0 transform translate-x-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5">
           {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Badge>
    );
  };

  const isChallenge = searchParams.get('challenge') === 'true';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-t-lg md:hidden pb-4">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          let isActivePath = false;
          // The /daily link is active on the /daily page OR on the /review page if it's a challenge
          if (href === '/daily') {
            isActivePath = pathname.startsWith('/daily') || (pathname.startsWith('/review') && isChallenge);
          } 
          // The /review link is active on the /review page ONLY if it's NOT a challenge
          else if (href === '/review') {
            isActivePath = pathname.startsWith('/review') && !isChallenge;
          } 
          // For all other links, use the default startsWith logic
          else {
            isActivePath = pathname.startsWith(href);
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors relative",
                isActivePath ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6 mb-1" />
                {href === '/timer' && <TimerIndicator />}
              </div>
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

    