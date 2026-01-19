
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
    
    // We use a ref to track if we are currently processing a redirect merge
    // to prevent the snapshot listener from creating a duplicate/empty user.
    const isMergingRef = useRef(false);

    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();

    // 1. Initialize Local User (Guest)
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

    // 2. Handle Redirect Results (The Merge Logic)
    // This must run independently of onAuthStateChanged to catch the return from Google
    useEffect(() => {
        if (!auth || !firestore) return;

        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                
                if (result && result.user) {
                    isMergingRef.current = true; // Block snapshot creation
                    const googleUser = result.user;
                    const userRef = doc(firestore, "users", googleUser.uid);
                    
                    const { creationTime, lastSignInTime } = result.user.metadata;
                    const isNewUser = creationTime === lastSignInTime;

                    if (isNewUser) {
                         const savedGuestUserRaw = localStorage.getItem('localUser');
                         const guestUser = savedGuestUserRaw ? JSON.parse(savedGuestUserRaw) : null;
                         
                         if (guestUser) {
                            const mergedData: UserProfile = {
                                ...guestUser,
                                uid: googleUser.uid,
                                name: googleUser.displayName || guestUser.name,
                                email: googleUser.email || '',
                                avatarUrl: googleUser.photoURL || guestUser.avatarUrl,
                                createdAt: serverTimestamp(),
                                hasCompletedOnboarding: false,
                            };
                            
                            await setDoc(userRef, mergedData, { merge: true });
                            clearLocalUser();
                            toast({
                                title: "Account Synced!",
                                description: "Your guest progress has been saved.",
                                className: "bg-green-100 border-green-300",
                            });
                         }
                    }
                }
            } catch (error) {
                console.error("Redirect Error", error);
            } finally {
                isMergingRef.current = false; // Release the lock
            }
        };

        checkRedirect();
    }, [auth, firestore, clearLocalUser, toast]);


    // 3. Main Auth Listener
    useEffect(() => {
        if (!auth || !firestore) return;

        let unsubscribeSnapshot: () => void = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, async (userAuth) => {
            unsubscribeSnapshot(); // Cleanup previous listener

            if (userAuth) {
                setFirebaseUser(userAuth);
                
                if (userAuth.isAnonymous) {
                    setFirestoreUser(null);
                    setIsLoading(false);
                } else {
                    // Real User
                    const userRef = doc(firestore, 'users', userAuth.uid);
                    
                    unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                        // CRITICAL: If we are in the middle of a redirect merge, do not create a default user yet.
                        if (isMergingRef.current) return;

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

                            setDoc(userRef, newUserProfile)
                                .then(() => setFirestoreUser(newUserProfile))
                                .catch((e) => console.error("Error creating profile", e))
                                .finally(() => setIsLoading(false));
                        }
                    }, (error) => {
                         console.error("Snapshot error:", error);
                         setIsLoading(false);
                    });
                }
            } else {
                // No User - Sign In Anonymously
                setFirebaseUser(null);
                setFirestoreUser(null);
                
                signInAnonymously(auth).catch((err) => {
                    console.error("Anon sign-in failed", err);
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
