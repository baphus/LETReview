
"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/datepicker";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://placehold.co/100x100");
  const [examDate, setExamDate] = useState<Date>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please enter your name to continue.",
      });
      return;
    }

    const userProfile = {
      name: name.trim(),
      avatarUrl,
      examDate: examDate?.toISOString(),
      points: 0,
      streak: 0,
      highestStreak: 0,
      highestQuizStreak: 0,
      completedSessions: 0,
      petsUnlocked: 0,
      petNames: {},
      passingScore: 85,
      unlockedThemes: ['default'],
      activeTheme: 'default',
      unlockedPets: [],
      completedChallenges: [],
      dailyProgress: {},
      lastLogin: getTodayKey(),
    };

    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    router.push("/home");
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="container mx-auto p-4 max-w-sm flex items-center justify-center h-full">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Welcome to LETReview</CardTitle>
          <CardDescription>Let's get you set up for success.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
             <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary">
                  <AvatarImage src={avatarUrl} alt={name} data-ai-hint="profile picture" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="exam-date">Exam Date (Optional)</Label>
            <DatePicker date={examDate} setDate={setExamDate} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin}>
            Start Reviewing
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    