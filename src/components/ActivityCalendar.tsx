
'use client';

import { useState, useMemo } from 'react';
import { add, sub, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isFuture, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Gem, Clock, HelpCircle, Award, CheckCircle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DailyProgress } from '@/lib/types';

interface ActivityCalendarProps {
  dailyProgress: Record<string, DailyProgress>;
  onDayClick: (date: Date) => void;
  view: 'week' | 'month';
}

type View = 'week' | 'month';

const StatDisplay = ({ icon: Icon, value, label, colorClass, isZero }: { icon: React.ElementType, value: number, label: string, colorClass: string, isZero: boolean }) => {
  if (isZero) {
    return null;
  }
  return (
    <div className={cn("flex items-center gap-1")}>
      <Icon className={cn("h-3 w-3 sm:h-4 sm:w-4 shrink-0", colorClass)} />
      <span className="text-xs sm:text-sm font-semibold">{value}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export function ActivityCalendar({ dailyProgress, onDayClick, view }: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => setCurrentDate(current => sub(current, view === 'week' ? { weeks: 1 } : { months: 1 }));
  const handleNext = () => setCurrentDate(current => add(current, view === 'week' ? { weeks: 1 } : { months: 1 }));

  const {days, startDate, endDate} = useMemo(() => {
    const start = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 0 }) : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 0 }) : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return {
        days: eachDayOfInterval({ start, end }),
        startDate: start,
        endDate: end
    };
  }, [currentDate, view]);

  const getHeatColor = (points: number) => {
    if (points === 0) return 'bg-muted/20';
    if (points < 25) return 'bg-primary/10';
    if (points < 75) return 'bg-primary/20';
    if (points < 150) return 'bg-primary/40';
    return 'bg-primary/60';
  };

  const weekHeader = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-center w-48">{view === 'week' ? weekHeader : format(currentDate, 'MMMM yyyy')}</h2>
            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-6 md:pt-0">
        <TooltipProvider>
          <div className="grid grid-cols-7 border-t border-l md:border-0">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center font-bold text-xs sm:text-sm p-2 border-b border-r text-muted-foreground">{day}</div>
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
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <Tooltip key={day.toString()} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => !isDayFuture && onDayClick(day)}
                      className={cn(
                        "relative p-1.5 sm:p-2 border-b border-r flex flex-col justify-between transition-colors min-h-28 md:aspect-square",
                        isDayFuture ? "bg-muted/10 cursor-not-allowed" : `hover:bg-primary/5 cursor-pointer`,
                        isCurrentMonth ? getHeatColor(points) : 'bg-muted/10',
                        isDayToday && "ring-2 ring-primary ring-inset",
                        !isCurrentMonth && !isDayFuture && "cursor-pointer"
                      )}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className={cn("font-bold text-sm", isDayToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50')}>{format(day, 'd')}</span>
                        <div className="flex flex-wrap items-center justify-end gap-0.5">
                            {isStreakDay && isCurrentMonth && <Flame className="h-4 w-4 text-destructive shrink-0" />}
                            {qotd && isCurrentMonth && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                        </div>
                      </div>
                      {isCurrentMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 mt-auto">
                            <StatDisplay icon={Gem} value={points} label="Points" colorClass="text-yellow-500" isZero={points === 0} />
                            <StatDisplay icon={Clock} value={pomodoros} label="Pomodoros" colorClass="text-red-500" isZero={pomodoros === 0} />
                            <StatDisplay icon={HelpCircle} value={questions} label="Questions" colorClass="text-green-500" isZero={questions === 0} />
                            <StatDisplay icon={Award} value={challenges} label="Challenges" colorClass="text-purple-500" isZero={challenges === 0} />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{format(day, 'MMM d, yyyy')}</p>
                    {isCurrentMonth && (
                        <>
                            {isStreakDay && <p className="flex items-center gap-1"><Flame className="h-4 w-4 text-destructive" /> Streak Maintained</p>}
                            <p>{points} Points Earned</p>
                            <p>{pomodoros} Pomodoros Completed</p>
                            <p>{questions} Questions Answered</p>
                            <p>{challenges} Challenges Completed</p>
                        </>
                    )}
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
