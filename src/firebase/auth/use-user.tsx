
'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const createDefaultUser = (): UserProfile => ({
    uid: 'anonymous',
    name: 'Guest User',
    avatarUrl: `https://avatar.vercel.sh/anonymous`,
    email: '',
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
    questionsAnswered: 0,
    answeredQuestionIds: [],
});

export const useUser = () => {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState<UserProfile | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();

  // Effect for managing local (anonymous) user state
  useEffect(() => {
      if (typeof window !== 'undefined') {
          try {
              const savedUser = localStorage.getItem('localUser');
              if (savedUser) {
                  setLocalUser(JSON.parse(savedUser));
              } else {
                  const defaultUser = createDefaultUser();
                  setLocalUser(defaultUser);
                  localStorage.setItem('localUser', JSON.stringify(defaultUser));
              }
          } catch (error) {
              console.error("Failed to read from local storage:", error);
              setLocalUser(createDefaultUser());
          }
      }
  }, []);

  const updateLocalUser = useCallback((updates: Partial<UserProfile>) => {
      if (typeof window !== 'undefined') {
          setLocalUser(prevUser => {
              const newUser = { ...(prevUser || createDefaultUser()), ...updates };
              localStorage.setItem('localUser', JSON.stringify(newUser));
              return newUser;
          });
      }
  }, []);

  const handleUserSnapshot = useCallback((docSnap: DocumentData, user: User) => {
    if (docSnap.exists()) {
        setFirestoreUser(docSnap.data() as UserProfile);
    } else if (user && firestore && !user.isAnonymous) {
        // Create new user profile if it doesn't exist for a NON-anonymous user
        const newUserProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || 'New User',
          avatarUrl: user.photoURL || `https://avatar.vercel.sh/${user.uid}`,
          email: user.email || '',
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
        const userRef = doc(firestore, 'users', user.uid);
        setDoc(userRef, newUserProfile).then(() => {
          setFirestoreUser(newUserProfile);
        }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: newUserProfile,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
    setIsLoading(false);
  }, [firestore]);

  // Main effect for handling auth state changes
  useEffect(() => {
    if (!auth || !firestore) return;

    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
      unsubscribeSnapshot();

      if (userAuth) {
        setFirebaseUser(userAuth);
        if (userAuth.isAnonymous) {
          setFirestoreUser(null);
          setIsLoading(false);
        } else {
          const userRef = doc(firestore, 'users', userAuth.uid);
          unsubscribeSnapshot = onSnapshot(
            userRef,
            (docSnap) => handleUserSnapshot(docSnap, userAuth),
            (error) => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
              setIsLoading(false);
            }
          );
        }
      } else {
        setFirebaseUser(null);
        setFirestoreUser(null);
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, [auth, firestore, handleUserSnapshot]);

  // Effect for handling redirect result from Google sign-in
  useEffect(() => {
    if (!auth || !firestore || isLoading) return;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return; // Exit if no redirect result.

        const googleUser = result.user;
        const userRef = doc(firestore, "users", googleUser.uid);
        const userDoc = await getDoc(userRef);

        // This logic is now simplified to not merge with a local guest user.
        if (!userDoc.exists()) {
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
             toast({
                title: `Welcome back, ${googleUser.displayName}!`,
                description: "You've successfully signed in.",
                className: "bg-blue-100 border-blue-300",
            });
        }
        router.push('/home'); // Always redirect if there was a result.
      })
      .catch((error) => {
        console.error("Error with redirect result:", error);
        toast({ variant: "destructive", title: "Sign-in Error", description: error.message || "Could not complete sign in." });
      });
  }, [auth, firestore, isLoading, toast, router]);

  const linkGoogleAccount = useCallback(async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider).catch((error) => {
        console.error("Error starting redirect sign-in:", error);
        toast({ variant: "destructive", title: "Sign-in Error", description: "Could not start the sign-in process." });
    });
  }, [auth, toast]);
  
  const user = firebaseUser?.isAnonymous ? localUser : firestoreUser;
  const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
      if (firebaseUser?.isAnonymous) {
          updateLocalUser(data);
          return Promise.resolve();
      } else if (firestore && firebaseUser) {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          return updateDoc(userRef, data).catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: data }));
            toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save your changes.' });
            throw error;
          });
      }
      return Promise.reject(new Error("User or Firestore not available"));
  }, [firebaseUser, firestore, updateLocalUser, toast]);

  return { user, isAdmin, updateUser: memoizedUpdateUser, firebaseUser, isLoading, activeTheme: user?.activeTheme || 'default', linkGoogleAccount };
};
