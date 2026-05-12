
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Edit, Check, Lock, HelpCircle, X, BookOpen, Brain, Heart, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import Image from "next/image";
import { streakPets, achievementPets, rarePets } from "@/lib/data";
import type { Reviewer, Topic, PetProfile, Subject, QuizQuestion } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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
import { collection, query, where } from "firebase/firestore";
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

  const { data: articles, isLoading: isLoadingArticles } = useCollection<Reviewer>(useMemoFirebase(() => firestore ? query(collection(firestore, 'reviewers'), where('status', '==', 'published')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? collection(firestore, 'topics') : null, [firestore]));
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<QuizQuestion>(useMemoFirebase(() => firestore ? collection(firestore, 'questions') : null, [firestore]));

  useEffect(() => {
    if (articles && articles.length > 0 && !featuredArticle) {
      setFeaturedArticle(articles[Math.floor(Math.random() * articles.length)]);
    }
  }, [articles, featuredArticle]);

  useEffect(() => {
    if (topics && topics.length > 0 && questions && questions.length > 0 && !randomTopic) {
      const topicIdsWithQuestions = new Set<string>();
      questions.forEach(q => {
        q.topicIds?.forEach(topicId => {
          topicIdsWithQuestions.add(topicId);
        });
      });

      const topicsWithQuestions = topics.filter(t => topicIdsWithQuestions.has(t.id));

      if (topicsWithQuestions.length > 0) {
        setRandomTopic(topicsWithQuestions[Math.floor(Math.random() * topicsWithQuestions.length)]);
      }
    }
  }, [topics, questions, randomTopic]);
  
  const todayKey = useMemo(() => getTodayKey(), []);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!user) return false;
    return (user.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
  }, [user, todayKey]);

  const handleDayClick = (day: Date) => {
    if (isToday(day) || !isFuture(day)) {
      setSelectedDate(day);
    }
  };
  
  if (!user) {
    return null; // Or show loading spinner
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <>
      <div className="container mx-auto max-w-4xl">
        <DayDetailDialog
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          userProgress={selectedDate ? user.dailyProgress[format(selectedDate, 'yyyy-MM-dd')] : undefined}
        />
        {firebaseUser?.isAnonymous && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 !text-amber-800" />
            <AlertTitle>You are browsing as a guest</AlertTitle>
            <AlertDescription>
              Your progress is only saved on this browser. 
              <Link href="/register" className="font-bold underline ml-1 hover:text-amber-900">Create an account</Link> to save your data.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground mb-6">Welcome back, {user.name}!</p>
        
        {/* Centerpiece: Virtual Pet Hero */}
        <VirtualPetHero />

        {user.examDate && <Countdown examDate={new Date(user.examDate)} />}

        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <QuestionOfTheDay className="m-0 h-full flex flex-col" />
          </div>
          <div className="md:col-span-1 flex flex-col gap-6">
            {isStreakSecuredToday ? (
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2 text-xl">
                            <Flame className="h-5 w-5 text-destructive" /> Streak Secured!
                        </CardTitle>
                        <CardDescription>Your streak is safe for today. Well done!</CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="flex justify-around items-center pt-2 border-t">
                            {weekDays.map((day, i) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const hasActivity = (user.dailyProgress?.[dayKey]?.challengesCompleted?.length || 0) > 0;
                                const isDayToday = isToday(day);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-medium text-muted-foreground">{format(day, 'E')[0]}</span>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                            hasActivity ? "bg-destructive" : "bg-muted",
                                            isDayToday && "ring-2 ring-primary"
                                        )}>
                                            {hasActivity && <Flame className="h-4 w-4 text-destructive-foreground" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="mt-auto">
                        <Link href="/daily" className="w-full">
                            <Button variant="secondary" className="w-full">More Challenges</Button>
                        </Link>
                    </CardFooter>
                </Card>
            ) : (
                <Card className="flex flex-col h-full border-primary">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2 text-xl text-primary">
                            <Flame className="h-5 w-5" /> Secure Streak
                        </CardTitle>
                        <CardDescription>Complete a daily challenge.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="flex justify-around items-center pt-2 border-t">
                            {weekDays.map((day, i) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const hasActivity = (user.dailyProgress?.[dayKey]?.challengesCompleted?.length || 0) > 0;
                                const isDayToday = isToday(day);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-medium text-muted-foreground">{format(day, 'E')[0]}</span>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                            hasActivity ? "bg-destructive" : "bg-muted",
                                            isDayToday && "ring-2 ring-primary"
                                        )}>
                                            {hasActivity && <Flame className="h-4 w-4 text-destructive-foreground" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="mt-auto">
                        <Link href="/daily" className="w-full">
                            <Button className="w-full">Go to Challenges</Button>
                        </Link>
                    </CardFooter>
                </Card>
            )}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2 text-xl">
                        <BookOpen className="h-5 w-5 text-primary" /> Browse Reviewers
                    </CardTitle>
                    <CardDescription>Read articles and practice with flashcards.</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                    <Link href="/reviewer/review" className="w-full">
                        <Button variant="outline" className="w-full">Browse</Button>
                    </Link>
                </CardFooter>
            </Card>
          </div>
        </div>

        <section className="my-6">
            <h2 className="text-xl font-bold font-headline mb-4">For You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoadingArticles || isLoadingSubjects ? <Skeleton className="h-56 w-full" /> : featuredArticle && subjects && (
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg flex items-center gap-2"><BookOpen/> Featured Reviewer</CardTitle>
                            <Badge variant="secondary" className="capitalize w-fit" style={{ backgroundColor: subjects.find(s => s.id === featuredArticle.subjectId)?.color || '#6c757d', color: 'white' }}>
                                {subjects.find(s => s.id === featuredArticle.subjectId)?.name || 'General'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <h3 className="font-semibold">{featuredArticle.title}</h3>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{featuredArticle.excerpt}</p>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/reviewer/review/${featuredArticle.slug}`} passHref className="w-full">
                                <Button className="w-full">Start Reading</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                )}

                {isLoadingTopics || isLoadingQuestions ? <Skeleton className="h-56 w-full" /> : (
                    randomTopic ? (
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg flex items-center gap-2"><Brain/> Practice Quiz</CardTitle>
                                <CardDescription>Test your knowledge on a random topic.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="bg-muted p-4 rounded-lg text-center">
                                    <p className="font-semibold text-lg">{randomTopic.name}</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/reviewer/questions?topic=${randomTopic.id}`} passHref className="w-full">
                                    <Button className="w-full">Take Quiz</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ) : (
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg flex items-center gap-2"><Brain/> Practice Quiz</CardTitle>
                                <CardDescription>Test your knowledge with questions from all topics.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="bg-muted p-4 rounded-lg text-center">
                                    <p className="font-semibold text-lg">General Practice</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/quiz`} passHref className="w-full">
                                    <Button className="w-full">Take Quiz</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    )
                )}
            </div>
        </section>

        <section className="my-8">
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
                        Streak days are marked with <Flame className="h-4 w-4 text-destructive inline-block" />, and completed Questions of the Day with a <CheckCircle className="h-4 w-4 text-green-500 inline-block" />. Click a day for details.
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowLegend(false)}>
                        <X className="h-4 w-4 text-muted-foreground"/>
                        <span className="sr-only">Hide Legend</span>
                    </Button>
                    </AlertDescription>
                </Alert>
            )}
            <ActivityCalendar dailyProgress={user.dailyProgress} onDayClick={handleDayClick} view={view} />
        </section>
      </div>
    </>
  );
}
