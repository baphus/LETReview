

'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const publicPaths = ['/', '/login', '/register', '/privacy-policy', '/terms-of-service', '/privacy', '/terms'];

export const useUser = () => {
  const { toast } = useToast();
  const [firestoreUser, setFirestoreUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const handleUserSnapshot = useCallback((docSnap: DocumentData, user: User) => {
    if (docSnap.exists()) {
        setFirestoreUser(docSnap.data() as UserProfile);
    } else if (user && firestore) {
        // This case is for users who signed up with Google but their doc creation might have been interrupted.
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

  // Handle redirect results from Google Sign-In
   useEffect(() => {
    if (!auth || !firestore) return;

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User signed in. The onAuthStateChanged listener below will handle
          // setting the user state and creating the document if needed.
          toast({
            title: "Signed In Successfully",
            description: `Welcome back, ${result.user.displayName}!`,
            className: "bg-green-100 border-green-300",
          });
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
        toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description: error.message,
        });
      });
  }, [auth, firestore, toast]);


  useEffect(() => {
    if (!auth || !firestore) return;

    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
      unsubscribeSnapshot();
      
      if (userAuth) {
        setFirebaseUser(userAuth);
        const userRef = doc(firestore, 'users', userAuth.uid);
        unsubscribeSnapshot = onSnapshot(
          userRef,
          (docSnap) => handleUserSnapshot(docSnap, userAuth),
          (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
            setIsLoading(false);
          }
        );
      } else {
        setFirebaseUser(null);
        setFirestoreUser(null);
        setIsLoading(false);
        if (!publicPaths.includes(pathname)) {
            router.push('/login');
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, [auth, firestore, pathname, router, handleUserSnapshot, toast]);
  
  const user = firestoreUser;
  const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
      if (firestore && firebaseUser) {
          if (firebaseUser.isAnonymous) {
            toast({
                title: "Guest Mode",
                description: "Your changes can't be saved. Please create an account to save your progress.",
                className: "bg-amber-100 border-amber-200"
            });
            return Promise.resolve();
          }
          const userRef = doc(firestore, "users", firebaseUser.uid);
          return updateDoc(userRef, data).catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: data }));
            toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save your changes.' });
            throw error;
          });
      }
      return Promise.reject(new Error("User or Firestore not available"));
  }, [firebaseUser, firestore, toast]);

  return { user, isAdmin, updateUser: memoizedUpdateUser, firebaseUser, isLoading, activeTheme: user?.activeTheme || 'default' };
};
