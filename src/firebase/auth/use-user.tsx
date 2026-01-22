
'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously, linkWithPopup } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
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
  const auth = useAuth();
  const firestore = useFirestore();
  
  const justLoggedInRef = useRef(false);


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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, firestore, handleUserSnapshot]);
  
  // This effect handles redirection after a successful login.
  useEffect(() => {
      if (!isLoading && firebaseUser && !firebaseUser.isAnonymous && justLoggedInRef.current) {
          // This was a fresh login, redirect to home.
          justLoggedInRef.current = false; // Reset the flag
          router.push('/home');
      }
  }, [isLoading, firebaseUser, router]);


  const linkGoogleAccount = useCallback(async () => {
    if (!auth || !firebaseUser) return;
    const provider = new GoogleAuthProvider();
    try {
        if (firebaseUser.isAnonymous) {
            await linkWithPopup(firebaseUser, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
        justLoggedInRef.current = true;
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            toast({
                title: 'Sign-in cancelled',
                description: 'You closed the sign-in window before completing the sign-in process.',
            });
        } else if (error.code === 'auth/popup-blocked') {
            toast({
                variant: 'destructive',
                title: 'Popup blocked',
                description: 'Please allow popups for this site to sign in.',
            });
        } else if (error.code === 'auth/credential-already-in-use') {
            toast({
                variant: 'destructive',
                title: 'Account Already Exists',
                description: 'This Google account is already linked to another user. Please sign in with your existing account.',
            });
        } else {
            console.error("Error with popup sign-in:", error);
            toast({ variant: "destructive", title: "Sign-in Error", description: error.message || "Could not complete sign in." });
        }
    }
  }, [auth, firebaseUser, toast]);

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
