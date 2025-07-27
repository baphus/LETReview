
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";
import { Badge } from "./ui/badge";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Review", icon: BookOpen },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Timer", icon: Clock },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { time, isActive, mode } = useTimer();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-t-lg md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActivePath = pathname === href;
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
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
