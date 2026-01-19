
"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useUser } from "@/firebase/auth/use-user";

const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
const LONG_BREAK_TIME = 15 * 60; // 15 minutes
const SESSIONS_UNTIL_LONG_BREAK = 4;

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

interface TimerState {
  time: number;
  isActive: boolean;
  mode: "focus" | "shortBreak" | "longBreak";
  sessions: number; // total sessions from user profile
  todaysSessions: number;
  focusSessionsCompleted: number; // in current browser session
  endTime: number | null;
  quizStreak: number;
  highestQuizStreak: number; // from user profile
  timerEnded: boolean;
}

interface TimerContextProps extends TimerState {
  toggleTimer: () => void;
  resetTimer: () => void;
  setMode: (newMode: "focus" | "shortBreak" | "longBreak") => void;
  FOCUS_TIME: number;
  SHORT_BREAK_TIME: number;
  LONG_BREAK_TIME: number;
  handleCorrectQuizAnswer: () => void;
  handleIncorrectQuizAnswer: () => void;
}

const TimerContext = createContext<TimerContextProps | undefined>(undefined);

let stateStore: TimerState = {
    time: FOCUS_TIME,
    isActive: false,
    mode: 'focus',
    sessions: 0,
    todaysSessions: 0,
    focusSessionsCompleted: 0,
    endTime: null,
    quizStreak: 0,
    highestQuizStreak: 0,
    timerEnded: false,
};

const listeners: Set<(state: TimerState) => void> = new Set();

const dispatch = (newState: Partial<TimerState>) => {
    stateStore = { ...stateStore, ...newState };
    // We only store session-specific state in localStorage now
    const sessionState = {
      isActive: stateStore.isActive,
      mode: stateStore.mode,
      endTime: stateStore.endTime,
      quizStreak: stateStore.quizStreak,
      focusSessionsCompleted: stateStore.focusSessionsCompleted,
      timerEnded: stateStore.timerEnded,
      time: stateStore.time,
    }
    if (typeof window !== 'undefined') {
        localStorage.setItem("pomodoroState", JSON.stringify(sessionState));
    }
    listeners.forEach(listener => listener(stateStore));
};

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}

