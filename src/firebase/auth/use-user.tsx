
'use client';
import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, linkWithCredential, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  DocumentData,
  serverTimestamp,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export const useUser = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleUserSnapshot = useCallback((docSnap: DocumentData) => {
      if (docSnap.exists()) {
          setUser(docSnap.data() as UserProfile);
      } else if (firebaseUser && firestore) {
          // Create new user profile if it doesn't exist
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
          };
          const userRef = doc(firestore, 'users', firebaseUser.uid);
          setDoc(userRef, newUserProfile, { merge: true }).then(() => {
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
      if (pathname === '/login' && !firebaseUser?.isAnonymous) {
        router.push('/home');
      }
  }, [firebaseUser, firestore, pathname, router]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        setFirebaseUser(userAuth);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
         // Don't redirect on landing page
        if (pathname !== '/') {
           router.push('/');
        }
      }
    });

    return () => unsubscribe();
  }, [auth, router, pathname]);

  useEffect(() => {
    if (firebaseUser && firestore) {
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
    if (!auth || !auth.currentUser || !firestore) return;
    
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
            throw new Error("Could not get credential from Google sign-in.");
        }
        
        // At this point, Firebase might have automatically signed in the user with Google,
        // effectively signing them out of their anonymous account. We need to handle this.
        const currentUID = auth.currentUser.uid;
        const previousAnonymousUID = firebaseUser?.uid; // The UID before signInWithPopup

        // If the UID has changed, it means we need to merge the accounts
        if (previousAnonymousUID && currentUID !== previousAnonymousUID) {
            const batch = writeBatch(firestore);
            const anonUserRef = doc(firestore, "users", previousAnonymousUID);
            const anonUserDataSnap = await getDoc(anonUserRef);

            if (anonUserDataSnap.exists()) {
                const anonData = anonUserDataSnap.data() as UserProfile;
                const googleUserRef = doc(firestore, "users", currentUID);
                
                // Merge logic: combine data, google's data takes precedence for profile info
                const mergedData = {
                    ...anonData,
                    name: result.user.displayName || anonData.name,
                    email: result.user.email || anonData.email,
                    avatarUrl: result.user.photoURL || anonData.avatarUrl,
                };

                batch.set(googleUserRef, mergedData, { merge: true });
                batch.delete(anonUserRef);
                
                await batch.commit();

                // setUser to the newly merged data immediately for UI update
                setUser(mergedData as UserProfile);
                
                toast({
                    title: "Account Linked!",
                    description: "Your progress has been saved to your Google account.",
                    className: "bg-green-100 border-green-300",
                });
            }
        }
         router.push('/home');

    } catch (error: any) {
        // This error code means the user closed the popup.
        // It's a normal behavior, so we can safely ignore it.
        if (error.code === 'auth/cancelled-popup-request') {
            console.log("Sign-in cancelled by user.");
            return;
        }

        console.error("Error linking account:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not link Google account. If you have an existing account with that email, please log out and sign in directly.",
        });
    }
  }, [auth, firestore, firebaseUser, router, toast]);

  return { 
    user,
    firebaseUser, 
    isLoading,
    activeTheme: user?.activeTheme || 'default',
    linkGoogleAccount
  };
};
