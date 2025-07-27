
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const FOCUS_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

interface TimerState {
  time: number;
  isActive: boolean;
  mode: "focus" | "break";
  sessions: number;
  endTime: number | null;
}

interface TimerContextProps {
  time: number;
  isActive: boolean;
  mode: "focus" | "break";
  sessions: number;
  toggleTimer: () => void;
  resetTimer: () => void;
  FOCUS_TIME: number;
  BREAK_TIME: number;
  addCompletedSession: () => void;
}

const TimerContext = createContext<TimerContextProps | undefined>(undefined);

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>({
    time: FOCUS_TIME,
    isActive: false,
    mode: 'focus',
    sessions: 0,
    endTime: null,
  });

  const { toast } = useToast();

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
  
  const updateTimerState = useCallback((newState: Partial<TimerState>) => {
    setTimerState(prevState => {
      const updated = { ...prevState, ...newState };
      localStorage.setItem("pomodoroState", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem("pomodoroState");
    if (savedState) {
        try {
            const parsedState: TimerState = JSON.parse(savedState);
            if (parsedState.isActive && parsedState.endTime) {
                const remainingTime = Math.round((parsedState.endTime - Date.now()) / 1000);
                if (remainingTime > 0) {
                    parsedState.time = remainingTime;
                } else {
                    // Timer finished while tab was closed
                    parsedState.isActive = false;
                    parsedState.time = parsedState.mode === 'focus' ? BREAK_TIME : FOCUS_TIME;
                    const endedOnFocus = parsedState.mode === 'focus';
                    parsedState.mode = endedOnFocus ? 'break' : 'focus';
                    if (endedOnFocus) {
                        const savedUser = localStorage.getItem("userProfile");
                        if(savedUser) {
                            const user = JSON.parse(savedUser);
                            user.completedSessions = (user.completedSessions || 0) + 1;
                            localStorage.setItem("userProfile", JSON.stringify(user));
                            parsedState.sessions = user.completedSessions;
                        }
                    }
                }
            }
             const savedUser = localStorage.getItem("userProfile");
             if (savedUser) {
                const user = JSON.parse(savedUser);
                parsedState.sessions = user.completedSessions || 0;
             }
            setTimerState(parsedState);
        } catch (error) {
            console.error("Failed to parse pomodoro state from localStorage", error);
            localStorage.removeItem("pomodoroState");
        }
    } else {
        const savedUser = localStorage.getItem("userProfile");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setTimerState(prevState => ({ ...prevState, sessions: user.completedSessions || 0 }));
        }
    }
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const resetTimer = useCallback(() => {
    updateTimerState({
      isActive: false,
      mode: 'focus',
      time: FOCUS_TIME,
      endTime: null,
    });
  }, [updateTimerState]);
  
  const addCompletedSession = useCallback(() => {
      const savedUser = localStorage.getItem("userProfile");
      if(savedUser){
          const user = JSON.parse(savedUser);
          user.completedSessions = (user.completedSessions || 0) + 1;
          localStorage.setItem("userProfile", JSON.stringify(user));
          updateTimerState({ sessions: user.completedSessions });
      }
  }, [updateTimerState]);

  const handleTimerEnd = useCallback(() => {
    if (timerState.mode === "focus") {
       // Points are now awarded on the timer page itself
       updateTimerState({
        mode: 'break',
        time: BREAK_TIME,
        isActive: false,
        endTime: null,
      });
      showNotification("Focus session complete!", { body: "Time for a 5-minute break."});

    } else {
       updateTimerState({
        mode: 'focus',
        time: FOCUS_TIME,
        isActive: false,
        endTime: null,
      });
      showNotification("Break's over!", { body: "Time to start another focus session."});
    }
  }, [timerState.mode, showNotification, updateTimerState]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isActive) {
      if (timerState.time > 0) {
        interval = setInterval(() => {
          setTimerState(prevState => {
            const newTime = prevState.time - 1;
            if (newTime <= 0) {
              if (interval) clearInterval(interval);
              handleTimerEnd();
              return { ...prevState, time: 0, isActive: false };
            }
            return { ...prevState, time: newTime }
          });
        }, 1000);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.time, handleTimerEnd]);
  
  const toggleTimer = () => {
    setTimerState(prevState => {
        const newIsActive = !prevState.isActive;
        let newEndTime = null;
        if(newIsActive) {
            newEndTime = Date.now() + prevState.time * 1000;
        }
        return { 
            ...prevState, 
            isActive: newIsActive,
            endTime: newEndTime,
        };
    });
     // We need to also immediately save state on toggle
    localStorage.setItem("pomodoroState", JSON.stringify({
        ...timerState,
        isActive: !timerState.isActive,
        endTime: !timerState.isActive ? Date.now() + timerState.time * 1000 : null,
    }));
  };

  const value = {
    time: timerState.time,
    isActive: timerState.isActive,
    mode: timerState.mode,
    sessions: timerState.sessions,
    toggleTimer,
    resetTimer,
    FOCUS_TIME,
    BREAK_TIME,
    addCompletedSession,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
