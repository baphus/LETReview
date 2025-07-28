
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
const LONG_BREAK_TIME = 15 * 60; // 15 minutes
const SESSIONS_UNTIL_LONG_BREAK = 4;

interface TimerState {
  time: number;
  isActive: boolean;
  mode: "focus" | "shortBreak" | "longBreak";
  sessions: number;
  focusSessionsCompleted: number;
  endTime: number | null;
  quizStreak: number;
  streakMultiplier: number;
  sessionPoints: number;
}

interface TimerContextProps {
  time: number;
  isActive: boolean;
  mode: "focus" | "shortBreak" | "longBreak";
  sessions: number;
  toggleTimer: () => void;
  resetTimer: () => void;
  setMode: (newMode: "focus" | "shortBreak" | "longBreak") => void;
  FOCUS_TIME: number;
  SHORT_BREAK_TIME: number;
  LONG_BREAK_TIME: number;
  addCompletedSession: () => void;
  quizStreak: number;
  streakMultiplier: number;
  sessionPoints: number;
  handleCorrectQuizAnswer: () => void;
  handleIncorrectQuizAnswer: () => void;
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
    focusSessionsCompleted: 0,
    endTime: null,
    quizStreak: 0,
    streakMultiplier: 1,
    sessionPoints: 0,
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
                    const endedOnFocus = parsedState.mode === 'focus';
                    
                    if (endedOnFocus) {
                        const savedUser = localStorage.getItem("userProfile");
                        if(savedUser) {
                            const user = JSON.parse(savedUser);
                            user.completedSessions = (user.completedSessions || 0) + 1;
                             // Points are now added in real-time, not here
                            localStorage.setItem("userProfile", JSON.stringify(user));
                            parsedState.sessions = user.completedSessions;
                        }
                        parsedState.focusSessionsCompleted = (parsedState.focusSessionsCompleted || 0) + 1;
                    }

                    if (endedOnFocus && parsedState.focusSessionsCompleted % SESSIONS_UNTIL_LONG_BREAK === 0) {
                        parsedState.mode = 'longBreak';
                        parsedState.time = LONG_BREAK_TIME;
                    } else if (endedOnFocus) {
                        parsedState.mode = 'shortBreak';
                        parsedState.time = SHORT_BREAK_TIME;
                    } else {
                        parsedState.mode = 'focus';
                        parsedState.time = FOCUS_TIME;
                    }

