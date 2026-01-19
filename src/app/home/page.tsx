
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Award, Shield, Edit, Check, Lock, CheckCircle, Lightbulb, HelpCircle, X } from "lucide-react";
import Image from "next/image";
import { streakPets, getQuestionOfTheDay, achievementPets, rarePets } from "@/lib/data";
import type { PetProfile, QuizQuestion } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Countdown from "@/components/Countdown";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format, isBefore, startOfDay, isSameDay } from "date-fns";
import { DayDetailDialog } from "@/components/DayDetailDialog";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

const allPets: PetProfile[] = [
    ...streakPets,
    ...achievementPets,
    ...rarePets
];

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  const [showCalendarHelp, setShowCalendarHelp] = useState(true);
  
  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    getQuestionOfTheDay().then(setQuestionOfTheDay);
  }, []);

  const checkAchievements = useCallback(async () => {
    if (!user || !firestore) return;

    let updatedUser: Partial<typeof user> = {};
    let statsUpdated = false;

    if (user.streak > (user.highestStreak || 0)) {
        updatedUser.highestStreak = user.streak;
        statsUpdated = true;
    }
    
    let newPetsUnlocked: string[] = [];
    achievementPets.forEach(pet => {
      let isAlreadyUnlocked = user.unlockedPets.includes(pet.name);
      if (isAlreadyUnlocked) return;

      let isUnlockedNow = false;
      if (pet.unlock_criteria.includes('Pomodoro')) {
        isUnlockedNow = (user.completedSessions || 0) >= (pet.unlock_value || 0);
      } else if (pet.unlock_criteria.includes('quiz streak')) {
        isUnlockedNow = (user.highestQuizStreak || 0) >= (pet.unlock_value || 0);
      }

      if (isUnlockedNow) {
        newPetsUnlocked.push(pet.name);
        statsUpdated = true;
        toast({
          title: "New Pet Unlocked!",
          description: `You've unlocked ${pet.name} for your achievements!`,
          className: "bg-green-100 border-green-300"
        });
      }
    });

    if (newPetsUnlocked.length > 0) {
      updatedUser.unlockedPets = [...new Set([...user.unlockedPets, ...newPetsUnlocked])];
    }

    if (statsUpdated) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, updatedUser);
    }
  }, [user, firestore, toast]);

  useEffect(() => {
    if (user) {
        checkAchievements();
    }
  }, [user, checkAchievements]);
  
  const qotdCompletedDays = useMemo(() => {
    if (!user?.dailyProgress) return [];
    return Object.entries(user.dailyProgress).reduce((acc, [dateStr, progress]) => {
      if (progress.qotdCompleted) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        acc.push(date);
      }
      return acc;
    }, [] as Date[]);
  }, [user?.dailyProgress]);

  const streakDays = useMemo(() => {
    if (!user) return [];
    const startDate = user.lastChallengeDate === todayKey ? startOfDay(new Date()) : startOfDay(new Date(user.lastChallengeDate || new Date()));
    return Array.from({ length: user.streak || 0 }, (_, i) => addDays(startDate, -i));
}, [user, todayKey]);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!user) return false;
    return (user.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
  }, [user, todayKey]);
  
  const unlockedPetsCount = useMemo(() => {
    if (!user) return 0;
    return allPets.filter(pet => {
      if (!pet.unlock_criteria) return false;
      if (pet.unlock_criteria.includes('streak') && !pet.unlock_criteria.includes('quiz')) {
        return (user.highestStreak || 0) >= pet.streak_req;
      } else if (pet.unlock_criteria.includes('Purchase')) {
        return user.unlockedPets.includes(pet.name);
      } else if (pet.unlock_criteria.includes('Pomodoro')) {
        return (user.completedSessions || 0) >= (pet.unlock_value || 0);
      } else if (pet.unlock_criteria.includes('quiz streak')) {
        return (user.highestQuizStreak || 0) >= (pet.unlock_value || 0);
      }
      return false;
    }).length;
  }, [user]);

  const todaysProgress = user?.dailyProgress?.[todayKey] || { pointsEarned: 0, pomodorosCompleted: 0, qotdCompleted: false };

  const handlePetNameEdit = (originalName: string) => {
    if (!user) return;
    setEditingPet(originalName);
    setNewPetName(user.petNames[originalName] || originalName);
  };
  
  const handlePetNameSave = async (originalName: string) => {
    if (user && firestore && newPetName.trim()) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, {
            [`petNames.${originalName}`]: newPetName.trim()
        });
        setEditingPet(null);
        toast({
          title: "Pet renamed!",
          description: `Your pet is now named ${newPetName.trim()}.`,
          className: "bg-green-100 border-green-300"
        });
    }
  }

  const handleDayClick = (day: Date) => {
    if (isSameDay(day, startOfDay(new Date()))) return;
    if (isBefore(day, startOfDay(new Date()))) {
      setSelectedDate(day);
    }
  };
  
  if (!user) {
    return null; // Or show loading spinner
  }
  
  const PetDisplay = ({ pet }: { pet: PetProfile }) => {
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

       <section className="mb-6">
        <h2 className="text-xl font-bold font-headline mb-4">Today's Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">QOTD</CardTitle>
                </CardHeader>
                <CardContent>
                    {todaysProgress.qotdCompleted ? (
                        <Badge variant="secondary" className="text-green-600 border-green-300">
                            <CheckCircle className="h-4 w-4 mr-1"/> Answered
                        </Badge>
                    ) : (
                         <Badge variant="outline">
                             Pending
                        </Badge>
                    )}
                </CardContent>
             </Card>
        </div>
       </section>

        <section className="mb-6">
            <h2 className="text-xl font-bold font-headline mb-4">Question of the Day</h2>
            {questionOfTheDay ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="text-lg">{questionOfTheDay.question}</span>
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
            ) : (<Card><CardContent><p>Loading question...</p></CardContent></Card>)}
        </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Your Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="bg-destructive/10 border-destructive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-destructive">Daily Streak</CardTitle>
                <Flame className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{user.streak} days</div>
                </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-accent">Total Points</CardTitle>
                <Gem className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{user.points}</div>
                </CardContent>
            </Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questions Answered</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{user.questionsAnswered || 0}</div>
                </CardContent>
            </Card>
        </div>
      </section>

       <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Activity Calendar</h2>
        <Card>
            <CardHeader>
              {showCalendarHelp ? (
                <div className="flex justify-between items-start gap-4">
                  <CardDescription>
                    Your current streak is marked with a flame (🔥) and completed Questions of the Day are marked with a check (✅). Click a past day to see details.
                  </CardDescription>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 -mt-1 -mr-2" onClick={() => setShowCalendarHelp(false)}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Hide help</span>
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end -my-2 -mr-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowCalendarHelp(true)}>
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Show Calendar Legend</span>
                  </Button>
                </div>
              )}
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
       </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection ({unlockedPetsCount}/{allPets.length})</h2>
        <Card>
          <CardContent className="p-4">
            <TooltipProvider>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {allPets.map((pet) => (
                <PetDisplay key={pet.name} pet={pet} />
              ))}
            </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>
    </div>
  );
