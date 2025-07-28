
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Settings, Edit, Check, Camera, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import { Slider } from "@/components/ui/slider";


interface UserProfile {
    name: string;
    avatarUrl: string;
    examDate?: string;
    passingScore?: number;
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
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [passingScore, setPassingScore] = useState(85);

  useEffect(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setNewName(parsedUser.name);
      if (parsedUser.examDate) {
        setExamDate(new Date(parsedUser.examDate));
      }
      setPassingScore(parsedUser.passingScore || 85);
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
        toast({
          title: "Success",
          description: "Your name has been updated.",
          className: "bg-green-100 border-green-300"
        });
    }
  };

  const handleSettingsSave = () => {
     if (user) {
        const updatedUser = { 
            ...user, 
            examDate: examDate ? examDate.toISOString() : undefined,
            passingScore: passingScore,
        };
        saveUser(updatedUser);
        toast({
          title: "Success",
          description: "Your settings have been saved.",
          className: "bg-green-100 border-green-300"
        });
    }
  }

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
      <header className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">Profile & Settings</h1>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
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
                <div className="text-center w-full max-w-xs">
                    {editingName ? (
                    <div className="flex items-center gap-2">
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-xl font-bold font-headline h-auto p-1" onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                        <Button size="icon" variant="ghost" onClick={handleNameSave}>
                        <Check className="h-5 w-5 text-green-500" />
                        </Button>
                    </div>
                    ) : (
                    <div className="flex items-center justify-center gap-2">
                        <h2 className="text-xl font-bold font-headline">{user.name}</h2>
                        <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                        <Edit className="h-5 w-5" />
                        </Button>
                    </div>
                    )}
                </div>
            </div>
            
        </CardContent>
      </Card>
      
       <Card className="mt-6">
            <CardHeader>
                <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="exam-date">Exam Date</Label>
                    <DatePicker date={examDate} setDate={setExamDate} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="passing-score">Challenge Passing Score: <span className="font-bold text-primary">{passingScore}%</span></Label>
                    <Slider
                        id="passing-score"
                        min={50}
                        max={100}
                        step={5}
                        value={[passingScore]}
                        onValueChange={(value) => setPassingScore(value[0])}
                    />
                </div>
                 <Button className="w-full" onClick={handleSettingsSave}>
                    Save Settings
                </Button>
            </CardContent>
        </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About LETReview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This app is a review companion designed to help aspiring educators prepare for the Licensure Examination for Teachers (LET) in the Philippines.
          </p>
          <br />
          <p className="text-sm text-muted-foreground italic">
            This app is lovingly dedicated to my girlfriend, Trisha, an aspiring teacher who inspired this project.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">This action is irreversible. All your progress, points, and pets will be permanently deleted.</p>
            <Button variant="destructive" className="w-full" onClick={handleResetData}>
                <LogOut className="mr-2 h-4 w-4" />
                Reset All Data
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
