
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { format } from "date-fns";

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
});

export const useLocalUser = () => {
    const [localUser, setLocalUser] = useState<UserProfile | null>(null);

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
                console.error("Failed to access local storage or parse user data:", error);
                const defaultUser = createDefaultUser();
                setLocalUser(defaultUser);
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
            setLocalUser(null);
        }
    }, []);

    return { localUser, updateLocalUser, clearLocalUser };
};