                    // Reset streak/points info for new session
                    parsedState.sessionPoints = 0;
                    parsedState.quizStreak = 0;
                    parsedState.streakMultiplier = 1;
                }
            }
             const savedUser = localStorage.getItem("userProfile");
             if (savedUser) {
                const user = JSON.parse(savedUser);
                parsedState.sessions = user.completedSessions || 0;
             }

            // Ensure sessionPoints is a number
            if (typeof parsedState.sessionPoints !== 'number' || isNaN(parsedState.sessionPoints)) {
                parsedState.sessionPoints = 0;
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
      time: timerState.mode === 'focus' ? FOCUS_TIME : (timerState.mode === 'shortBreak' ? SHORT_BREAK_TIME : LONG_BREAK_TIME),
      endTime: null,
      quizStreak: 0,
      streakMultiplier: 1,
      sessionPoints: 0,
    });
  }, [updateTimerState, timerState.mode]);
  
  const addCompletedSession = useCallback(() => {
      const savedUser = localStorage.getItem("userProfile");
      if(savedUser){
          const user = JSON.parse(savedUser);
          user.completedSessions = (user.completedSessions || 0) + 1;
          // Points are now added in real-time, not at the end.
          localStorage.setItem("userProfile", JSON.stringify(user));
          updateTimerState({ 
              sessions: user.completedSessions,
              focusSessionsCompleted: (timerState.focusSessionsCompleted || 0) + 1
          });

           if (timerState.sessionPoints > 0) {
                toast({
                    title: `Session Complete!`,
                    description: `You earned a total of ${timerState.sessionPoints} points.`,
                    className: "bg-green-100 border-green-300"
                });
            }
      }
  }, [updateTimerState, timerState.sessionPoints, toast, timerState.focusSessionsCompleted]);

  const handleCorrectQuizAnswer = useCallback(() => {
    const pointsGained = Math.floor(1 * timerState.streakMultiplier);
    
    // Update user profile with new points immediately
    const savedUser = localStorage.getItem("userProfile");
    if(savedUser) {
        const user = JSON.parse(savedUser);
        user.points = (user.points || 0) + pointsGained;
        localStorage.setItem("userProfile", JSON.stringify(user));
    }
    
    // Update timer state
    setTimerState(prevState => {
      const newStreak = prevState.quizStreak + 1;
      const newMultiplier = 1 + (newStreak * 0.05);
      
      const updatedState = {
        ...prevState,
        quizStreak: newStreak,
        streakMultiplier: newMultiplier,
        sessionPoints: prevState.sessionPoints + pointsGained,
      };

      localStorage.setItem("pomodoroState", JSON.stringify(updatedState));
      return updatedState;
    });

    toast({
        title: `Correct! +${pointsGained} ${pointsGained > 1 ? 'Points' : 'Point'}`,
        description: `Your streak is now ${timerState.quizStreak + 1}!`,
        className: "bg-green-100 border-green-300"
    });
  }, [timerState.streakMultiplier, timerState.quizStreak, toast]);

  const handleIncorrectQuizAnswer = useCallback(() => {
    if (timerState.quizStreak > 0) {
        toast({
            variant: "destructive",
            title: "Streak Lost!",
            description: "Your multiplier has been reset.",
        });
    }
    updateTimerState({ 
      quizStreak: 0,
      streakMultiplier: 1, 
      // sessionPoints are NOT reset on incorrect answer
    });
  }, [updateTimerState, timerState.quizStreak, toast]);


  const handleTimerEnd = useCallback(() => {
    if (timerState.mode === "focus") {
       addCompletedSession();
       const nextMode = (timerState.focusSessionsCompleted + 1) % SESSIONS_UNTIL_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
       const nextTime = nextMode === 'longBreak' ? LONG_BREAK_TIME : SHORT_BREAK_TIME;
       const notificationBody = nextMode === 'longBreak' ? `Time for a ${LONG_BREAK_TIME / 60}-minute break.` : `Time for a ${SHORT_BREAK_TIME / 60}-minute break.`;
       
       showNotification("Focus session complete!", { body: notificationBody });

       updateTimerState({
        mode: nextMode,
        time: nextTime,
        isActive: false,
        endTime: null,
        sessionPoints: 0,
        quizStreak: 0,
        streakMultiplier: 1,
      });

    } else { // break is over
       showNotification("Break's over!", { body: "Time to start another focus session."});
       updateTimerState({
        mode: 'focus',
        time: FOCUS_TIME,
        isActive: false,
        endTime: null,
      });
    }
  }, [timerState.mode, timerState.focusSessionsCompleted, showNotification, updateTimerState, addCompletedSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isActive && timerState.time > 0) {
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
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.time, handleTimerEnd]);
  
  const toggleTimer = () => {
    const newIsActive = !timerState.isActive;
    const newEndTime = newIsActive ? Date.now() + timerState.time * 1000 : null;

    if (newIsActive) { // if timer is being started
        updateTimerState({
          isActive: true,
          endTime: newEndTime,
        });
    } else { // if timer is being paused
        updateTimerState({ 
          isActive: false,
          endTime: null,
          quizStreak: 0,
          streakMultiplier: 1,
          // sessionPoints are NOT reset on pause
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
    updateTimerState({
        isActive: false,
        mode: newMode,
        time: newTime,
        endTime: null,
        quizStreak: 0,
        streakMultiplier: 1,
        sessionPoints: 0,
    });
  }

  const value = {
    time: timerState.time,
    isActive: timerState.isActive,
    mode: timerState.mode,
    sessions: timerState.sessions,
    toggleTimer,
    resetTimer,
    setMode,
    FOCUS_TIME,
    SHORT_BREAK_TIME,
    LONG_BREAK_TIME,
    addCompletedSession,
    quizStreak: timerState.quizStreak,
    streakMultiplier: timerState.streakMultiplier,
    sessionPoints: timerState.sessionPoints,
    handleCorrectQuizAnswer,
    handleIncorrectQuizAnswer,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
