
'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export const useUser = () => {
  const { toast } = useToast();
  const [firestoreUser, setFirestoreUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  // This effect handles the core authentication state logic.
  useEffect(() => {
    if (!auth || !firestore) return;

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        // User is signed in (either through redirect, or already logged in)
        setFirebaseUser(userAuth);
        const userRef = doc(firestore, 'users', userAuth.uid);
        
        // Listen for real-time updates to the user's profile
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setFirestoreUser(docSnap.data() as UserProfile);
          }
          // The creation of the user doc is handled by getRedirectResult
          setIsLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
          setIsLoading(false);
        });
        
        return () => unsubscribeSnapshot();
      } else {
        // User is not signed in, sign them in anonymously.
        setFirebaseUser(null);
        setFirestoreUser(null);
        setIsLoading(true); // Start loading while we sign in anonymously
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  // This effect specifically handles the result from a Google Sign-In redirect.
  useEffect(() => {
    if (!auth || !firestore) return;

    // This is a one-time check that runs when the component mounts
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) {
            // No redirect result, this was a normal page load.
            return;
        }

        setIsLoading(true);
        const googleUser = result.user;
        const userRef = doc(firestore, "users", googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // This is a brand new user, create their profile.
          const newUserProfile: UserProfile = {
            uid: googleUser.uid,
            name: googleUser.displayName || 'New User',
            avatarUrl: googleUser.photoURL || `https://avatar.vercel.sh/${googleUser.uid}`,
            email: googleUser.email || '',
            points: 0,
            streak: 0,
            highestStreak: 0,
            highestQuizStreak: 0,
            completedSessions: 0,
            unlockedThemes: ['default'],
            activeTheme: 'default',
            unlockedPets: [],
            petNames: {},
            dailyProgress: {},
            lastLogin: getTodayKey(),
            passingScore: 85,
            createdAt: serverTimestamp(),
            questionsAnswered: 0,
            answeredQuestionIds: [],
            hasCompletedOnboarding: false,
          };
          await setDoc(userRef, newUserProfile);
          toast({
              title: "Welcome!",
              description: "Your account has been created.",
              className: "bg-green-100 border-green-300",
          });
        } else {
            // This is a returning user.
            toast({
              title: `Welcome back, ${googleUser.displayName || 'User'}!`,
              description: "You've successfully signed in.",
              className: "bg-blue-100 border-blue-300",
            });
        }

        // CRITICAL: Always redirect to the dashboard after processing the result.
        router.push('/home');

      }).catch((error) => {
        console.error("Error with redirect result:", error);
        toast({ variant: "destructive", title: "Sign-in Error", description: "Could not complete sign in." });
        setIsLoading(false);
      });
  }, [auth, firestore, router, toast]);

  const linkGoogleAccount = useCallback(async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    // Use signInWithRedirect for a robust flow in all environments.
    await signInWithRedirect(auth, provider).catch((error) => {
      console.error("Error starting redirect sign-in:", error);
      toast({ variant: "destructive", title: "Sign-in Error", description: "Could not start the sign-in process." });
    });
  }, [auth, toast]);

  // If the firebase user is anonymous, there's no firestore user, so we return null.
  // The UI can then decide to show a "Guest" state.
  const user = firebaseUser?.isAnonymous ? null : firestoreUser;
  const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
    if (firebaseUser && !firebaseUser.isAnonymous && firestore) {
      const userRef = doc(firestore, "users", firebaseUser.uid);
      return setDoc(userRef, data, { merge: true }).catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: data }));
        toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save your changes.' });
        throw error;
      });
    }
    // Return a rejected promise if trying to update an anonymous user.
    return Promise.reject(new Error("Cannot update anonymous or non-existent user."));
  }, [firebaseUser, firestore, toast]);

  return { 
    user, 
    isAdmin, 
    updateUser: memoizedUpdateUser, 
    firebaseUser, 
    isLoading, 
    activeTheme: user?.activeTheme || 'default', 
    linkGoogleAccount 
  };
};
