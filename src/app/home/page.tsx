
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, Shield, Edit, Check, HelpCircle, Lock, CalendarCheck2, CheckCircle, Lightbulb, TrendingUp } from "lucide-react";
import Image from "next/image";
import { pets as streakPets, getQuestionOfTheDay, achievementPets, rarePets, loadUserProfile, getActiveBank, saveUserProfile } from "@/lib/data";
import type { QuizQuestion, DailyProgress, PetProfile, UserProfile, QuestionBank } from "@/lib/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogHeader, DialogFooter, DialogTitle, DialogContent, DialogDescription } from "@/components/ui/dialog";

const allPets: PetProfile[] = [
    ...streakPets,
    ...achievementPets,
    ...rarePets
];

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeBank, setActiveBank] = useState<QuestionBank | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showHomeGuide, setShowHomeGuide] = useState(false);
  
  const todayKey = useMemo(() => getTodayKey(), []);

  const saveUserAndBank = useCallback((updatedProfile: UserProfile, updatedBank: QuestionBank) => {
    const bankIndex = updatedProfile.banks.findIndex(b => b.id === updatedBank.id);
    if (bankIndex !== -1) {
      updatedProfile.banks[bankIndex] = updatedBank;
      saveUserProfile(updatedProfile);
      setUser(updatedProfile);
      setActiveBank(updatedBank);
    }
  }, []);
  
  const checkAchievements = useCallback((userProfile: UserProfile, bank: QuestionBank): { updatedProfile: UserProfile, updatedBank: QuestionBank } => {
    let updatedBank = { ...bank };
    let statsUpdated = false;

    if (bank.streak > (bank.highestStreak || 0)) {
        updatedBank.highestStreak = bank.streak;
        statsUpdated = true;
    }
    
    const pomodoroState = JSON.parse(localStorage.getItem("pomodoroState") || "{}");
    if (pomodoroState.highestQuizStreak > (bank.highestQuizStreak || 0)) {
        updatedBank.highestQuizStreak = pomodoroState.highestQuizStreak;
        statsUpdated = true;
    }
    // Also update completed sessions from the timer state if it's not reflected yet.
    if (pomodoroState.sessions > (bank.completedSessions || 0)) {
        updatedBank.completedSessions = pomodoroState.sessions;
        statsUpdated = true;
    }

    achievementPets.forEach(pet => {
      let isAlreadyUnlocked = updatedBank.unlockedPets.includes(pet.name);
      if (isAlreadyUnlocked) return;

      let isUnlockedNow = false;
      if (pet.unlock_criteria.includes('Pomodoro')) {
        isUnlockedNow = (updatedBank.completedSessions || 0) >= (pet.unlock_value || 0);
      } else if (pet.unlock_criteria.includes('quiz streak')) {
        isUnlockedNow = (updatedBank.highestQuizStreak || 0) >= (pet.unlock_value || 0);
      }

      if (isUnlockedNow) {
        updatedBank.unlockedPets = [...new Set([...updatedBank.unlockedPets, pet.name])];
        statsUpdated = true;
        toast({
          title: "New Pet Unlocked!",
          description: `You've unlocked ${pet.name} for your achievements!`,
          className: "bg-primary border-primary text-primary-foreground"
        });
      }
    });

    if (statsUpdated) {
        const bankIndex = userProfile.banks.findIndex(b => b.id === bank.id);
        if (bankIndex !== -1) {
            userProfile.banks[bankIndex] = updatedBank;
        }
    }
    return { updatedProfile: userProfile, updatedBank };
  }, [toast]);


  const loadUser = useCallback(() => {
    const profile = loadUserProfile();
    if (profile) {
      let bank = profile.banks.find(b => b.id === profile.activeBankId) || profile.banks[0];

      if (!bank.petNames) bank.petNames = {};
      if (!bank.unlockedPets) bank.unlockedPets = [];
      if (!bank.dailyProgress) bank.dailyProgress = {};
      if (!bank.highestQuizStreak) bank.highestQuizStreak = 0;
      
      const lastLoginDate = profile.lastLogin ? startOfDay(new Date(profile.lastLogin)) : startOfDay(new Date());
      const today = startOfDay(new Date());

      if (isBefore(lastLoginDate, today)) {
          const yesterday = startOfYesterday();
          const lastChallengeDate = bank.lastChallengeDate ? startOfDay(new Date(bank.lastChallengeDate)) : null;

          if (bank.streak > 0 && lastChallengeDate && isBefore(lastChallengeDate, yesterday)) {
               toast({
                  variant: 'destructive',
                  title: 'Streak Lost!',
                  description: `You missed a day and lost your ${bank.streak}-day streak.`,
              });
              bank.streak = 0;
          }
      }
      
      profile.lastLogin = todayKey;

      const { updatedProfile, updatedBank } = checkAchievements(profile, bank);
      saveUserProfile(updatedProfile);
      setUser(updatedProfile);
      setActiveBank(updatedBank);

      const hasSeenGuide = localStorage.getItem('hasSeenHomeGuide');
      if (!hasSeenGuide) {
          setShowHomeGuide(true);
      }
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
    if (!activeBank?.dailyProgress) return [];
    return Object.entries(activeBank.dailyProgress).reduce((acc, [dateStr, progress]) => {
        if (progress.qotdCompleted) {
            // Ensure correct parsing of YYYY-MM-DD
            const date = new Date(dateStr + 'T00:00:00');
            acc.push(date);
        }
        return acc;
    }, [] as Date[]);
}, [activeBank?.dailyProgress]);

  const streakDays = useMemo(() => {
    if (!activeBank) return [];
    // Start from today if streak is secured, otherwise yesterday
    const startDate = activeBank.lastChallengeDate === todayKey ? startOfDay(new Date()) : startOfYesterday();
    return Array.from({ length: activeBank.streak || 0 }, (_, i) => addDays(startDate, -i));
}, [activeBank, todayKey]);
  
  const isStreakSecuredToday = useMemo(() => {
    if (!activeBank) return false;
    return (activeBank.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
  }, [activeBank, todayKey]);
  
  const unlockedPetsCount = useMemo(() => {
    if (!activeBank) return 0;
    return allPets.filter(pet => {
      if (!pet.unlock_criteria) return false;
      if (pet.unlock_criteria.includes('streak') && !pet.unlock_criteria.includes('quiz')) {
        return (activeBank.highestStreak || 0) >= pet.streak_req;
      } else if (pet.unlock_criteria.includes('Purchase')) {
        return activeBank.unlockedPets.includes(pet.name);
      } else if (pet.unlock_criteria.includes('Pomodoro')) {
        return activeBank.unlockedPets.includes(pet.name);
      } else if (pet.unlock_criteria.includes('quiz streak')) {
        return activeBank.unlockedPets.includes(pet.name);
      }
      return false;
    }).length;
  }, [activeBank]);

  const todaysProgress = activeBank?.dailyProgress?.[todayKey] || { pointsEarned: 0, pomodorosCompleted: 0, qotdCompleted: false };

  const handlePetNameEdit = (originalName: string) => {
    if (!activeBank) return;
    setEditingPet(originalName);
    setNewPetName(activeBank.petNames[originalName] || originalName);
  };
  
  const handlePetNameSave = (originalName: string) => {
    if (user && activeBank && newPetName.trim()) {
        const updatedPetNames = { ...activeBank.petNames, [originalName]: newPetName.trim() };
        const updatedBank = { ...activeBank, petNames: updatedPetNames };
        saveUserAndBank(user, updatedBank);
        setEditingPet(null);
        toast({
          title: "Pet renamed!",
          description: `Your pet is now named ${newPetName.trim()}.`,
          className: "bg-primary border-primary text-primary-foreground"
        });
    }
  }

  const handleDayClick = (day: Date) => {
    // Prevent opening dialog for today's date
    if (isSameDay(day, startOfDay(new Date()))) {
      return;
    }
    if (isBefore(day, startOfDay(new Date()))) {
      setSelectedDate(day);
    }
  };

  const handleCloseGuide = () => {
    localStorage.setItem('hasSeenHomeGuide', 'true');
    setShowHomeGuide(false);
  }
  
  if (!user || !activeBank) {
    return null;
  }
  
  const PetDisplay = ({ pet }: { pet: PetProfile }) => {
    let isUnlocked = false;

    if (pet.unlock_criteria.includes('streak') && !pet.unlock_criteria.includes('quiz')) {
        isUnlocked = (activeBank.highestStreak || 0) >= pet.streak_req;
    } else if (pet.unlock_criteria.includes('Purchase')) {
        isUnlocked = activeBank.unlockedPets.includes(pet.name);
    } else if (pet.unlock_criteria.includes('Pomodoro')) {
        isUnlocked = activeBank.unlockedPets.includes(pet.name);
    } else if (pet.unlock_criteria.includes('quiz streak')) {
        isUnlocked = activeBank.unlockedPets.includes(pet.name);
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
                "rounded-full bg-muted p-2 transition-all duration-300",
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
                  <p className="text-sm font-medium">{activeBank.petNames[pet.name] || pet.name}</p>
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
       <Dialog open={showHomeGuide} onOpenChange={setShowHomeGuide}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Welcome to Your Dashboard!</DialogTitle>
                <DialogDescription asChild>
                  <div className="text-base text-muted-foreground pt-4 space-y-4">
                    <div>This is your central hub for tracking progress and staying motivated.</div>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong className="text-primary">Your Stats:</strong> Monitor your streaks and total points for the current question bank.</li>
                      <li><strong className="text-primary">Activity Calendar:</strong> Visualize your consistency and daily activity.</li>
                      <li><strong className="text-primary">Pet Collection:</strong> See all the cute companions you've unlocked!</li>
                       <li><strong className="text-primary">Question Banks:</strong> Head to the Profile page to switch between different question banks or create new ones!</li>
                    </ul>
                    <div>Explore around and start your journey to success!</div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleCloseGuide} className="w-full">Let's Get Started!</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <DayDetailDialog
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        userProgress={selectedDate ? activeBank.dailyProgress[format(selectedDate, 'yyyy-MM-dd')] : undefined}
      />
      <header className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold font-headline">{activeBank.name}</h1>
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

      {activeBank.examDate && <Countdown examDate={new Date(activeBank.examDate)} />}
      
      {!isStreakSecuredToday && (
         <Card className="mb-6 bg-blue-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-center text-blue-400 font-headline flex items-center justify-center gap-2">
                <Flame className="h-6 w-6"/> Secure Your Streak!
            </CardTitle>
            <CardDescription className="text-center text-blue-300">You haven't completed a daily challenge yet. Finish one to maintain your streak.</CardDescription>
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
            {questionOfTheDay && (
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
                     {todaysProgress.qotdCompleted && (
                        <CardFooter>
                            <Badge variant="secondary" className="text-green-600 border-green-300">
                                <CheckCircle className="h-4 w-4 mr-1"/> Answered
                            </Badge>
                        </CardFooter>
                    )}
                </Card>
            )}
        </section>

      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="col-span-2 md:col-span-2 bg-gradient-to-tr from-destructive/20 to-destructive/10 border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-destructive">Daily Streak</CardTitle>
                <Flame className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{activeBank.streak} days</div>
                </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-2 bg-gradient-to-tr from-primary/20 to-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-primary">Total Points</CardTitle>
                <Gem className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                <div className="text-3xl font-bold">{activeBank.points}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Daily Streak</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{activeBank.highestStreak}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Quiz Streak</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{activeBank.highestQuizStreak}</div>
                </CardContent>
            </Card>
        </div>
      </section>

       <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Activity Calendar</h2>
        <Card>
            <CardHeader>
                <CardDescription>Your current streak is marked in blue, and completed Questions of the Day have a ✅. Click a past day to see details.</CardDescription>
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
                        qotd_completed: 'day-qotd_completed'
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
                 <div
                    key={pet.name}
                >
                    <PetDisplay pet={pet} />
                </div>
              ))}
            </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
