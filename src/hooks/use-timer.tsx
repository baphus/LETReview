
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
const LONG_BREAK_TIME = 15 * 60; // 15 minutes
const SESSIONS_UNTIL_LONG_BREAK = 4;

interface TimerState {
  time: number;
  isActive: boolean;
  mode: "focus" | "shortBreak" | "longBreak";
  sessions: number; // total sessions
  todaysSessions: number;
  focusSessionsCompleted: number;
  endTime: number | null;
  quizStreak: number;
  highestQuizStreak: number;
  timerEnded: boolean;
}

interface TimerContextProps extends TimerState {
  toggleTimer: () => void;
  resetTimer: () => void;
  setMode: (newMode: "focus" | "shortBreak" | "longBreak") => void;
  FOCUS_TIME: number;
  SHORT_BREAK_TIME: number;
  LONG_BREAK_TIME: number;
  handleCorrectQuizAnswer: (points: number) => void;
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
    localStorage.setItem("pomodoroState", JSON.stringify(stateStore));
    listeners.forEach(listener => listener(stateStore));
};

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}

// Add a static method to get the current state
useTimer.getState = () => {
  return stateStore;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>(stateStore);
  const { toast } = useToast();

  useEffect(() => {
    listeners.add(setTimerState);
    return () => {
      listeners.delete(setTimerState);
    };
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  const handleTimerEnd = useCallback(() => {
    const currentState = JSON.parse(localStorage.getItem("pomodoroState") || "{}");
    const currentMode = currentState.mode || 'focus';
    const currentUid = localStorage.getItem('currentUser');

    if (currentMode === "focus" && currentUid) {
       const savedUser = localStorage.getItem(`userProfile_${currentUid}`);
       if(savedUser){
           let user = JSON.parse(savedUser);
           const todayKey = getTodayKey();

           user.completedSessions = (user.completedSessions || 0) + 1;
           
           if (!user.dailyProgress) user.dailyProgress = {};
           if (!user.dailyProgress[todayKey]) user.dailyProgress[todayKey] = { pointsEarned: 0, pomodorosCompleted: 0, challengesCompleted: [], qotdCompleted: false };
           user.dailyProgress[todayKey].pomodorosCompleted = (user.dailyProgress[todayKey].pomodorosCompleted || 0) + 1;
           
           // Update highest quiz streak from the session into the main profile
           if (stateStore.highestQuizStreak > (user.highestQuizStreak || 0)) {
               user.highestQuizStreak = stateStore.highestQuizStreak;
           }

           localStorage.setItem(`userProfile_${currentUid}`, JSON.stringify(user));
            // Manually trigger a storage event to notify other components like the home page
           window.dispatchEvent(new Event('storage'));

           const updatedFocusSessions = (currentState.focusSessionsCompleted || 0) + 1;
           const newTodaysSessions = user.dailyProgress[todayKey].pomodorosCompleted;


           const notificationBody = (updatedFocusSessions % SESSIONS_UNTIL_LONG_BREAK === 0) 
               ? `Time for a long break.` 
               : `Time for a short break.`;
           
           showNotification("Focus session complete!", { body: notificationBody });

           dispatch({
               isActive: false,
               timerEnded: true,
               endTime: null,
               sessions: user.completedSessions,
               todaysSessions: newTodaysSessions,
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
  }, [showNotification]);

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem("pomodoroState");
    const currentUid = localStorage.getItem('currentUser');

    if (savedState) {
        try {
            const parsedState: TimerState = JSON.parse(savedState);
            if (parsedState.isActive && parsedState.endTime) {
                const remainingTime = Math.round((parsedState.endTime - Date.now()) / 1000);
                if (remainingTime > 0) {
                    parsedState.time = remainingTime;
                } else {
                    handleTimerEnd();
                    return;
                }
            }
            if (currentUid) {
                 const savedUser = localStorage.getItem(`userProfile_${currentUid}`);
                 if (savedUser) {
                    const user = JSON.parse(savedUser);
                    const todayKey = getTodayKey();
                    parsedState.sessions = user.completedSessions || 0;
                    parsedState.todaysSessions = user.dailyProgress?.[todayKey]?.pomodorosCompleted || 0;
                    parsedState.highestQuizStreak = user.highestQuizStreak || 0;
                 }
            }
            dispatch(parsedState);
        } catch (error) {
            console.error("Failed to parse pomodoro state from localStorage", error);
            localStorage.removeItem("pomodoroState");
        }
    } else if (currentUid) {
        const savedUser = localStorage.getItem(`userProfile_${currentUid}`);
        if (savedUser) {
            const user = JSON.parse(savedUser);
            const todayKey = getTodayKey();
            dispatch({ 
                sessions: user.completedSessions || 0,
                todaysSessions: user.dailyProgress?.[todayKey]?.pomodorosCompleted || 0,
                highestQuizStreak: user.highestQuizStreak || 0,
            });
        }
    }
    requestNotificationPermission();
  }, [requestNotificationPermission, handleTimerEnd]);

  const resetTimer = useCallback(() => {
    dispatch({
      isActive: false,
      time: stateStore.mode === 'focus' ? FOCUS_TIME : (stateStore.mode === 'shortBreak' ? SHORT_BREAK_TIME : LONG_BREAK_TIME),
      endTime: null,
      quizStreak: 0,
      timerEnded: false,
    });
  }, []);
  

  const handleCorrectQuizAnswer = useCallback((pointsGained: number) => {
      const newStreak = stateStore.quizStreak + 1;
      const newHighestStreak = Math.max(stateStore.highestQuizStreak, newStreak);
      const currentUid = localStorage.getItem('currentUser');
      
      if(currentUid) {
          const savedUser = localStorage.getItem(`userProfile_${currentUid}`);
          if(savedUser) {
            const user = JSON.parse(savedUser);
            const todayKey = getTodayKey();
            user.points = (user.points || 0) + pointsGained;

            if (!user.dailyProgress) user.dailyProgress = {};
            if (!user.dailyProgress[todayKey]) user.dailyProgress[todayKey] = { pointsEarned: 0, pomodorosCompleted: 0, challengesCompleted: [], qotdCompleted: false };
            user.dailyProgress[todayKey].pointsEarned = (user.dailyProgress[todayKey].pointsEarned || 0) + pointsGained;

            localStorage.setItem(`userProfile_${currentUid}`, JSON.stringify(user));
            // Manually trigger a storage event to notify other components
            window.dispatchEvent(new Event('storage'));
          }
      }
      
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
        case 'focus':
            newTime = FOCUS_TIME;
            break;
        case 'shortBreak':
            newTime = SHORT_BREAK_TIME;
            break;
        case 'longBreak':
            newTime = LONG_BREAK_TIME;
            break;
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
