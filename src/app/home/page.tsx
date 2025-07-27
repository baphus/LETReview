
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, Shield, Edit, Check } from "lucide-react";
import Image from "next/image";
import { pets } from "@/lib/data";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


interface UserProfile {
    name: string;
    avatarUrl: string;
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
        toast({ title: "Pet renamed!", description: `Your pet is now named ${newPetName.trim()}.`});
    }
  }

  const unlockedPets = pets.filter(p => user.highestStreak >= p.streak_req);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-headline">Welcome back,</h1>
          <p className="text-3xl font-bold text-primary">{user.name}!</p>
        </div>
        <Link href="/profile" passHref>
          <Avatar className="h-16 w-16 border-4 border-primary cursor-pointer">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>
      
      <Separator className="my-6" />

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
              <div className="text-2xl font-bold">{user.highestStreak} days</div>
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
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection ({unlockedPets.length}/{pets.length})</h2>
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {unlockedPets.length > 0 ? unlockedPets.map((pet) => (
                    <div key={pet.name} className="flex flex-col items-center text-center">
                      <Image 
                          src={pet.image} 
                          alt={pet.name} 
                          width={80} 
                          height={80} 
                          className="rounded-full bg-muted p-2 animate-bob"
                          data-ai-hint={pet.hint}
                      />
                      {editingPet === pet.name ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input 
                            value={newPetName} 
                            onChange={(e) => setNewPetName(e.target.value)} 
                            className="text-sm h-7 w-20"
                            onKeyDown={(e) => e.key === 'Enter' && handlePetNameSave(pet.name)}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePetNameSave(pet.name)}>
                            <Check className="h-4 w-4 text-green-500"/>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-sm font-medium">{user.petNames[pet.name] || pet.name}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handlePetNameEdit(pet.name)}>
                            <Edit className="h-3 w-3"/>
                          </Button>
                        </div>
                      )}
                    </div>
                )) : <p className="col-span-full text-muted-foreground text-center">No pets unlocked yet. Keep up your streak!</p>}
                </div>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}
