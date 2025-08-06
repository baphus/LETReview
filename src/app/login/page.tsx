
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
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from "firebase/auth";

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://placehold.co/100x100");
  const [examDate, setExamDate] = useState<Date>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userProfileKey = `userProfile_${firebaseUser.uid}`;
      const existingUser = localStorage.getItem(userProfileKey);

      if (existingUser) {
        // User exists, just log them in
         const user = JSON.parse(existingUser);
         user.lastLogin = getTodayKey();
         localStorage.setItem(userProfileKey, JSON.stringify(user));
      } else {
        // New user, create profile
         const userProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || name.trim() || 'Anonymous',
            avatarUrl: firebaseUser.photoURL || avatarUrl,
            examDate: examDate?.toISOString(),
            points: 0,
            streak: 0,
            highestStreak: 0,
            highestQuizStreak: 0,
            completedSessions: 0,
            petNames: {},
            passingScore: 75,
            unlockedThemes: ['default'],
            activeTheme: 'default',
            themeMode: 'dark', // Default to dark mode for new users
            unlockedPets: [],
            dailyProgress: {},
            lastLogin: getTodayKey(),
          };
        localStorage.setItem(userProfileKey, JSON.stringify(userProfile));
        localStorage.setItem('currentUser', firebaseUser.uid);
         // Clear any existing custom questions for a new user
        localStorage.removeItem(`customQuestions_${firebaseUser.uid}`);
      }

       localStorage.setItem('currentUser', firebaseUser.uid);
      router.push("/home");
      toast({
          title: "Successfully signed in!",
          description: "Welcome to MyReviewer!",
          className: "bg-primary border-primary text-primary-foreground",
      });

    } catch (error: any) {
      console.error("Google Sign-In Error: ", error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message,
      });
    }
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
          <CardTitle className="font-headline text-2xl">Welcome to MyReviewer</CardTitle>
          <CardDescription>Let's get you set up for success.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button className="w-full" onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-67.4 64.8C297.6 112.3 274.7 104 248 104c-57.8 0-104.5 47.2-104.5 104.8s46.7 104.8 104.5 104.8c63.8 0 94.9-50.8 98.2-74.3H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
