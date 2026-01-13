
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home, User, Lightbulb, LogIn } from "lucide-react";
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
import Logo from "./Logo";
import { useUser } from "@/firebase/auth/use-user";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/review", label: "Review", icon: BookOpen },
  { href: "/quiz", label: "Quiz", icon: Lightbulb },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Timer", icon: Clock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { time, isActive } = useTimer();
  const { state: sidebarState } = useSidebar();
  const { user, firebaseUser, linkGoogleAccount } = useUser();
  const isAnonymous = firebaseUser?.isAnonymous;


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

  const NavItem = ({ href, label, icon: Icon }: (typeof navItems)[0]) => {
      let isActivePath = false;
      if (href === '/daily') {
        isActivePath = pathname.startsWith('/daily') || (pathname.startsWith('/review') && isChallenge);
      } else if (href === '/review') {
        isActivePath = pathname.startsWith('/review') && !isChallenge;
      } else {
        isActivePath = pathname.startsWith(href);
      }

      const button = (
        <SidebarMenuButton
          isActive={isActivePath}
          className="justify-between h-12"
        >
          <div className="flex items-center gap-3">
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
      );

      return (
         <SidebarMenuItem>
            <Link href={href} className="w-full">
               {sidebarState === "collapsed" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" align="center">{label}</TooltipContent>
                  </Tooltip>
               ) : (
                button
               )}
            </Link>
          </SidebarMenuItem>
      )
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            LETReview
          </span>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {navItems.map((item) => (
           <NavItem key={item.href} {...item} />
        ))}
      </SidebarMenu>
        {user && (
            <>
            <SidebarSeparator />
            <SidebarFooter>
                {isAnonymous ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <SidebarMenuButton
                                onClick={() => linkGoogleAccount()}
                                className="h-14"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            <LogIn className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                        <span className="font-semibold text-sm">Sign In</span>
                                        <span className="text-xs text-muted-foreground">Save Your Progress</span>
                                    </div>
                                </div>
                            </SidebarMenuButton>
                        </TooltipTrigger>
                         {sidebarState === "collapsed" && (
                            <TooltipContent side="right" align="center">Sign in to save progress</TooltipContent>
                         )}
                    </Tooltip>
                ) : (
                    <Link href="/profile" className="w-full">
                       <Tooltip>
                            <TooltipTrigger asChild>
                                <SidebarMenuButton
                                    isActive={pathname === '/profile'}
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
                            </TooltipTrigger>
                             {sidebarState === "collapsed" && (
                                <TooltipContent side="right" align="center">{user.name}</TooltipContent>
                             )}
                        </Tooltip>
                    </Link>
                )}
            </SidebarFooter>
            </>
        )}
    </>
  );
}
