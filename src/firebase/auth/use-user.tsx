

'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');
const GUEST_PROFILE_STORAGE_KEY = 'letreview-guest-profile';

const publicPaths = ['/', '/login', '/register', '/privacy-policy', '/terms-of-service', '/privacy', '/terms'];

const createDefaultGuestProfile = (uid: string): UserProfile => ({
    uid: uid,
    name: 'Guest User',
    avatarUrl: `https://avatar.vercel.sh/${uid}`,
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
    createdAt: new Date().toISOString(), // Use ISO string for local
    questionsAnswered: 0,
    answeredQuestionIds: [],
    hasCompletedOnboarding: false,
});


export const useUser = () => {
  const { toast } = useToast();
  const [firestoreUser, setFirestoreUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  
  useEffect(() => {
    if (!auth || !firestore) {
        setIsLoading(false);
        return;
    }

    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (userAuth) => {
      unsubscribeSnapshot(); 
      
      if (userAuth) {
        setFirebaseUser(userAuth);

        if (userAuth.isAnonymous) {
            // Handle guest user - purely local state
            let guestProfile: UserProfile;
            const savedGuestProfile = localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);

            if (savedGuestProfile) {
                guestProfile = JSON.parse(savedGuestProfile);
                // Make sure the UID matches, in case they signed in as a different guest
                if (guestProfile.uid !== userAuth.uid) {
                    guestProfile = createDefaultGuestProfile(userAuth.uid);
                    localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(guestProfile));
                }
            } else {
                guestProfile = createDefaultGuestProfile(userAuth.uid);
                localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(guestProfile));
            }
            setFirestoreUser(guestProfile);
            setIsLoading(false);
        } else {
            // Handle real user with Firestore
            const userRef = doc(firestore, 'users', userAuth.uid);
            unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                setFirestoreUser(docSnap.data() as UserProfile);
                setIsLoading(false);
              } else {
                const newUserProfile: UserProfile = {
                  uid: userAuth.uid,
                  name: userAuth.displayName || 'New User',
                  avatarUrl: userAuth.photoURL || `https://avatar.vercel.sh/${userAuth.uid}`,
                  email: userAuth.email || '',
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
                setDoc(userRef, newUserProfile).then(() => {
                  setFirestoreUser(newUserProfile);
                  setIsLoading(false);
                }).catch((e) => {
                  console.error("Failed to create user document:", e);
                  errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'create', requestResourceData: newUserProfile }));
                  setIsLoading(false);
                });
              }
            }, (error) => {
              console.error("Firestore onSnapshot error:", error);
              errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
              setIsLoading(false);
            });
        }
      } else {
        // No user is signed in
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
  }, [auth, firestore, pathname, router]);
  
  const user = firestoreUser;
  const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
      if (firebaseUser) {
          if (firebaseUser.isAnonymous) {
              // Update local state and localStorage for guest
              const updatedProfile = { ...firestoreUser, ...data } as UserProfile;
              setFirestoreUser(updatedProfile);
              localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
              return Promise.resolve();
          } else if (firestore) {
              // Update Firestore for real user
              const userRef = doc(firestore, "users", firebaseUser.uid);
              return updateDoc(userRef, data).catch((error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: data }));
                toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save your changes.' });
                throw error;
              });
          }
      }
      return Promise.reject(new Error("User or Firestore not available"));
  }, [firebaseUser, firestore, firestoreUser, toast]);

  return { user, isAdmin, updateUser: memoizedUpdateUser, firebaseUser, isLoading, activeTheme: user?.activeTheme || 'default' };
};
