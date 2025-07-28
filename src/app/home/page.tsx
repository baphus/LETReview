
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, Shield, Edit, Check, HelpCircle, Lock } from "lucide-react";
import Image from "next/image";
import { pets, getQuestionOfTheDay } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Countdown from "@/components/Countdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


interface UserProfile {
    name: string;
    avatarUrl: string;
    examDate?: string;
    points: number;
    streak: number;
    highestStreak: number;
    completedSessions: number;
    petNames: Record<string, string>;
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [questionOfTheDay, setQuestionOfTheDay] = useState<QuizQuestion | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
       if (!parsedUser.petNames) {
        parsedUser.petNames = {};
      }
      setUser(parsedUser);
    } else {
      router.push('/login');
    }
    
    setQuestionOfTheDay(getQuestionOfTheDay());

     // This will run when the component mounts and also when the user navigates back to this page.
    const handleFocus = () => {
      const savedUser = localStorage.getItem("userProfile");
       if (savedUser) {
          setUser(JSON.parse(savedUser));
       }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

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

  const unlockedPetsCount = pets.filter(p => user.highestStreak >= p.streak_req).length;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
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
        <h2 className="text-xl font-bold font-headline mb-4">Question of the Day</h2>
        {questionOfTheDay && (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <HelpCircle className="text-primary h-5 w-5" />
                        <span>{questionOfTheDay.question}</span>
                    </CardTitle>
                    <CardDescription>Think you know the answer? Answer it in the Daily section for 5 points!</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/daily">
                        <Button className="w-full">Go to Daily Challenges</Button>
                    </Link>
                </CardContent>
            </Card>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Gem className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.points}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.streak} days</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Streak</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.highestStreak}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pomodoro Sessions</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.completedSessions}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection ({unlockedPetsCount}/{pets.length})</h2>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {pets.map((pet) => {
                const isUnlocked = user.highestStreak >= pet.streak_req;
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
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