useTimer.getState = () => {
  return stateStore;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>(stateStore);
  const { user, updateUser } = useUser();
  const { toast } = useToast();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    listeners.add(setTimerState);
    return () => {
      listeners.delete(setTimerState);
    };
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  const handleTimerEnd = useCallback(async () => {
    const currentState = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("pomodoroState") || "{}") : {};
    const currentMode = currentState.mode || 'focus';
    const currentUser = userRef.current;


    if (currentMode === "focus") {
       if(currentUser) {
           const todayKey = getTodayKey();
           const updatedFocusSessions = (currentState.focusSessionsCompleted || 0) + 1;

           const updates: any = {
               completedSessions: (currentUser.completedSessions || 0) + 1,
               dailyProgress: {
                    ...currentUser.dailyProgress,
                    [todayKey]: {
                        ...(currentUser.dailyProgress?.[todayKey] || {}),
                        pomodorosCompleted: (currentUser.dailyProgress?.[todayKey]?.pomodorosCompleted || 0) + 1,
                    }
                }
           };
           
           if (stateStore.highestQuizStreak > (currentUser.highestQuizStreak || 0)) {
               updates.highestQuizStreak = stateStore.highestQuizStreak;
           }

           updateUser(updates);

           const notificationBody = (updatedFocusSessions % SESSIONS_UNTIL_LONG_BREAK === 0) 
               ? `Time for a long break.` 
               : `Time for a short break.`;
           
           showNotification("Focus session complete!", { body: notificationBody });

           dispatch({
               isActive: false,
               timerEnded: true,
               endTime: null,
               focusSessionsCompleted: updatedFocusSessions,
           });
       }
    } else { // break is over
       showNotification("Break's over!", { body: "Time to start another focus session."});
       dispatch({
        mode: 'focus',
        time: FOCUS_TIME,
        isActive: false,
        timerEnded: false,
        endTime: null,
      });
    }
  }, [updateUser, showNotification]);

  // Load state from localStorage and user profile
  useEffect(() => {
    requestNotificationPermission();
    if (typeof window === 'undefined') return;

    const savedSessionState = localStorage.getItem("pomodoroState");
    if (savedSessionState) {
        try {
            const parsedState: Partial<TimerState> = JSON.parse(savedSessionState);
            if (parsedState.isActive && parsedState.endTime) {
                const remainingTime = Math.round((parsedState.endTime - Date.now()) / 1000);
                if (remainingTime > 0) {
                    parsedState.time = remainingTime;
                } else {
                    handleTimerEnd();
                    return;
                }
            }
            dispatch(parsedState);
        } catch (error) {
            console.error("Failed to parse pomodoro state from localStorage", error);
            localStorage.removeItem("pomodoroState");
        }
    }

    if (user) {
        const todayKey = getTodayKey();
        dispatch({ 
            sessions: user.completedSessions || 0,
            todaysSessions: user.dailyProgress?.[todayKey]?.pomodorosCompleted || 0,
            highestQuizStreak: user.highestQuizStreak || 0,
        });
    }
  }, [requestNotificationPermission, handleTimerEnd, user]);

  const resetTimer = useCallback(() => {
    dispatch({
      isActive: false,
      time: stateStore.mode === 'focus' ? FOCUS_TIME : (stateStore.mode === 'shortBreak' ? SHORT_BREAK_TIME : LONG_BREAK_TIME),
      endTime: null,
      quizStreak: 0,
      timerEnded: false,
    });
  }, []);
  
  const handleCorrectQuizAnswer = useCallback(() => {
      const newStreak = stateStore.quizStreak + 1;
      const newHighestStreak = Math.max(stateStore.highestQuizStreak, newStreak);
      
      dispatch({
          quizStreak: newStreak,
          highestQuizStreak: newHighestStreak,
      });

  }, []);

  const handleIncorrectQuizAnswer = useCallback(() => {
    if (stateStore.quizStreak > 0) {
        toast({
            variant: "destructive",
            title: "Streak Lost!",
            description: "Your current quiz streak has been reset.",
        });
    }
    dispatch({ 
      quizStreak: 0,
    });
  }, [toast]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isActive && timerState.time > 0) {
      interval = setInterval(() => {
        const newTime = stateStore.time - 1;
        if (newTime <= 0) {
            if(interval) clearInterval(interval);
            handleTimerEnd();
            dispatch({ time: 0, isActive: false });
        } else {
            dispatch({ time: newTime });
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.time, handleTimerEnd]);
  
  const toggleTimer = () => {
    const newIsActive = !timerState.isActive;
    const newEndTime = newIsActive ? Date.now() + timerState.time * 1000 : null;

    if (newIsActive) {
        dispatch({
          isActive: true,
          endTime: newEndTime,
          timerEnded: false,
        });
    } else {
        dispatch({ 
          isActive: false,
          endTime: null,
          quizStreak: 0,
        }); 
    }
  };

  const setMode = (newMode: "focus" | "shortBreak" | "longBreak") => {
    let newTime: number;
    switch(newMode) {
        case 'focus': newTime = FOCUS_TIME; break;
        case 'shortBreak': newTime = SHORT_BREAK_TIME; break;
        case 'longBreak': newTime = LONG_BREAK_TIME; break;
    }
    dispatch({
        isActive: false,
        mode: newMode,
        time: newTime,
        endTime: null,
        quizStreak: 0,
        timerEnded: false,
    });
  }

  const value = {
    ...timerState,
    toggleTimer,
    resetTimer,
    setMode,
    FOCUS_TIME,
    SHORT_BREAK_TIME,
    LONG_BREAK_TIME,
    handleCorrectQuizAnswer,
    handleIncorrectQuizAnswer,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
