"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Flame, BookOpen, Brain, CheckCircle, AlertTriangle, X, HelpCircle,
  Zap, Timer, Trophy, ArrowRight, Sparkles, Target
} from "lucide-react";
import type { Reviewer, Topic, Subject } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Countdown from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isFuture, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { DayDetailDialog } from "@/components/DayDetailDialog";
import { useUser } from "@/firebase/auth/use-user";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionOfTheDay } from "@/components/QuestionOfTheDay";
import { VirtualPetHero } from "@/components/VirtualPetHero";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const { user, firebaseUser } = useUser();
  const firestore = useFirestore();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showLegend, setShowLegend] = useState(false);

  const [featuredArticle, setFeaturedArticle] = useState<Reviewer | null>(null);
  const [randomTopic, setRandomTopic] = useState<Topic | null>(null);

  const { data: articles, isLoading: isLoadingArticles } = useCollection<Reviewer>(useMemoFirebase(() => firestore ? query(collection(firestore, 'reviewers'), where('status', '==', 'published'), limit(10)) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? query(collection(firestore, 'topics'), limit(20)) : null, [firestore]));
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects'), limit(10)) : null, [firestore]));

  useEffect(() => {
    if (articles && articles.length > 0 && !featuredArticle) {
      setFeaturedArticle(articles[Math.floor(Math.random() * articles.length)]);
    }
  }, [articles, featuredArticle]);

  useEffect(() => {
    if (topics && topics.length > 0 && !randomTopic) {
      setRandomTopic(topics[Math.floor(Math.random() * topics.length)]);
    }
  }, [topics, randomTopic]);
  
  const todayKey = useMemo(() => getTodayKey(), []);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!user) return false;
    return (user.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
  }, [user, todayKey]);

  const todayStats = useMemo(() => {
    if (!user) return { questions: 0, pomodoros: 0, points: 0, challenges: 0 };
    const progress = user.dailyProgress?.[todayKey] || {};
    return {
      questions: progress.questionsAnswered || 0,
      pomodoros: progress.pomodorosCompleted || 0,
      points: progress.pointsEarned || 0,
      challenges: progress.challengesCompleted?.length || 0,
    };
  }, [user, todayKey]);

  const handleDayClick = (day: Date) => {
    if (isToday(day) || !isFuture(day)) {
      setSelectedDate(day);
    }
  };
  
  if (!user) return null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <DayDetailDialog
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        userProgress={selectedDate ? user.dailyProgress[format(selectedDate, 'yyyy-MM-dd')] : undefined}
      />

      {/* Guest Warning */}
      {firebaseUser?.isAnonymous && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 !text-amber-800" />
          <AlertTitle>Browsing as a guest</AlertTitle>
          <AlertDescription>
            Your progress is only saved on this browser. 
            <Link href="/register" className="font-bold underline ml-1 hover:text-amber-900">Create an account</Link> to save your data permanently.
          </AlertDescription>
        </Alert>
      )}
      
      {/* AI Pet Hero Section */}
      <VirtualPetHero />

      {/* Exam Countdown */}
      {user.examDate && <Countdown examDate={new Date(user.examDate)} />}

      {/* Quick Actions Row */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction 
            href="/daily" 
            icon={<Zap className="h-5 w-5" />}
            label="Daily Challenge"
            description={isStreakSecuredToday ? "Streak secured!" : "Secure streak"}
            color="text-destructive"
            highlight={!isStreakSecuredToday}
          />
          <QuickAction 
            href="/reviewer/review" 
            icon={<BookOpen className="h-5 w-5" />}
            label="Reviewers"
            description="Study articles"
            color="text-primary"
          />
          <QuickAction 
            href="/quiz" 
            icon={<Brain className="h-5 w-5" />}
            label="Quiz Mode"
            description="Practice questions"
            color="text-purple-500"
          />
          <QuickAction 
            href="/timer" 
            icon={<Timer className="h-5 w-5" />}
            label="Focus Timer"
            description="Pomodoro study"
            color="text-accent"
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QOTD - Takes 2 columns */}
        <div className="lg:col-span-2">
          <QuestionOfTheDay className="m-0 h-full flex flex-col" />
        </div>

        {/* Streak Card */}
        <div className="lg:col-span-1">
          <Card className={cn("h-full flex flex-col", !isStreakSecuredToday && "border-primary/50")}>
            <CardHeader className="pb-3">
              <CardTitle className="font-headline flex items-center gap-2 text-lg">
                <Flame className={cn("h-5 w-5", isStreakSecuredToday ? "text-destructive" : "text-primary")} />
                {isStreakSecuredToday ? "Streak Secured!" : "Secure Your Streak"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isStreakSecuredToday 
                  ? `${user.streak}-day streak is safe. Well done!`
                  : "Complete a daily challenge to maintain your streak."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2 flex-1">
              <div className="flex justify-around items-center pt-2 border-t">
                {weekDays.map((day, i) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const hasActivity = (user.dailyProgress?.[dayKey]?.challengesCompleted?.length || 0) > 0;
                  const isDayToday = isToday(day);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{format(day, 'E')[0]}</span>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        hasActivity ? "bg-destructive" : "bg-muted",
                        isDayToday && "ring-2 ring-primary ring-offset-1"
                      )}>
                        {hasActivity && <Flame className="h-4 w-4 text-destructive-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-3">
              <Link href="/daily" className="w-full">
                <Button variant={isStreakSecuredToday ? "secondary" : "default"} className="w-full" size="sm">
                  {isStreakSecuredToday ? "More Challenges" : "Go to Challenges"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Today's Progress Summary */}
      {(todayStats.questions > 0 || todayStats.pomodoros > 0) && (
        <section>
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Today's Progress</span>
                </div>
                <div className="flex items-center gap-4">
                  {todayStats.questions > 0 && (
                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <strong className="text-foreground">{todayStats.questions}</strong> questions
                    </span>
                  )}
                  {todayStats.pomodoros > 0 && (
                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      <strong className="text-foreground">{todayStats.pomodoros}</strong> focus sessions
                    </span>
                  )}
                  {todayStats.points > 0 && (
                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      <strong className="text-foreground">{todayStats.points}</strong> pts
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <Separator />

      {/* For You Section - Personalized Recommendations */}
      <section>
        <h2 className="text-xl font-bold font-headline mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoadingArticles || isLoadingSubjects ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : featuredArticle && subjects && (
            <Card className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Featured Reviewer
                  </CardTitle>
                  <Badge variant="secondary" className="capitalize text-[10px]" style={{ backgroundColor: subjects.find(s => s.id === featuredArticle.subjectId)?.color || '#6c757d', color: 'white' }}>
                    {subjects.find(s => s.id === featuredArticle.subjectId)?.name || 'General'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pb-3">
                <h3 className="font-semibold text-sm">{featuredArticle.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{featuredArticle.excerpt}</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href={`/reviewer/review/${featuredArticle.slug}`} passHref className="w-full">
                  <Button size="sm" className="w-full">
                    Start Reading <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          )}

          {isLoadingTopics ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : randomTopic ? (
            <Card className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="font-headline text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" /> Practice Quiz
                </CardTitle>
                <CardDescription className="text-xs">Test your knowledge on a random topic.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow pb-3">
                <div className="bg-muted/50 p-4 rounded-xl text-center border border-dashed">
                  <p className="font-semibold">{randomTopic.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Randomized questions</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href={`/reviewer/questions?topic=${randomTopic.id}`} passHref className="w-full">
                  <Button size="sm" variant="secondary" className="w-full">
                    Take Quiz <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ) : (
            <Card className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="font-headline text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" /> Practice Quiz
                </CardTitle>
                <CardDescription className="text-xs">General knowledge practice</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow pb-3">
                <div className="bg-muted/50 p-4 rounded-xl text-center border border-dashed">
                  <p className="font-semibold">General Practice</p>
                  <p className="text-xs text-muted-foreground mt-1">Mixed questions from all topics</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/quiz" passHref className="w-full">
                  <Button size="sm" variant="secondary" className="w-full">
                    Take Quiz <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          )}
        </div>
      </section>

      {/* Activity Calendar */}
      <section>
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
              <span className="flex items-center gap-1.5 flex-wrap">
                <Flame className="h-4 w-4 text-destructive inline-block" /> = Streak day,
                <CheckCircle className="h-4 w-4 text-green-500 inline-block" /> = QOTD completed.
                Click any day for details.
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowLegend(false)}>
                <X className="h-4 w-4 text-muted-foreground"/>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <ActivityCalendar dailyProgress={user.dailyProgress} onDayClick={handleDayClick} view={view} />
      </section>
    </div>
  );
}

// Quick Action button component
function QuickAction({ href, icon, label, description, color, highlight }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn(
        "h-full hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group",
        highlight && "border-primary/50 bg-primary/5"
      )}>
        <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5">
          <div className={cn("transition-transform group-hover:scale-110", color)}>
            {icon}
          </div>
          <span className="text-xs sm:text-sm font-semibold leading-tight">{label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{description}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
