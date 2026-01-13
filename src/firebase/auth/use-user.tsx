'use client';
import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export const useUser = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        setFirebaseUser(userAuth);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
        if (pathname !== '/login' && pathname !== '/') {
          router.push('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  useEffect(() => {
    if (firebaseUser && firestore) {
      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUser(docSnap.data() as UserProfile);
        } else {
          // Create new user profile if it doesn't exist
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100`,
            email: firebaseUser.email || '',
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
          };
          setDoc(userRef, newUserProfile).then(() => {
            setUser(newUserProfile);
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
        if (pathname === '/login' || pathname === '/') {
          router.push('/home');
        }
      },
      (error) => {
         const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser, firestore, router, pathname]);

  return { 
    user,
    firebaseUser, 
    isLoading,
    activeTheme: user?.activeTheme || 'default'
  };
};
