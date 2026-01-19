'use client';

import { useAuth, useFirestore } from '@/firebase';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp, updateDoc } from 'firebase/firestore';
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
    
    // This ref is used to prevent a race condition where the onSnapshot
    // listener might create a default user profile before the redirect
    // result has been processed.
    const isProcessingRedirect = useRef(false);

    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();

    // 1. Initialize Local User (Guest) State
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

    // 2. Handle Redirect Result
    // This effect runs once on app load to check if the user is returning from a Google Sign-In.
    useEffect(() => {
        if (!auth) return;
        
        isProcessingRedirect.current = true;
        getRedirectResult(auth)
            .catch((error) => {
                console.error("Error processing redirect result:", error);
            })
            .finally(() => {
                // Allow the auth state listener to proceed
                isProcessingRedirect.current = false;
            });
    }, [auth]);


    // 3. Main Auth State Listener
    useEffect(() => {
        if (!auth || !firestore) return;

        let unsubscribeSnapshot: () => void = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
            unsubscribeSnapshot();

            // Wait until the redirect check is complete before processing auth changes.
            if (isProcessingRedirect.current) {
                return;
            }

            if (userAuth) {
                setFirebaseUser(userAuth);
                
                if (userAuth.isAnonymous) {
                    // User is a guest.
                    setFirestoreUser(null);
                    setIsLoading(false);
                } else {
                    // User is signed in with Google.
                    const userRef = doc(firestore, 'users', userAuth.uid);
                    
                    unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                        if (docSnap.exists()) {
                            // User profile exists, load it.
                            setFirestoreUser(docSnap.data() as UserProfile);
                            setIsLoading(false);
                        } else {
                            // This is a new sign-in, create a fresh profile.
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

                            setDoc(userRef, newUserProfile)
                                .then(() => {
                                    setFirestoreUser(newUserProfile);
                                    // Clear guest data upon successful sign-in.
                                    if (typeof window !== 'undefined') {
                                        localStorage.removeItem('localUser');
                                    }
                                })
                                .catch((e) => console.error("Error creating profile", e))
                                .finally(() => setIsLoading(false));
                        }
                    }, (error) => {
                         console.error("Snapshot error:", error);
                         setIsLoading(false);
                    });
                }
            } else {
                // No user is signed in, start the anonymous sign-in process.
                setFirebaseUser(null);
                setFirestoreUser(null);
                signInAnonymously(auth).catch((err) => {
                    console.error("Anonymous sign-in failed", err);
                    setIsLoading(false);
                });
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeSnapshot();
        };
    }, [auth, firestore]);

    const linkGoogleAccount = useCallback(async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Error starting redirect sign-in:", error);
            toast({ variant: "destructive", title: "Sign-in Error", description: "Could not start the sign-in process." });
        }
    }, [auth, toast]);

    const user = firebaseUser?.isAnonymous ? localUser : firestoreUser;
    
    const isAdmin = user?.uid === 'q4vgkFodzoSaPM1BuNbRI0Wx9YZ2';

    const memoizedUpdateUser = useCallback(async (data: Partial<UserProfile>) => {
        if (firebaseUser?.isAnonymous) {
            updateLocalUser(data);
            return;
        } 
        
        if (firestore && firebaseUser && !firebaseUser.isAnonymous) {
            const userRef = doc(firestore, "users", firebaseUser.uid);
            try {
                await updateDoc(userRef, data);
            } catch (error) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: data }));
                toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save your changes.' });
                throw error;
            }
        }
    }, [firebaseUser, firestore, updateLocalUser, toast]);

    return { 
        user, 
        isAdmin, 
        updateUser: memoizedUpdateUser, 
        firebaseUser, 
        isLoading: isLoading && !user,
        activeTheme: user?.activeTheme || 'default', 
        linkGoogleAccount 
    };
};
