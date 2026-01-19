'use client';

import { useState, useMemo } from 'react';
import { add, sub, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isFuture } from 'date-fns';
import { ChevronLeft, ChevronRight, Gem, Clock, HelpCircle, Award, CheckCircle, Flame, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DailyProgress } from '@/lib/types';
import { Alert, AlertDescription } from './ui/alert';

interface ActivityCalendarProps {
  dailyProgress: Record<string, DailyProgress>;
  onDayClick: (date: Date) => void;
}

type View = 'week' | 'month';

const StatDisplay = ({ icon: Icon, value, label, colorClass, isZero }: { icon: React.ElementType, value: number, label: string, colorClass: string, isZero: boolean }) => {
  if (isZero) {
    return null;
  }
  return (
    <div className={cn("flex items-center gap-1.5")}>
      <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />
      <span className="text-sm font-semibold">{value}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export function ActivityCalendar({ dailyProgress, onDayClick }: ActivityCalendarProps) {
  const [view, setView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showLegend, setShowLegend] = useState(true);

  const dateManipulation = useMemo(() => ({
    unit: view === 'week' ? { weeks: 1 } : { months: 1 },
    start: view === 'week' ? startOfWeek : startOfMonth,
    end: view === 'week' ? endOfWeek : endOfMonth,
  }), [view]);

  const handlePrev = () => setCurrentDate(current => sub(current, dateManipulation.unit));
  const handleNext = () => setCurrentDate(current => add(current, dateManipulation.unit));

  const startDate = dateManipulation.start(currentDate);
  const endDate = dateManipulation.end(currentDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getHeatColor = (points: number) => {
    if (points === 0) return 'bg-muted/20';
    if (points < 25) return 'bg-primary/10';
    if (points < 75) return 'bg-primary/20';
    if (points < 150) return 'bg-primary/40';
    return 'bg-primary/60';
  };

  const headerFormat = view === 'week' ? 'MMMM yyyy' : 'MMMM yyyy';
  const weekHeader = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-center w-48">{view === 'week' ? weekHeader : format(currentDate, headerFormat)}</h2>
            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
             {!showLegend && (
               <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowLegend(true)}>
                      <HelpCircle className="h-4 w-4"/>
                      <span className="sr-only">Show Legend</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Show Legend</TooltipContent>
              </Tooltip>
            )}
            <Tabs value={view} onValueChange={(v) => setView(v as View)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {showLegend && (
            <Alert className="mt-4">
                <AlertDescription className="flex items-center justify-between text-sm">
                   <span>Your current streak is marked with a flame (🔥) and completed Questions of the Day are marked with a check (✅). Click a past day to see details.</span>
                   <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowLegend(false)}>
                       <X className="h-4 w-4 text-muted-foreground"/>
                       <span className="sr-only">Hide Legend</span>
                   </Button>
                </AlertDescription>
            </Alert>
        )}
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-7 border-t border-l">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-xs sm:text-sm p-2 border-b border-r text-muted-foreground">{day}</div>
            ))}
            {days.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const progress = dailyProgress[dayKey] || {};
              const points = progress.pointsEarned || 0;
              const pomodoros = progress.pomodorosCompleted || 0;
              const questions = progress.questionsAnswered || 0;
              const challenges = progress.challengesCompleted?.length || 0;
              const qotd = progress.qotdCompleted || false;
              const isStreakDay = challenges > 0;

              const isDayToday = isToday(day);
              const isDayFuture = isFuture(day);

              return (
                <Tooltip key={day.toString()} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => !isDayFuture && onDayClick(day)}
                      className={cn(
                        "relative aspect-square p-2 border-b border-r flex flex-col justify-between transition-colors",
                        isDayFuture ? "bg-muted/10 cursor-not-allowed" : `hover:bg-primary/5 cursor-pointer`,
                        getHeatColor(points),
                        isDayToday && "ring-2 ring-primary ring-inset",
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn("font-bold text-xs sm:text-sm", isDayToday ? 'text-primary' : 'text-foreground')}>{format(day, 'd')}</span>
                        <div className="flex items-center gap-1 z-10 relative">
                            {isStreakDay && <Flame className="h-4 w-4 text-destructive" />}
                            {qotd && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                      <div className="hidden sm:grid grid-cols-2 gap-1.5 mt-auto">
                        <StatDisplay icon={Gem} value={points} label="Points" colorClass="text-yellow-500" isZero={points === 0} />
                        <StatDisplay icon={Clock} value={pomodoros} label="Pomodoros" colorClass="text-red-500" isZero={pomodoros === 0} />
                        <StatDisplay icon={HelpCircle} value={questions} label="Questions" colorClass="text-green-500" isZero={questions === 0} />
                        <StatDisplay icon={Award} value={challenges} label="Challenges" colorClass="text-purple-500" isZero={challenges === 0} />
                      </div>
                       <div className="sm:hidden grid grid-cols-2 gap-0.5 mt-auto place-items-center">
                          {points > 0 && <Gem className="h-3 w-3 text-yellow-500" />}
                          {pomodoros > 0 && <Clock className="h-3 w-3 text-red-500" />}
                          {questions > 0 && <HelpCircle className="h-3 w-3 text-green-500" />}
                          {challenges > 0 && <Award className="h-3 w-3 text-purple-500" />}
                       </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{format(day, 'MMM d, yyyy')}</p>
                    {isStreakDay && <p className="flex items-center gap-1"><Flame className="h-4 w-4 text-destructive" /> Streak Maintained</p>}
                    <p>{points} Points Earned</p>
                    <p>{pomodoros} Pomodoros Completed</p>
                    <p>{questions} Questions Answered</p>
                    <p>{challenges} Challenges Completed</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
