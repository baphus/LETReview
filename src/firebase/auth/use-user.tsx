'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
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

  const firestoreRef = useRef(firestore);
  useEffect(() => {
    firestoreRef.current = firestore;
  }, [firestore]);

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

  const clearLocalUser = useCallback(() => {
      if (typeof window !== 'undefined') {
          localStorage.removeItem('localUser');
          const defaultUser = createDefaultUser();
          setLocalUser(defaultUser);
          localStorage.setItem('localUser', JSON.stringify(defaultUser));
      }
  }, []);
  
  const handleUserSnapshot = useCallback((docSnap: DocumentData, user: User) => {
    const currentFirestore = firestoreRef.current;
    if (docSnap.exists()) {
        setFirestoreUser(docSnap.data() as UserProfile);
    } else if (user && currentFirestore && !user.isAnonymous) {
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
        const userRef = doc(currentFirestore, 'users', user.uid);
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
  }, []);

  // Corrected auth flow
  useEffect(() => {
    if (!auth || !firestore) return;

    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
        unsubscribeSnapshot(); // Always clean up previous snapshot listener

        if (userAuth) {
            // A user is authenticated.
            setFirebaseUser(userAuth);
            if (userAuth.isAnonymous) {
                setFirestoreUser(null); // Anonymous users use local state.
                setIsLoading(false);
            } else {
                // A real user is signed in. Set up a real-time listener for their profile.
                const userRef = doc(firestore, 'users', userAuth.uid);
                unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                    handleUserSnapshot(docSnap, userAuth);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
                    setIsLoading(false);
                });
            }
        } else {
            // No user is authenticated. This could be initial load or a redirect return.
            setIsLoading(true);
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    // Sign-in via redirect was successful. `onAuthStateChanged` will fire again with the user.
                    // We just need to handle the data merge from the local guest account.
                    const googleUser = result.user;
                    const userRef = doc(firestore, "users", googleUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (!userDoc.exists() && localUser) {
                        const mergedData: UserProfile = {
                            ...localUser,
                            uid: googleUser.uid,
                            name: googleUser.displayName || localUser.name,
                            email: googleUser.email || '',
                            avatarUrl: googleUser.photoURL || localUser.avatarUrl,
                            createdAt: serverTimestamp(),
                            hasCompletedOnboarding: false,
                        };
                        await setDoc(userRef, mergedData);
                        clearLocalUser();
                        toast({
                            title: "Account Synced!",
                            description: "Your guest progress has been saved to your Google account.",
                            className: "bg-green-100 border-green-300",
                        });
                    }
                } else {
                    // No redirect result, so it's a fresh visit. Sign in as a guest.
                    signInAnonymously(auth).catch(err => {
                        console.error("Anonymous sign-in failed:", err);
                        setIsLoading(false);
                    });
                }
            } catch (error) {
                console.error("Error processing redirect result:", error);
                toast({ variant: "destructive", title: "Sign-in Error", description: "There was a problem signing you in." });
                setIsLoading(false);
            }
        }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeSnapshot();
    };
  }, [auth, firestore, localUser, handleUserSnapshot, clearLocalUser, toast]);


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
