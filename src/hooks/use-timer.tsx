
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
                    setTimerState(parsedState);
                } else {
                    // Timer finished while tab was closed
                    parsedState.isActive = false;
                    parsedState.time = parsedState.mode === 'focus' ? BREAK_TIME : FOCUS_TIME;
                    parsedState.mode = parsedState.mode === 'focus' ? 'break' : 'focus';
                    if (parsedState.mode === 'break') { // This means focus session just ended
                        parsedState.sessions += 1;
                    }
                    setTimerState(parsedState);
                }
            } else {
                 setTimerState(parsedState);
            }
        } catch (error) {
            console.error("Failed to parse pomodoro state from localStorage", error);
            localStorage.removeItem("pomodoroState");
        }
    }
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("pomodoroState", JSON.stringify(timerState));
  }, [timerState]);

  const resetTimer = useCallback(() => {
    setTimerState(prevState => ({
      ...prevState,
      isActive: false,
      mode: 'focus',
      time: FOCUS_TIME,
      endTime: null,
    }));
  }, []);

  const handleTimerEnd = useCallback(() => {
    if (timerState.mode === "focus") {
      setTimerState(prevState => ({
        ...prevState,
        sessions: prevState.sessions + 1,
        mode: 'break',
        time: BREAK_TIME,
        isActive: false,
        endTime: null,
      }));
      
      const savedUser = localStorage.getItem("userProfile");
      if(savedUser){
          const user = JSON.parse(savedUser);
          user.points = (user.points || 0) + 25;
          user.completedSessions = (user.completedSessions || 0) + 1;
          localStorage.setItem("userProfile", JSON.stringify(user));
      }

      toast({
        title: "Focus session complete!",
        description: "Time for a 5-minute break. You earned 25 points!",
      });
      showNotification("Focus session complete!", { body: "Time for a 5-minute break."});

    } else {
       setTimerState(prevState => ({
        ...prevState,
        mode: 'focus',
        time: FOCUS_TIME,
        isActive: false,
        endTime: null,
      }));
      toast({
        title: "Break's over!",
        description: "Time to start another focus session.",
      });
      showNotification("Break's over!", { body: "Time to start another focus session."});
    }
  }, [timerState.mode, toast, showNotification]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isActive) {
      if (timerState.time > 0) {
        interval = setInterval(() => {
          setTimerState(prevState => {
            const newTime = prevState.time - 1;
            if (newTime <= 0) {
                handleTimerEnd();
                return { ...prevState, time: 0 };
            }
            return { ...prevState, time: newTime }
          });
        }, 1000);
      } else {
          handleTimerEnd();
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.time, handleTimerEnd]);
  
  const toggleTimer = () => {
    setTimerState(prevState => {
        const wasActive = prevState.isActive;
        const newIsActive = !wasActive;
        let newEndTime = prevState.endTime;
        if(newIsActive && !wasActive) { // Starting the timer
            newEndTime = Date.now() + prevState.time * 1000;
        } else if (!newIsActive && wasActive) { // Pausing timer
            newEndTime = null;
        }
        return { 
            ...prevState, 
            isActive: newIsActive,
            endTime: newEndTime,
        };
    });
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
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
