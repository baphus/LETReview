"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useUser } from "@/firebase/auth/use-user";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isLoading } = useUser();

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/home");
    }
  }, [user, isLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useUser hook will handle redirection after successful login
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  if (isLoading || user) {
    // Render a loading state or nothing while checking auth state or redirecting
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-sm flex items-center justify-center h-full">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Welcome to LETReview</CardTitle>
          <CardDescription>Let's get you set up for success.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-4">
            Sign in to save your progress and compete with friends.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleGoogleSignIn}>
            Sign in with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
