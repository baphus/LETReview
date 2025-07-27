
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Settings, Edit, Check, Camera } from "lucide-react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


interface UserProfile {
    name: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (user && newName.trim()) {
        const updatedUser = { ...user, name: newName.trim() };
        saveUser(updatedUser);
        setEditingName(false);
        toast({ title: "Success", description: "Your name has been updated."});
    }
  };

  const handleResetData = () => {
      localStorage.clear();
      router.push('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please select an image smaller than 2MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const avatarUrl = event.target?.result as string;
        const updatedUser = { ...user, avatarUrl };
        saveUser(updatedUser);
      };
      reader.readAsDataURL(file);
    }
  };


  if (!user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex flex-col items-center gap-4 mb-6">
        <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
            <AvatarFallback>
                <User className="h-12 w-12" />
            </AvatarFallback>
            </Avatar>
            <Button 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                onClick={handleAvatarClick}
            >
                <Camera className="h-4 w-4" />
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange} 
            />
        </div>
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
