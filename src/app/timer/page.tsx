"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FOCUS_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

export default function TimerPage() {
  const [time, setTime] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [sessions, setSessions] = useState(0);
  const [points, setPoints] = useState(0);
  const { toast } = useToast();

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setMode("focus");
    setTime(FOCUS_TIME);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isActive && time === 0) {
      if (mode === "focus") {
        setSessions(s => s + 1);
        setPoints(p => p + 10);
        setMode("break");
        setTime(BREAK_TIME);
        toast({
          title: "Focus session complete!",
          description: "Time for a 5-minute break. You earned 10 points!",
        });
      } else {
        setMode("focus");
        setTime(FOCUS_TIME);
        toast({
          title: "Break's over!",
          description: "Time to start another focus session.",
        });
      }
      setIsActive(false); // Pause after session ends
    }
    
    // Check for visibility change to pause timer
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isActive) {
        setIsActive(false);
        toast({
          variant: "destructive",
          title: "Timer Paused",
          description: "You navigated away. The timer is paused to ensure active focus.",
        });
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, time, mode, toast]);


  const toggleTimer = () => {
    setIsActive(!isActive);
  };
  
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const progress = (mode === 'focus' ? (FOCUS_TIME - time) / FOCUS_TIME : (BREAK_TIME - time) / BREAK_TIME) * 100;

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
                {mode === 'focus' ? <Clock className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                <span>{mode === "focus" ? "Focus Session" : "Short Break"}</span>
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
                {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {isActive ? "Pause" : "Start"}
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 text-center">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Award className="text-primary" />
                    <span>Sessions</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{sessions}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Gem className="text-accent" />
                    <span>Points Earned</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{points}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
