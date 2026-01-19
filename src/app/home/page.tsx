
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Award, Shield, Edit, Check, Lock, CheckCircle, Lightbulb, HelpCircle, Clock, XCircle } from "lucide-react";
import Image from "next/image";
import { streakPets, getQuestionOfTheDay, achievementPets, rarePets } from "@/lib/data";
import type { PetProfile, QuizQuestion } from "@/lib/types";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const allPets: PetProfile[] = [
    ...streakPets,
    ...achievementPets,
    ...rarePets
];

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const { toast } = useToast();
  const { user, updateUser } = useUser();
  
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  
  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    getQuestionOfTheDay().then(setQuestionOfTheDay);
  }, []);

  const checkAchievements = useCallback(async () => {
    if (!user) return;

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
        updateUser(updatedUser);
    }
  }, [user, toast, updateUser]);

  useEffect(() => {
    if (user) {
        checkAchievements();
    }
  }, [user, checkAchievements]);
  
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

  const todaysProgress = user?.dailyProgress?.[todayKey] || { pointsEarned: 0, pomodorosCompleted: 0, qotdCompleted: false, questionsAnswered: 0, challengesCompleted: [] };

  const handlePetNameEdit = (originalName: string) => {
    if (!user) return;
    setEditingPet(originalName);
    setNewPetName(user.petNames[originalName] || originalName);
  };
  
  const handlePetNameSave = async (originalName: string) => {
    if (user && newPetName.trim()) {
        updateUser({
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
    if (!isToday(day) && !isFuture(day)) {
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
        <h2 className="text-xl font-bold font-headline mb-4">Today's Activity</h2>
         <Card>
            <CardContent className="p-4 flex items-center justify-around flex-wrap gap-4">
                <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                        <Gem className="h-5 w-5 text-accent" />
                        <span className="text-lg font-bold">{todaysProgress.pointsEarned || 0}</span>
                    </TooltipTrigger>
                    <TooltipContent><p>Points Earned Today</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                        <Clock className="h-5 w-5 text-destructive" />
                        <span className="text-lg font-bold">{todaysProgress.pomodorosCompleted || 0}</span>
                    </TooltipTrigger>
                    <TooltipContent><p>Pomodoros Completed</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <span className="text-lg font-bold">{todaysProgress.questionsAnswered || 0}</span>
                    </TooltipTrigger>
                    <TooltipContent><p>Questions Answered Today</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-bold">{todaysProgress.challengesCompleted?.length || 0}</span>
                    </TooltipTrigger>
                    <TooltipContent><p>Challenges Completed</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger className="p-2 rounded-md hover:bg-muted">
                        {todaysProgress.qotdCompleted ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                             <XCircle className="h-6 w-6 text-muted-foreground" />
                        )}
                    </TooltipTrigger>
                    <TooltipContent><p>Question of the Day {todaysProgress.qotdCompleted ? 'Answered' : 'Pending'}</p></TooltipContent>
                </Tooltip>
            </CardContent>
        </Card>
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

       <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Activity Calendar</h2>
        <ActivityCalendar dailyProgress={user.dailyProgress} onDayClick={handleDayClick} />
       </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection ({unlockedPetsCount}/{allPets.length})</h2>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {allPets.map((pet) => (
                <PetDisplay key={pet.name} pet={pet} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

    
