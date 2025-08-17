
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home, User, Lightbulb, BookCopy } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "./ui/badge";
import { useTimer } from "@/hooks/use-timer";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useEffect, useState, useCallback } from "react";
import Logo from "./Logo";
import type { UserProfile } from "@/lib/types";
import { loadUserProfile } from "@/lib/data";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/review", label: "Review", icon: BookOpen },
  { href: "/quiz", label: "Quiz", icon: Lightbulb },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Pomodoro", icon: Clock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { time, isActive } = useTimer();
  const { state: sidebarState } = useSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const loadUser = useCallback(() => {
     if (typeof window !== 'undefined') {
        const loadedUser = loadUserProfile();
        setUser(loadedUser);
    }
  }, []);

  useEffect(() => {
    loadUser();
    window.addEventListener('storage', loadUser);
    return () => {
        window.removeEventListener('storage', loadUser);
    }
  }, [loadUser]);

  const TimerIndicator = () => {
    if (!isActive) return null;
    if (sidebarState === "collapsed") {
      return (
        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
      );
    }
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    return (
      <Badge variant="destructive" className="text-xs">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </Badge>
    );
  };
  
  const isChallenge = searchParams.get('challenge') === 'true';

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            Qwiz
          </span>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
            let isActivePath = false;
            if (href === '/daily') {
              isActivePath = pathname.startsWith('/daily') || (pathname.startsWith('/review') && isChallenge);
            } else if (href === '/review') {
              isActivePath = pathname.startsWith('/review') && !isChallenge;
            } else {
              isActivePath = pathname.startsWith(href);
            }
            
            return (
              <SidebarMenuItem key={href}>
                <Link href={href} className="w-full">
                  <SidebarMenuButton
                    isActive={isActivePath}
                    tooltip={{ children: label }}
                    className="justify-between h-12"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {label}
                      </span>
                    </div>
                     {label === 'Pomodoro' && (
                      <div className="relative group-data-[collapsible=icon]:-mr-1">
                        <TimerIndicator />
                      </div>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
        })}
      </SidebarMenu>
        {user && (
            <>
            <SidebarSeparator />
            <SidebarFooter>
                <Link href="/profile" className="w-full">
                    <SidebarMenuButton
                        isActive={pathname.startsWith('/profile')}
                        tooltip={{ children: user.name }}
                        className="h-14"
                    >
                         <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback>
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                <span className="font-semibold text-sm">{user.name}</span>
                                <span className="text-xs text-muted-foreground">View Profile</span>
                            </div>
                        </div>
                    </SidebarMenuButton>
                </Link>
            </SidebarFooter>
            </>
        )}
    </>
  );
}
