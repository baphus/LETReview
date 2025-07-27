
"use client";

import { useState, useEffect } from 'react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (examDate: Date): CountdownTime | null => {
  const difference = +examDate - +new Date();
  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  return null;
};

const StaticCard = ({ value, label }: { value: string, label: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="p-2 rounded-lg bg-primary text-primary-foreground">
        <span className="text-3xl md:text-5xl font-mono font-bold">{value}</span>
      </div>
      <span className="text-xs font-sans text-muted-foreground mt-1">{label}</span>
    </div>
  )
}

const Countdown = ({ examDate }: { examDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<CountdownTime | null>(null);

  useEffect(() => {
    // This should only run on the client side
    setTimeLeft(calculateTimeLeft(examDate));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(examDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [examDate]);


  if (!timeLeft) {
    return (
        <div className="text-center p-4 rounded-lg bg-primary text-primary-foreground mb-6">
            <h2 className="text-xl font-bold font-headline">Good luck on your exam!</h2>
        </div>
    );
  }

  return (
    <div className="text-center p-4 rounded-lg bg-card border shadow-sm mb-6">
        <h2 className="text-lg font-bold font-headline mb-4">Countdown to Your Exam</h2>
        <div className="flex justify-center items-start gap-2 md:gap-4">
            <StaticCard value={String(timeLeft.days).padStart(2, '0')} label="Days" />
            <span className="text-3xl md:text-5xl font-mono font-bold text-primary pt-1">:</span>
            <StaticCard value={String(timeLeft.hours).padStart(2, '0')} label="Hours" />
            <span className="text-3xl md:text-5xl font-mono font-bold text-primary pt-1">:</span>
            <StaticCard value={String(timeLeft.minutes).padStart(2, '0')} label="Minutes" />
            <span className="text-3xl md:text-5xl font-mono font-bold text-primary pt-1">:</span>
            <StaticCard value={String(timeLeft.seconds).padStart(2, '0')} label="Seconds" />
        </div>
    </div>
  );
};

export default Countdown;
