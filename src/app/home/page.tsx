
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Edit, Check, Lock, HelpCircle, X, BookOpen, Brain, Heart, CheckCircle } from "lucide-react";
import Image from "next/image";
import { streakPets, achievementPets, rarePets } from "@/lib/data";
import type { Reviewer, Topic, PetProfile, Subject } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionOfTheDay } from "@/components/QuestionOfTheDay";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "The secret of getting ahead is getting started.",
  "The expert in anything was once a beginner.",
  "Don't watch the clock; do what it does. Keep going.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Your only limit is your mind.",
  "Strive for progress, not perfection.",
  "Every accomplishment starts with the decision to try.",
  "The future depends on what you do today.",
  "A little progress each day adds up to big results.",
  "Consistency is the key to success.",
];

export default function HomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showLegend, setShowLegend] = useState(false);

  const [featuredArticle, setFeaturedArticle] = useState<Reviewer | null>(null);
  const [randomTopic, setRandomTopic] = useState<Topic | null>(null);
  const [companion, setCompanion] = useState<PetProfile | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState('');

  const { data: articles, isLoading: isLoadingArticles } = useCollection<Reviewer>(useMemoFirebase(() => firestore ? query(collection(firestore, 'reviewers'), where('status', '==', 'published')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? collection(firestore, 'topics') : null, [firestore]));
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));
  const allPets: PetProfile[] = useMemo(() => [...streakPets, ...achievementPets, ...rarePets], []);

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

  useEffect(() => {
    if (user) {
      let petToShow: PetProfile | undefined;
      // 1. Check for active pet
      if (user.activePet) {
        petToShow = allPets.find(p => p.name === user.activePet);
      }
      // 2. If no active pet, find a random unlocked one
      else {
        const unlockedPets = allPets.filter(pet => {
            if (!pet.unlock_criteria) return false;
            if (pet.unlock_criteria.includes('streak') && !pet.unlock_criteria.includes('quiz')) {
                return (user.highestStreak || 0) >= pet.streak_req;
            } else if (pet.unlock_criteria.includes('Purchase')) {
                return user.unlockedPets?.includes(pet.name);
            } else if (pet.unlock_criteria.includes('Pomodoro')) {
                return (user.completedSessions || 0) >= (pet.unlock_value || 0);
            } else if (pet.unlock_criteria.includes('quiz streak')) {
                return (user.highestQuizStreak || 0) >= (pet.unlock_value || 0);
            }
            return false;
        });

        if (unlockedPets.length > 0) {
          petToShow = unlockedPets[Math.floor(Math.random() * unlockedPets.length)];
        }
      }
      
      // 3. Fallback to Rocky
      if (!petToShow) {
        petToShow = allPets.find(p => p.name === 'Rocky');
      }

      setCompanion(petToShow || null);
    }
  }, [user, allPets]);

  useEffect(() => {
    // This will run only on the client-side to avoid hydration mismatch
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);
  
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

        <QuestionOfTheDay />

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

                {isLoadingTopics ? <Skeleton className="h-56 w-full" /> : (
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

        {companion && motivationalQuote && (
            <section className="my-6">
                <Card className="bg-accent/10 border-accent/20">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Image src={companion.image} alt={companion.name} width={80} height={80} className="bg-background rounded-full p-2 animate-bob" data-ai-hint={companion.hint} />
                        <div>
                            <CardTitle className="font-headline">{user.petNames[companion.name] || companion.name} says...</CardTitle>
                            <CardDescription className="text-foreground/80 italic">"{motivationalQuote}"</CardDescription>
                            <Link href="/profile#pet-collection" passHref>
                                <Button variant="link" className="p-0 h-auto mt-1">Change Companion</Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            </section>
        )}

        <Separator className="my-6" />
      </div>

       <section className="mt-8">
        <div className="md:container md:mx-auto md:max-w-4xl">
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
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
                <Alert className="mb-4 mx-4 md:mx-0">
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
        </div>
        <div className="md:container md:mx-auto md:max-w-4xl">
            <ActivityCalendar dailyProgress={user.dailyProgress} onDayClick={handleDayClick} view={view} />
        </div>
       </section>
    </>
  );
}
