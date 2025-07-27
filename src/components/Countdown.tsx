
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

const FlipCard = ({ value }: { value: number }) => {
    const [flipped, setFlipped] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
  
    useEffect(() => {
      if (value !== currentValue) {
        setFlipped(true);
        setTimeout(() => {
          setCurrentValue(value);
          setFlipped(false);
        }, 600); // match animation duration
      }
    }, [value, currentValue]);

    const formattedValue = String(currentValue).padStart(2, '0');
  
    return (
        <div className={`flip-card ${flipped ? 'flipped' : ''}`}>
            <div className="top">{formattedValue}</div>
            <div className="bottom">{formattedValue}</div>
        </div>
    );
  };

const Countdown = ({ examDate }: { examDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<CountdownTime | null>(calculateTimeLeft(examDate));

  useEffect(() => {
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
        <div className="flex justify-center items-center gap-2 md:gap-4 text-3xl md:text-5xl font-mono font-bold text-primary">
            <div className="flex flex-col items-center">
                <div className="flex gap-1">
                    <FlipCard value={Math.floor(timeLeft.days / 10)} />
                    <FlipCard value={timeLeft.days % 10} />
                </div>
                <span className="text-xs font-sans text-muted-foreground mt-1">Days</span>
            </div>
            <span>:</span>
             <div className="flex flex-col items-center">
                <div className="flex gap-1">
                    <FlipCard value={Math.floor(timeLeft.hours / 10)} />
                    <FlipCard value={timeLeft.hours % 10} />
                </div>
                <span className="text-xs font-sans text-muted-foreground mt-1">Hours</span>
            </div>
             <span>:</span>
             <div className="flex flex-col items-center">
                <div className="flex gap-1">
                     <FlipCard value={Math.floor(timeLeft.minutes / 10)} />
                    <FlipCard value={timeLeft.minutes % 10} />
                </div>
                <span className="text-xs font-sans text-muted-foreground mt-1">Minutes</span>
            </div>
             <span>:</span>
            <div className="flex flex-col items-center">
                <div className="flex gap-1">
                    <FlipCard value={Math.floor(timeLeft.seconds / 10)} />
                    <FlipCard value={timeLeft.seconds % 10} />
                </div>
                <span className="text-xs font-sans text-muted-foreground mt-1">Seconds</span>
            </div>
        </div>
    </div>
  );
};

export default Countdown;
