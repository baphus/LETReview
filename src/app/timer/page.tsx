
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FOCUS_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

interface TimerState {
  time: number;
  isActive: boolean;
  mode: "focus" | "break";
  sessions: number;
}

export default function TimerPage() {
  const [timerState, setTimerState] = useState<TimerState>({
    time: FOCUS_TIME,
    isActive: false,
    mode: 'focus',
    sessions: 0,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // Load state from localStorage on initial render
    const savedState = localStorage.getItem("pomodoroState");
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            setTimerState(parsedState);
        } catch (error) {
            console.error("Failed to parse pomodoro state from localStorage", error);
            // If parsing fails, start with a clean state
            localStorage.removeItem("pomodoroState");
        }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("pomodoroState", JSON.stringify(timerState));
  }, [timerState]);

  const resetTimer = useCallback((forceMode?: "focus" | "break") => {
    const newMode = forceMode || 'focus';
    setTimerState(prevState => ({
      ...prevState,
      isActive: false,
      mode: newMode,
      time: newMode === "focus" ? FOCUS_TIME : BREAK_TIME,
    }));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isActive && timerState.time > 0) {
      interval = setInterval(() => {
        setTimerState(prevState => ({ ...prevState, time: prevState.time - 1 }));
      }, 1000);
    } else if (timerState.isActive && timerState.time === 0) {
      if (timerState.mode === "focus") {
        setTimerState(prevState => ({
          ...prevState,
          sessions: prevState.sessions + 1,
          mode: 'break',
          time: BREAK_TIME,
          isActive: false,
        }));
        
        // Update user profile
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

      } else {
         setTimerState(prevState => ({
          ...prevState,
          mode: 'focus',
          time: FOCUS_TIME,
          isActive: false,
        }));
        toast({
          title: "Break's over!",
          description: "Time to start another focus session.",
        });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.time, timerState.mode, toast]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && timerState.isActive) {
        setTimerState(prevState => ({ ...prevState, isActive: false }));
        toast({
          variant: "destructive",
          title: "Timer Paused",
          description: "You navigated away. The timer is paused to ensure active focus.",
        });
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState.isActive, toast]);


  const toggleTimer = () => {
    setTimerState(prevState => ({ ...prevState, isActive: !prevState.isActive }));
  };
  
  const minutes = Math.floor(timerState.time / 60);
  const seconds = timerState.time % 60;
  const progress = (timerState.mode === 'focus' ? (FOCUS_TIME - timerState.time) / FOCUS_TIME : (BREAK_TIME - timerState.time) / BREAK_TIME) * 100;

  return (
    <div className="container mx-auto p-4 max-w-2xl flex flex-col h-full">
      <header className="flex items-center gap-2 mb-6">
        <Clock className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Pomodoro Timer</h1>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
                {timerState.mode === 'focus' ? <Clock className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                <span>{timerState.mode === "focus" ? "Focus Session" : "Short Break"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 rounded-full flex items-center justify-center bg-muted">
                <div 
                    className="absolute top-0 left-0 w-full h-full rounded-full"
                    style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, transparent ${progress}%)`}}
                ></div>
                <div className="relative w-40 h-40 bg-background rounded-full flex items-center justify-center">
                    <span className="text-5xl font-bold font-mono tracking-tighter">
                        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={toggleTimer} size="lg" className="w-28">
                {timerState.isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {timerState.isActive ? "Pause" : "Start"}
              </Button>
              <Button onClick={() => resetTimer()} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6 text-center">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Award className="text-primary" />
                    <span>Completed Sessions</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{timerState.sessions}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
