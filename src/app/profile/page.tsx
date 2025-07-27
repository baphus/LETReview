
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, LogOut, Settings, Edit, Check, Shield } from "lucide-react";
import Image from "next/image";
import { pets } from "@/lib/data";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


interface UserProfile {
    name: string;
    email: string;
    avatarUrl: string;
    points: number;
    streak: number;
    highestStreak: number;
    completedSessions: number;
    petsUnlocked: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setNewName(parsedUser.name);
    } else {
        router.push('/login');
    }
  }, [router]);

  const saveUser = (updatedUser: UserProfile) => {
    localStorage.setItem("userProfile", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };
  
  const handleNameSave = () => {
    if (user) {
        const updatedUser = { ...user, name: newName };
        saveUser(updatedUser);
        setEditingName(false);
        toast({ title: "Success", description: "Your name has been updated."});
    }
  };

  const handleResetData = () => {
      localStorage.clear();
      window.location.href = '/login';
  }

  if (!user) {
    return null; // Or a loading spinner
  }

  const unlockedPets = pets.filter(p => user.highestStreak >= p.streak_req);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex flex-col items-center gap-4 mb-6">
        <Avatar className="h-24 w-24 border-4 border-primary">
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
          <AvatarFallback>
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-2xl font-bold font-headline h-auto p-0 border-0" onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                <Button size="icon" variant="ghost" onClick={handleNameSave}>
                  <Check className="h-5 w-5 text-green-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-headline">{user.name}</h1>
                <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                  <Edit className="h-5 w-5" />
                </Button>
              </div>
            )}
        </div>
      </header>
      
      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Study Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {unlockedPets.length > 0 ? unlockedPets.map((pet) => (
            <div key={pet.name} className="flex flex-col items-center text-center">
              <Image 
                src={pet.image} 
                alt={pet.name} 
                width={80} 
                height={80} 
                className="rounded-full bg-muted p-2"
                data-ai-hint={pet.hint}
              />
              <p className="text-sm font-medium mt-1">{pet.name}</p>
            </div>
          )) : <p className="col-span-full text-muted-foreground">No pets unlocked yet. Keep up your streak!</p>}
        </div>
      </section>

      <Separator className="my-6" />

      <section className="space-y-2">
         <Button variant="ghost" className="w-full justify-start" disabled>
            <Settings className="mr-2 h-4 w-4" />
            Settings
         </Button>
         <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleResetData}>
            <LogOut className="mr-2 h-4 w-4" />
            Reset All Data
         </Button>
      </section>
    </div>
  );
}
