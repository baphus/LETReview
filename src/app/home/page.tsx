
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, Shield, Edit, Check, HelpCircle, Lock, CalendarCheck2, CheckCircle, Lightbulb } from "lucide-react";
import Image from "next/image";
import { pets as streakPets, getQuestionOfTheDay, getQuestionForDate } from "@/lib/data";
import type { QuizQuestion, DailyProgress, PetProfile } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
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
}

const allPets: PetProfile[] = [
    ...streakPets,
    { name: "Draco", unlock_criteria: "Purchase in Store", streak_req: 999, image: "https://placehold.co/100x100.png", hint: "fire breathing" },
];

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysProgress = user?.dailyProgress?.[todayKey] || {};

  const loadUser = useCallback(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
        let parsedUser: UserProfile = JSON.parse(savedUser);

        // Initialize missing fields for backward compatibility
        if (!parsedUser.petNames) parsedUser.petNames = {};
        if (!parsedUser.unlockedPets) parsedUser.unlockedPets = [];
        if (!parsedUser.dailyProgress) parsedUser.dailyProgress = {};
        if (!parsedUser.highestQuizStreak) parsedUser.highestQuizStreak = 0;
        
        const lastLoginDate = new Date(parsedUser.lastLogin || todayKey);
        const yesterday = startOfYesterday();

        // Check if last login was before yesterday to break the streak
        if (isBefore(lastLoginDate, yesterday)) {
            if (parsedUser.streak > 0) {
                 toast({
                    variant: 'destructive',
                    title: 'Streak Lost!',
                    description: `You missed a day and lost your ${parsedUser.streak}-day streak.`,
                });
                parsedUser.streak = 0;
            }
        }
        
        parsedUser.lastLogin = todayKey;

        localStorage.setItem("userProfile", JSON.stringify(parsedUser));
        setUser(parsedUser);
    } else {
        router.push('/login');
    }
  }, [router, todayKey, toast]);


  useEffect(() => {
    loadUser();
    setQuestionOfTheDay(getQuestionOfTheDay());
    
    const handleFocus = () => loadUser();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus); // Listen for storage changes from other tabs/pages

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
    };
  }, [loadUser, pathname]);


  if (!user) {
    return null; // Or a loading spinner
  }
  
  const handlePetNameEdit = (originalName: string) => {
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
    // Only set the date if it's today or in the past
    if (isBefore(day, addDays(startOfDay(new Date()), 1))) {
      setSelectedDate(day);
    }
  };

  const unlockedStreakPetsCount = streakPets.filter(p => user.highestStreak >= p.streak_req).length;
  const unlockedStorePetsCount = user.unlockedPets.length;
  const unlockedPetsCount = unlockedStreakPetsCount + unlockedStorePetsCount;
  
  const calendarCompletedDays = Object.entries(user.dailyProgress || {}).reduce((acc, [date, progress]) => {
    if ((progress.challengesCompleted && progress.challengesCompleted.length > 0) || progress.qotdCompleted) {
        acc.push(new Date(date));
    }
    return acc;
  }, [] as Date[]);

  const streakDays = Array.from({ length: user.streak }, (_, i) => addDays(new Date(), -i));

  const streakAndCompletedDays = streakDays.filter(streakDay => 
    calendarCompletedDays.some(completedDay => isSameDay(streakDay, completedDay))
  );
  
  // Filter out the days that are in both from the individual arrays
  const pureStreakDays = streakDays.filter(streakDay => 
    !streakAndCompletedDays.some(bothDay => isSameDay(streakDay, bothDay))
  );
  const pureCompletedDays = calendarCompletedDays.filter(completedDay => 
    !streakAndCompletedDays.some(bothDay => isSameDay(completedDay, bothDay))
  );

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
                    <CardDescription>Days you completed a challenge or the QOTD are marked in green. Your current streak is marked in red. Keep your streak going to unlock new pets! Click a day to see details.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                   <Calendar
                        mode="multiple"
                        selected={pureCompletedDays}
                        onDayClick={handleDayClick}
                        disabled={{ after: new Date() }}
                        className="rounded-md border"
                        modifiers={{
                           streak: pureStreakDays,
                           'streak-and-completed': streakAndCompletedDays,
                        }}
                        modifiersClassNames={{
                            streak: 'day-streak',
                            'streak-and-completed': 'day-streak-and-completed'
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
                const isUnlockedByStreak = user.highestStreak >= pet.streak_req;
                const isUnlockedByPurchase = user.unlockedPets.includes(pet.name);
                const isUnlocked = isUnlockedByStreak || isUnlockedByPurchase;

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
                                isUnlocked ? "animate-bob" : "grayscale opacity-50"
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
                         <p className="text-sm text-muted-foreground">Hint: "{pet.hint}"</p>
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
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-sm font-medium">{user.petNames[pet.name] || pet.name}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handlePetNameEdit(pet.name)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    ) : (
                        <p className="text-sm font-medium mt-1">???</p>
                    )}
                     <Badge variant="secondary" className="mt-1">
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
}

    
