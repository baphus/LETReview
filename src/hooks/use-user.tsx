
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { loadUserProfile, getActiveBank, saveUserProfile } from '@/lib/data';
import type { UserProfile, QuestionBank } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface UserContextProps {
  user: UserProfile | null;
  activeBank: QuestionBank | null;
  setUser: (user: UserProfile | null) => void;
  setActiveBank: (bank: QuestionBank | null) => void;
  loadData: () => void;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeBank, setActiveBank] = useState<QuestionBank | null>(null);
  const router = useRouter();

  const loadData = useCallback(() => {
    const profile = loadUserProfile();
    if (profile) {
      setUser(profile);
      const bank = getActiveBank();
      setActiveBank(bank);
    } else {
      // This case handles when a user is logged out.
      setUser(null);
      setActiveBank(null);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const contextValue = useMemo(() => ({
    user,
    activeBank,
    setUser,
    setActiveBank,
    loadData,
  }), [user, activeBank, loadData]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

    