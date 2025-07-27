
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/use-timer";

export default function TimerPage() {
  const { 
    time, 
    isActive, 
    mode, 
    sessions, 
    toggleTimer, 
    resetTimer,
    FOCUS_TIME,
    BREAK_TIME
  } = useTimer();
  
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  
  const progress = (
    mode === 'focus' 
      ? (FOCUS_TIME - time) / FOCUS_TIME 
      : (BREAK_TIME - time) / BREAK_TIME
  ) * 100;

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
                <p className="text-3xl font-bold">{sessions}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
