
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
        };
        const userRef = doc(firestore, 'users', user.uid);
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
    if (pathname === '/login' && !user.isAnonymous) {
      router.push('/home');
    }
  }, [firestore, pathname, router]);

  useEffect(() => {
    if (!auth || !firestore) return;

    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
      unsubscribeSnapshot(); // Unsubscribe from any previous listener

      if (userAuth) {
        setFirebaseUser(userAuth); // Keep this to expose firebaseUser
        if (userAuth.isAnonymous) {
          setFirestoreUser(null);
          setIsLoading(false);
        } else {
          // Is a real user, set up the snapshot listener
          const userRef = doc(firestore, 'users', userAuth.uid);
          unsubscribeSnapshot = onSnapshot(
            userRef,
            (docSnap) => {
              handleUserSnapshot(docSnap, userAuth);
            },
            (error) => {
              const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'get',
              });
              errorEmitter.emit('permission-error', permissionError);
              setIsLoading(false);
            }
          );
        }
      } else {
        // No user is signed in, attempt anonymous sign-in
        setFirebaseUser(null);
        setFirestoreUser(null);
        try {
          await signInAnonymously(auth);
          // The onAuthStateChanged listener will fire again with the new anonymous user
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          setIsLoading(false);
          if (pathname !== '/') {
            router.push('/');
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, [auth, firestore, router, pathname, handleUserSnapshot]);
  
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
  const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

  const memoizedUpdateUser = useCallback((data: Partial<UserProfile>) => {
      if (firebaseUser?.isAnonymous) {
          updateLocalUser(data);
      } else if (firestore && firebaseUser) {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          updateDoc(userRef, data).catch((error) => {
            console.error("Failed to update user:", error);
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: 'Could not save your changes. ' + error.message,
            });
          });
      }
  }, [firebaseUser, firestore, updateLocalUser, toast]);

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
