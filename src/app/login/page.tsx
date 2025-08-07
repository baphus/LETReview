
"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { auth } from '@/lib/firebase';
import { 
    GoogleAuthProvider, 
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    ConfirmationResult,
} from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const setupRecaptcha = () => {
    // Using window to avoid issues with SSR and RecaptchaVerifier
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
      });
    }
  };

  const onSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setupRecaptcha();
    const phoneNumber = `+${phone}`;
    const appVerifier = (window as any).recaptchaVerifier;

    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      .then((result) => {
        setConfirmationResult(result);
        setShowOtpInput(true);
        toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
      }).catch((error) => {
        console.error("SMS not sent error", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to send OTP. Please check the phone number and try again." });
      });
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationResult) {
      confirmationResult.confirm(otp)
        .then((result) => {
          const user = result.user;
          handleUserLogin(user.uid, user.displayName, user.photoURL, user.phoneNumber || user.email);
        }).catch((error) => {
          console.error("OTP verification error", error);
          toast({ variant: "destructive", title: "Invalid OTP", description: "The code you entered is incorrect." });
        });
    }
  };
  
  const handleUserLogin = (uid: string, displayName: string | null, photoURL: string | null, identifier: string | null) => {
      const userProfileKey = `userProfile_${uid}`;
      const existingUser = localStorage.getItem(userProfileKey);

      if (existingUser) {
        // User exists, just log them in
         const user = JSON.parse(existingUser);
         user.lastLogin = getTodayKey();
         localStorage.setItem(userProfileKey, JSON.stringify(user));
      } else {
        // New user, create profile
         const userProfile = {
            uid: uid,
            name: displayName || identifier || 'Anonymous',
            avatarUrl: photoURL || `https://placehold.co/100x100.png`,
            examDate: undefined,
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
         // Clear any existing custom questions for a new user
        localStorage.removeItem(`customQuestions_${uid}`);
      }

       localStorage.setItem('currentUser', uid);
      router.push("/home");
      toast({
          title: "Successfully signed in!",
          description: "Welcome to MyReviewer!",
          className: "bg-primary border-primary text-primary-foreground",
      });
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      handleUserLogin(result.user.uid, result.user.displayName, result.user.photoURL, result.user.email);
    } catch (error: any) {
      console.error("Google Sign-In Error: ", error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message,
      });
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          handleUserLogin(userCredential.user.uid, userCredential.user.displayName, userCredential.user.photoURL, userCredential.user.email);
      } catch (error: any) {
          toast({ variant: "destructive", title: "Sign-up failed", description: error.message });
      }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          handleUserLogin(userCredential.user.uid, userCredential.user.displayName, userCredential.user.photoURL, userCredential.user.email);
      } catch (error: any) {
          toast({ variant: "destructive", title: "Sign-in failed", description: error.message });
      }
  };

  return (
    <div className="container mx-auto p-4 max-w-sm flex items-center justify-center h-full">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Welcome to MyReviewer</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google" className="mt-6">
               <Button className="w-full" onClick={handleGoogleSignIn}>
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-67.4 64.8C297.6 112.3 274.7 104 248 104c-57.8 0-104.5 47.2-104.5 104.8s46.7 104.8 104.5 104.8c63.8 0 94.9-50.8 98.2-74.3H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                Sign in with Google
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-6">
              <form>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                   <div className="flex gap-2">
                      <Button onClick={handleEmailSignIn} className="w-full">Sign In</Button>
                      <Button onClick={handleEmailSignUp} variant="secondary" className="w-full">Sign Up</Button>
                   </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="phone" className="mt-6">
                <div id="recaptcha-container"></div>
                {!showOtpInput ? (
                    <form onSubmit={onSignInSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" type="tel" placeholder="1234567890" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Include country code without the '+'. E.g., 1 for USA.</p>
                        </div>
                        <Button type="submit" className="w-full">Send OTP</Button>
                    </form>
                ) : (
                    <form onSubmit={verifyOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input id="otp" type="text" placeholder="Enter OTP" required value={otp} onChange={(e) => setOtp(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full">Verify OTP</Button>
                    </form>
                )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    