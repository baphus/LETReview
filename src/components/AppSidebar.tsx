
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";
import { Badge } from "./ui/badge";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Review", icon: BookOpen },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Timer", icon: Clock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { time, isActive } = useTimer();
  const { state: sidebarState } = useSidebar();

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

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            LETsReview
          </span>
        </div>
      </SidebarHeader>
      <SidebarMenu>
        {navItems.map(({ href, label, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <Link href={href} className="w-full">
              <SidebarMenuButton
                isActive={pathname === href}
                tooltip={{ children: label }}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {label}
                  </span>
                </div>
                 {href === '/timer' && (
                  <div className="relative group-data-[collapsible=icon]:-mr-1">
                    <TimerIndicator />
                  </div>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
