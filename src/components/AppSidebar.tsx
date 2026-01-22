
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, Clock, Home, User, Lightbulb, LogIn, MessageSquare, Shield, ChevronsLeft } from "lucide-react";
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
import { useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";
import { Button } from "./ui/button";


const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/reviewer/review", label: "Reviewer", icon: BookOpen },
  { href: "/quiz", label: "Quiz", icon: Lightbulb },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/timer", label: "Timer", icon: Clock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { time, isActive } = useTimer();
  const { state: sidebarState, setOpenMobile, setOpen } = useSidebar();
  const { user, isAdmin, firebaseUser, linkGoogleAccount } = useUser();
  const isAnonymous = firebaseUser?.isAnonymous;
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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
        isActivePath = pathname.startsWith('/daily') || (pathname.startsWith('/reviewer/questions') && isChallenge);
      } else if (href.startsWith('/reviewer')) {
        isActivePath = pathname.startsWith('/reviewer') && !isChallenge;
      } else {
        isActivePath = pathname.startsWith(href);
      }

      const button = (
        <SidebarMenuButton
          isActive={isActivePath}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="group-data-[state=collapsed]/button:hidden">
              {label}
            </span>
          </div>
          {href === '/timer' && (
            <div className="relative group-data-[state=collapsed]/button:hidden">
              <TimerIndicator />
            </div>
          )}
        </SidebarMenuButton>
      );

      return (
         <SidebarMenuItem>
            <Link href={href} className="w-full" onClick={() => setOpenMobile(false)}>
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

  const feedbackButton = (
    <SidebarMenuButton
      onClick={() => {
        setIsFeedbackOpen(true);
      }}
    >
      <div className="flex items-center gap-3">
        <MessageSquare className="h-5 w-5 shrink-0" />
        <span className="group-data-[state=collapsed]/button:hidden">
          Feedback
        </span>
      </div>
    </SidebarMenuButton>
  );

  const adminButton = (
     <SidebarMenuButton
          isActive={pathname.startsWith('/admin')}
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 shrink-0" />
            <span className="group-data-[state=collapsed]/button:hidden">
              Admin
            </span>
          </div>
        </SidebarMenuButton>
  )

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg group-data-[state=collapsed]:hidden">
            LETReview
          </span>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {navItems.map((item) => (
           <NavItem key={item.href} {...item} />
        ))}
         {isAdmin && (
            <SidebarMenuItem>
                 <Link href="/admin" className="w-full" onClick={() => setOpenMobile(false)}>
                    {sidebarState === "collapsed" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{adminButton}</TooltipTrigger>
                        <TooltipContent side="right" align="center">Admin Dashboard</TooltipContent>
                      </Tooltip>
                   ) : (
                    adminButton
                   )}
                </Link>
            </SidebarMenuItem>
        )}
      </SidebarMenu>

      <SidebarSeparator />
      <SidebarMenu>
        <SidebarMenuItem>
          {sidebarState === "collapsed" ? (
            <Tooltip>
              <TooltipTrigger asChild>{feedbackButton}</TooltipTrigger>
              <TooltipContent side="right" align="center">Send Feedback</TooltipContent>
            </Tooltip>
          ) : (
            feedbackButton
          )}
        </SidebarMenuItem>
      </SidebarMenu>
      <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />

        {user && (
            <SidebarFooter>
                {isAnonymous ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <SidebarMenuButton
                                onClick={() => { linkGoogleAccount(); setOpenMobile(false); }}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            <LogIn className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start group-data-[state=collapsed]/button:hidden">
                                        <span className="font-semibold text-sm">Sign In</span>
                                        <span className="text-xs text-muted-foreground">Save Progress</span>
                                    </div>
                                </div>
                            </SidebarMenuButton>
                        </TooltipTrigger>
                         {sidebarState === "collapsed" && (
                            <TooltipContent side="right" align="center">Sign in to save progress</TooltipContent>
                         )}
                    </Tooltip>
                ) : (
                    <Link href="/profile" className="w-full" onClick={() => setOpenMobile(false)}>
                       <Tooltip>
                            <TooltipTrigger asChild>
                                <SidebarMenuButton
                                    isActive={pathname === '/profile'}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                                            <AvatarFallback>
                                                <User className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col items-start overflow-hidden group-data-[state=collapsed]/button:hidden">
                                            <span className="font-semibold text-sm truncate">{user.name}</span>
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
        )}
        <SidebarSeparator/>
        <div className="p-2 hidden md:block">
            <Button variant="outline" size="icon" className="w-full h-auto p-2" onClick={() => setOpen(!sidebarState)}>
                 <ChevronsLeft className="h-5 w-5 transition-transform duration-300 group-data-[state=collapsed]/sidebar-wrapper:rotate-180" />
            </Button>
        </div>
    </>
  );
}
