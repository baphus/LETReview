
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Edit, Check, Lock, Lightbulb, HelpCircle, X } from "lucide-react";
import Image from "next/image";
import { getQuestionOfTheDay } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Countdown from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isFuture } from "date-fns";
import { DayDetailDialog } from "@/components/DayDetailDialog";
import { useUser } from "@/firebase/auth/use-user";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";


const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const { user } = useUser();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showLegend, setShowLegend] = useState(true);
  
  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    getQuestionOfTheDay().then(setQuestionOfTheDay);
  }, []);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!user) return false;
    return (user.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
  }, [user, todayKey]);

  const handleDayClick = (day: Date) => {
    if (!isToday(day) && !isFuture(day)) {
      setSelectedDate(day);
    }
  };
  
  if (!user) {
    return null; // Or show loading spinner
  }

  return (
    <>
      <div className="container mx-auto max-w-4xl">
        <DayDetailDialog
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          userProgress={selectedDate ? user.dailyProgress[format(selectedDate, 'yyyy-MM-dd')] : undefined}
        />
        <p className="text-muted-foreground mb-6">Welcome back, {user.name}!</p>
        
        {user.examDate && <Countdown examDate={new Date(user.examDate)} />}

        {!isStreakSecuredToday && (
           <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-center text-blue-800 font-headline flex items-center justify-center gap-2">
                  <Flame className="h-6 w-6"/> Secure Your Streak!
              </CardTitle>
              <CardDescription className="text-center text-blue-600">You haven't completed a daily challenge yet. Finish one to maintain your streak.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/daily" className="w-full">
                  <Button className="w-full">Go to Daily Challenges</Button>
              </Link>
            </CardFooter>
          </Card>
        )}

          <section className="mb-6">
              <h2 className="text-xl font-bold font-headline mb-4">Question of the Day</h2>
              {questionOfTheDay ? (
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                              <span className="text-lg">{questionOfTheDay.question}</span>
                          </CardTitle>
                          
                      </CardHeader>
                      {!user.dailyProgress?.[todayKey]?.qotdCompleted && (
                          <CardFooter>
                              <Link href="/daily" className="w-full">
                                  <Button className="w-full">
                                      <Lightbulb className="mr-2 h-4 w-4" />
                                      Answer Now
                                  </Button>
                              </Link>
                          </CardFooter>
                      )}
                  </Card>
              ) : (<Card><CardContent><p>Loading question...</p></CardContent></Card>)}
          </section>

        <Separator className="my-6" />
      </div>

       <section className="mt-8">
        <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-headline">Activity Calendar</h2>
                 <div className="flex items-center gap-2">
                    {!showLegend && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLegend(true)}>
                                <HelpCircle className="h-4 w-4"/>
                                <span className="sr-only">Show Legend</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Show Legend</TooltipContent>
                    </Tooltip>
                    )}
                    <Select value={view} onValueChange={(v) => setView(v as 'week' | 'month')}>
                        <SelectTrigger className="w-auto h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
             {showLegend && (
                <Alert className="mb-4">
                    <AlertDescription className="flex items-center justify-between text-sm">
                    <span>Your current streak is marked with a flame (🔥) and completed Questions of the Day are marked with a check (✅). Click a past day to see details.</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowLegend(false)}>
                        <X className="h-4 w-4 text-muted-foreground"/>
                        <span className="sr-only">Hide Legend</span>
                    </Button>
                    </AlertDescription>
                </Alert>
            )}
        </div>
        <div className="md:container md:mx-auto md:max-w-4xl">
            <ActivityCalendar dailyProgress={user.dailyProgress} onDayClick={handleDayClick} view={view} />
        </div>
       </section>
    </>
  );
}
