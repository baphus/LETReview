
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, LogOut, Settings, Edit, Check } from "lucide-react";
import Image from "next/image";
import { pets } from "@/lib/data";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState({
    name: "LET Aspirant",
    email: "aspirant@example.com",
    avatarUrl: "https://placehold.co/100x100",
    points: 125,
    streak: 6,
    completedSessions: 4,
    petsUnlocked: 2,
  });
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);

  useEffect(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setNewName(JSON.parse(savedUser).name);
    }
  }, []);

  const saveUser = (updatedUser: typeof user) => {
    localStorage.setItem("userProfile", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };
  
  const handleNameSave = () => {
    const updatedUser = { ...user, name: newName };
    saveUser(updatedUser);
    setEditingName(false);
    toast({ title: "Success", description: "Your name has been updated."});
  };

  const unlockedPets = pets.slice(0, user.petsUnlocked);

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
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-2xl font-bold font-headline h-auto p-0 border-0" />
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
            <p className="text-muted-foreground">{user.email}</p>
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
              <CardTitle className="text-sm font-medium">Pets Unlocked</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.petsUnlocked}</div>
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
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection</h2>
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
         <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
         </Button>
         <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => {
            localStorage.removeItem("userProfile");
            window.location.reload();
         }}>
            <LogOut className="mr-2 h-4 w-4" />
            Reset Data
         </Button>
      </section>
    </div>
  );
}
