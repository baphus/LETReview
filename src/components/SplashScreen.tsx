
"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Logo from './Logo';

export default function SplashScreen() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 2500); // Start fade out after 2.5s

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500",
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            <div className="animate-fade-in-up">
                <Logo className="h-24 w-24 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline mt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                LETReview
            </h1>
            <p className="text-muted-foreground mt-2 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                Let's set you up for success.
            </p>
        </div>
    );
}
