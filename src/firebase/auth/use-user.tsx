
'use client';
import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, linkWithCredential, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  DocumentData,
  serverTimestamp,
  getDoc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useLocalUser } from '@/hooks/use-local-user';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');


export const useUser = () => {
  const { toast } = useToast();
  const { localUser, updateLocalUser, clearLocalUser } = useLocalUser();
  const [firestoreUser, setFirestoreUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleUserSnapshot = useCallback((docSnap: DocumentData) => {
    if (docSnap.exists()) {
        setFirestoreUser(docSnap.data() as UserProfile);
    } else if (firebaseUser && firestore && !firebaseUser.isAnonymous) {
        // Create new user profile if it doesn't exist for a NON-anonymous user
        const newUserProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'New User',
          avatarUrl: firebaseUser.photoURL || `https://avatar.vercel.sh/${firebaseUser.uid}`,
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
          questionsAnswered: 0,
          answeredQuestionIds: [],
        };
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        setDoc(userRef, newUserProfile, { merge: true }).then(() => {
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
    if (pathname === '/login' && !firebaseUser?.isAnonymous) {
      router.push('/home');
    }
  }, [firebaseUser, firestore, pathname, router]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        setFirebaseUser(userAuth);
        if (userAuth.isAnonymous) {
            setIsLoading(false);
        }
      } else {
        // If there's no logged-in user, attempt to sign in anonymously
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Anonymous sign-in failed on startup:", error);
            // Handle failure case if necessary
            setFirebaseUser(null);
            setFirestoreUser(null);
            setIsLoading(false);
            if (pathname !== '/') {
               router.push('/');
            }
        }
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  useEffect(() => {
    if (firebaseUser && firestore && !firebaseUser.isAnonymous) {
      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const unsubscribe = onSnapshot(userRef, 
        (docSnap) => handleUserSnapshot(docSnap),
        (error) => {
          const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [firebaseUser, firestore, handleUserSnapshot]);
  
  const linkGoogleAccount = useCallback(async () => {
    if (!auth || !auth.currentUser || !firestore || !localUser) return;
    
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
            throw new Error("Could not get credential from Google sign-in.");
        }
        
        const currentUID = auth.currentUser.uid;
        
        // Data from local anonymous user
        const anonData = localUser;
        const googleUserRef = doc(firestore, "users", currentUID);
        
        // Merge local data with new Google account info
        const mergedData: UserProfile = {
            ...anonData,
            uid: currentUID, // IMPORTANT: Update UID to the new Google UID
            name: result.user.displayName || anonData.name,
            email: result.user.email || anonData.email,
            avatarUrl: result.user.photoURL || anonData.avatarUrl,
            createdAt: serverTimestamp(),
            questionsAnswered: anonData.questionsAnswered || 0,
            answeredQuestionIds: anonData.answeredQuestionIds || [],
        };

        // Write the merged data to the new user's document
        await setDoc(googleUserRef, mergedData, { merge: true });

        // Clear local data as it's now migrated to Firestore
        clearLocalUser();
        
        toast({
            title: "Account Linked!",
            description: "Your progress has been saved to your Google account.",
            className: "bg-green-100 border-green-300",
        });
        
        router.push('/home');

    } catch (error: any) {
        if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
            console.log("Sign-in popup closed by user.");
            return;
        }

        console.error("Error linking account:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not link Google account. If you have an existing account with that email, please log out and sign in directly.",
        });
    }
  }, [auth, firestore, router, toast, localUser, clearLocalUser]);
  
  const user = firebaseUser?.isAnonymous ? localUser : firestoreUser;

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
      if (firebaseUser?.isAnonymous) {
          updateLocalUser(data);
      } else if (firestore && firebaseUser) {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          updateDoc(userRef, data);
      }
  }, [firebaseUser, firestore, updateLocalUser]);

  return { 
    user,
    updateUser: memoizedUpdateUser,
    firebaseUser, 
    isLoading,
    activeTheme: user?.activeTheme || 'default',
    linkGoogleAccount
  };
};
