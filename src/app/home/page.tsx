
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, Shield, Edit, Check, HelpCircle, Lock, CalendarCheck2, CheckCircle, Lightbulb, TrendingUp } from "lucide-react";
import Image from "next/image";
import { pets as streakPets, getQuestionOfTheDay, achievementPets, rarePets } from "@/lib/data";
import type { QuizQuestion, DailyProgress, PetProfile } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Countdown from "@/components/Countdown";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format, isBefore, startOfYesterday, startOfDay, isSameDay } from "date-fns";
import { DayDetailDialog } from "@/components/DayDetailDialog";


interface UserProfile {
    name: string;
    avatarUrl: string;
    examDate?: string;
    points: number;
    streak: number;
    highestStreak: number;
    highestQuizStreak: number;
    completedSessions: number;
    petNames: Record<string, string>;
    unlockedPets: string[];
    dailyProgress: Record<string, DailyProgress>;
    lastLogin: string;
    lastChallengeDate?: string;
}

const allPets: PetProfile[] = [
    ...streakPets,
    ...achievementPets,
    ...rarePets
];

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const todayKey = useMemo(() => getTodayKey(), []);
  
  const checkAchievements = useCallback((user: UserProfile): UserProfile => {
    let updatedUser = { ...user };
    let statsUpdated = false;

    if (user.streak > (user.highestStreak || 0)) {
        updatedUser.highestStreak = user.streak;
        statsUpdated = true;
    }
    
    const pomodoroState = JSON.parse(localStorage.getItem("pomodoroState") || "{}");
    if (pomodoroState.highestQuizStreak > (user.highestQuizStreak || 0)) {
        updatedUser.highestQuizStreak = pomodoroState.highestQuizStreak;
        statsUpdated = true;
    }

    achievementPets.forEach(pet => {
      let isAlreadyUnlocked = updatedUser.unlockedPets.includes(pet.name);
      if (isAlreadyUnlocked) return;

      let isUnlockedNow = false;
      if (pet.unlock_criteria.includes('Pomodoro')) {
        isUnlockedNow = (updatedUser.completedSessions || 0) >= (pet.unlock_value || 0);
      } else if (pet.unlock_criteria.includes('quiz streak')) {
        isUnlockedNow = (updatedUser.highestQuizStreak || 0) >= (pet.unlock_value || 0);
      }

      if (isUnlockedNow) {
        updatedUser.unlockedPets = [...new Set([...updatedUser.unlockedPets, pet.name])];
        statsUpdated = true;
        toast({
          title: "New Pet Unlocked!",
          description: `You've unlocked ${pet.name} for your achievements!`,
          className: "bg-green-100 border-green-300"
        });
      }
    });

    if (statsUpdated) {
      localStorage.setItem("userProfile", JSON.stringify(updatedUser));
    }
    return updatedUser;
  }, [toast]);


  const loadUser = useCallback(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
        let parsedUser: UserProfile = JSON.parse(savedUser);

        if (!parsedUser.petNames) parsedUser.petNames = {};
        if (!parsedUser.unlockedPets) parsedUser.unlockedPets = [];
        if (!parsedUser.dailyProgress) parsedUser.dailyProgress = {};
        if (!parsedUser.highestQuizStreak) parsedUser.highestQuizStreak = 0;
        
        const lastLoginDate = parsedUser.lastLogin ? startOfDay(new Date(parsedUser.lastLogin)) : startOfDay(new Date());
        const today = startOfDay(new Date());

        if (isBefore(lastLoginDate, today)) {
            const yesterday = startOfYesterday();
            const lastChallengeDate = parsedUser.lastChallengeDate ? startOfDay(new Date(parsedUser.lastChallengeDate)) : null;

            if (parsedUser.streak > 0 && lastChallengeDate && isBefore(lastChallengeDate, yesterday)) {
                 toast({
                    variant: 'destructive',
                    title: 'Streak Lost!',
                    description: `You missed a day and lost your ${parsedUser.streak}-day streak.`,
                });
                parsedUser.streak = 0;
            }
        }
        
        parsedUser.lastLogin = todayKey;

        const userWithAchievements = checkAchievements(parsedUser);
        localStorage.setItem("userProfile", JSON.stringify(userWithAchievements));
        setUser(userWithAchievements);
    } else {
        router.push('/login');
    }
  }, [router, todayKey, toast, checkAchievements]);


  useEffect(() => {
    loadUser();
    setQuestionOfTheDay(getQuestionOfTheDay());
    
    const handleFocus = () => loadUser();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
    };
  }, [loadUser]);
  
  const qotdCompletedDays = useMemo(() => {
    if (!user?.dailyProgress) return [];
    return Object.entries(user.dailyProgress).reduce((acc, [dateStr, progress]) => {
        if (progress.qotdCompleted) {
            const date = new Date(dateStr);
            const localDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            acc.push(localDate);
        }
        return acc;
    }, [] as Date[]);
  }, [user?.dailyProgress]);

  const streakDays = useMemo(() => {
    if (!user) return [];
    const yesterday = startOfYesterday();
    return Array.from({ length: user.streak || 0 }, (_, i) => addDays(yesterday, -i));
  }, [user]);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!user) return false;
    return user.lastChallengeDate === todayKey;
  }, [user, todayKey]);
  
  const unlockedPetsCount = useMemo(() => {
      if (!user) return 0;
      return allPets.filter(pet => {
          let isUnlocked = false;
          if (pet.unlock_criteria.includes('streak')) {
            isUnlocked = (user.highestStreak || 0) >= pet.streak_req;
          } else if (pet.unlock_criteria.includes('Purchase')) {
            isUnlocked = user.unlockedPets.includes(pet.name);
          } else if (pet.unlock_criteria.includes('Pomodoro')) {
            isUnlocked = (user.completedSessions || 0) >= (pet.unlock_value || 0);
          } else if (pet.unlock_criteria.includes('quiz streak')) {
            isUnlocked = (user.highestQuizStreak || 0) >= (pet.unlock_value || 0);
          }
          return isUnlocked;
      }).length;
  }, [user]);

  const todaysProgress = user?.dailyProgress?.[todayKey] || {};

  const handlePetNameEdit = (originalName: string) => {
    if (!user) return;
    setEditingPet(originalName);
    setNewPetName(user.petNames[originalName] || originalName);
  };
  
  const handlePetNameSave = (originalName: string) => {
    if (user && newPetName.trim()) {
        const updatedPetNames = { ...user.petNames, [originalName]: newPetName.trim() };
        const updatedUser = { ...user, petNames: updatedPetNames };
        localStorage.setItem("userProfile", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setEditingPet(null);
        toast({
          title: "Pet renamed!",
          description: `Your pet is now named ${newPetName.trim()}.`,
          className: "bg-green-100 border-green-300"
        });
    }
  }

  const handleDayClick = (day: Date) => {
    if (isBefore(day, addDays(startOfDay(new Date()), 1))) {
      setSelectedDate(day);
    }
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <DayDetailDialog
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        userProgress={selectedDate ? user.dailyProgress[format(selectedDate, 'yyyy-MM-dd')] : undefined}
      />
      <header className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold font-headline">Home</h1>
            <p className="text-muted-foreground">Welcome back, {user.name}!</p>
        </div>
         <Link href="/profile">
            <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>
                    <User className="h-6 w-6" />
                </AvatarFallback>
            </Avatar>
        </Link>
      </header>

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

      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="col-span-2 md:col-span-2 bg-destructive/10 border-destructive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-destructive">Daily Streak</CardTitle>
                <Flame className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{user.streak} days</div>
                </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-2 bg-accent/10 border-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-accent">Total Points</CardTitle>
                <Gem className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{user.points}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Daily Streak</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{user.highestStreak}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Quiz Streak</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{user.highestQuizStreak}</div>
                </CardContent>
            </Card>
        </div>
      </section>

       <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Today's Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarCheck2 className="h-6 w-6 text-primary" />
                        <span>Daily Activity Calendar</span>
                    </CardTitle>
                    <CardDescription>Your current streak is marked with a flame (🔥) and completed Questions of the Day are marked with a check (✅). Click a day to see details.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                   <Calendar
                        mode="multiple"
                        onDayClick={handleDayClick}
                        disabled={{ after: new Date() }}
                        className="rounded-md border"
                        modifiers={{
                           streak: streakDays,
                           qotd_completed: qotdCompletedDays
                        }}
                        modifiersClassNames={{
                            streak: 'day-streak',
                            qotd_completed: 'day-qotd-completed',
                        }}
                    />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Points Earned Today</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold flex items-center gap-2"><Gem className="h-5 w-5 text-accent" />{todaysProgress.pointsEarned || 0}</p>
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pomodoros Today</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-muted-foreground" />{todaysProgress.pomodorosCompleted || 0}</p>
                </CardContent>
             </Card>
        </div>
       </section>

        <section className="mt-8">
            <h2 className="text-xl font-bold font-headline mb-4">Question of the Day</h2>
            {questionOfTheDay && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="text-lg">{questionOfTheDay.question}</span>
                            {todaysProgress.qotdCompleted ? (
                                <Badge variant="secondary" className="text-green-600 border-green-300">
                                    <CheckCircle className="h-4 w-4 mr-1"/> Answered
                                </Badge>
                            ) : (
                                <Badge variant="outline">
                                    <HelpCircle className="h-4 w-4 mr-1"/> Pending
                                </Badge>
                            )}
                        </CardTitle>
                        
                    </CardHeader>
                    {!todaysProgress.qotdCompleted && (
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
            )}
        </section>


      <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection ({unlockedPetsCount}/{allPets.length})</h2>
        <Card>
          <CardContent className="p-4">
            <TooltipProvider>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {allPets.map((pet) => {
                let isUnlocked = false;
                if (pet.unlock_criteria.includes('streak') && !pet.unlock_criteria.includes('quiz')) {
                  isUnlocked = (user.highestStreak || 0) >= pet.streak_req;
                } else if (pet.unlock_criteria.includes('Purchase')) {
                  isUnlocked = user.unlockedPets.includes(pet.name);
                } else if (pet.unlock_criteria.includes('Pomodoro')) {
                  isUnlocked = (user.completedSessions || 0) >= (pet.unlock_value || 0);
                } else if (pet.unlock_criteria.includes('quiz streak')) {
                  isUnlocked = (user.highestQuizStreak || 0) >= (pet.unlock_value || 0);
                }

                return (
                  <div key={pet.name} className="flex flex-col items-center text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="relative">
                           <Image
                            src={pet.image}
                            alt={pet.name}
                            width={80}
                            height={80}
                            className={cn(
                                "rounded-full bg-muted p-2",
                                isUnlocked ? "animate-bob" : "grayscale opacity-50 blur-sm"
                            )}
                            data-ai-hint={pet.hint}
                          />
                          {!isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Lock className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                         <p className="text-sm text-muted-foreground">Unlock: {pet.unlock_criteria}</p>
                      </TooltipContent>
                    </Tooltip>
                    {isUnlocked ? (
                       editingPet === pet.name ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={newPetName}
                            onChange={(e) => setNewPetName(e.target.value)}
                            className="text-sm h-7 w-20"
                            onKeyDown={(e) => e.key === 'Enter' && handlePetNameSave(pet.name)}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePetNameSave(pet.name)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <p className="text-sm font-medium">{user.petNames[pet.name] || pet.name}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handlePetNameEdit(pet.name)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    ) : (
                        <p className="text-sm font-medium mt-1">???</p>
                    )}
                     <Badge variant="secondary" className="mt-1 text-center text-wrap h-auto">
                        {pet.unlock_criteria}
                    </Badge>
                  </div>
                )
            })}
            </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>
    </div>
  );

    