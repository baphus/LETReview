'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PetMood } from './VirtualPetHero';

interface PetAvatarProps {
  src: string;
  name: string;
  mood: PetMood;
  hint?: string;
  size?: number;
}

// Mood-specific animation classes
const MOOD_ANIMATIONS: Record<PetMood, string> = {
  celebrating: 'animate-pet-bounce',
  proud: 'animate-pet-swell',
  motivated: 'animate-pet-pulse-fast',
  happy: 'animate-pet-bob',
  focused: 'animate-pet-breathe',
  determined: 'animate-pet-nod',
  curious: 'animate-pet-tilt',
  encouraging: 'animate-pet-wave',
  sleepy: 'animate-pet-drowsy',
  stressed: 'animate-pet-shake',
  concerned: 'animate-pet-worried',
  disappointed: 'animate-pet-droop',
};

// Particles/expressions per mood
const MOOD_PARTICLES: Record<PetMood, { emoji: string; count: number; animation: string }> = {
  celebrating: { emoji: '🎉', count: 4, animation: 'animate-particle-burst' },
  proud: { emoji: '⭐', count: 3, animation: 'animate-particle-float' },
  motivated: { emoji: '🔥', count: 3, animation: 'animate-particle-rise' },
  happy: { emoji: '✨', count: 3, animation: 'animate-particle-sparkle' },
  focused: { emoji: '💡', count: 1, animation: 'animate-particle-pulse' },
  determined: { emoji: '💪', count: 2, animation: 'animate-particle-pop' },
  curious: { emoji: '❓', count: 1, animation: 'animate-particle-wobble' },
  encouraging: { emoji: '💖', count: 3, animation: 'animate-particle-float' },
  sleepy: { emoji: '💤', count: 2, animation: 'animate-particle-drift' },
  stressed: { emoji: '😰', count: 1, animation: 'animate-particle-shake' },
  concerned: { emoji: '😟', count: 1, animation: 'animate-particle-wobble' },
  disappointed: { emoji: '🥺', count: 1, animation: 'animate-particle-drip' },
};

// Expression overlay (shows on/near the pet)
const MOOD_EXPRESSIONS: Record<PetMood, { emoji: string; position: string }> = {
  celebrating: { emoji: '🥳', position: '-top-2 -right-1' },
  proud: { emoji: '😎', position: '-top-1 -right-1' },
  motivated: { emoji: '😤', position: '-top-1 right-0' },
  happy: { emoji: '😊', position: '-top-1 -right-1' },
  focused: { emoji: '🧐', position: '-top-2 right-0' },
  determined: { emoji: '😠', position: '-top-1 -right-1' },
  curious: { emoji: '🤔', position: '-top-2 right-0' },
  encouraging: { emoji: '🥰', position: '-top-1 -right-1' },
  sleepy: { emoji: '😴', position: '-top-1 right-0' },
  stressed: { emoji: '😅', position: '-top-1 -right-1' },
  concerned: { emoji: '😰', position: '-top-2 right-0' },
  disappointed: { emoji: '🥺', position: '-top-1 -right-1' },
};

export function PetAvatar({ src, name, mood, hint, size = 144 }: PetAvatarProps) {
  const animation = MOOD_ANIMATIONS[mood];
  const particles = MOOD_PARTICLES[mood];
  const expression = MOOD_EXPRESSIONS[mood];

  // Generate particle positions (deterministic based on count)
  const particleElements = useMemo(() => {
    return Array.from({ length: particles.count }).map((_, i) => {
      const angle = (360 / particles.count) * i;
      const delay = i * 0.4;
      return (
        <span
          key={i}
          className={cn("absolute text-lg pointer-events-none", particles.animation)}
          style={{
            top: '20%',
            left: '50%',
            transform: `rotate(${angle}deg) translateY(-${size * 0.5}px)`,
            animationDelay: `${delay}s`,
            opacity: 0,
          }}
          aria-hidden
        >
          {particles.emoji}
        </span>
      );
    });
  }, [mood, particles, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {particleElements}
      </div>

      {/* Expression emoji overlay */}
      <div className={cn(
        "absolute z-30 text-2xl pointer-events-none animate-pet-expression",
        expression.position
      )}>
        {expression.emoji}
      </div>

      {/* Pet image with mood animation */}
      <div className={cn("w-full h-full flex items-center justify-center", animation)}>
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="drop-shadow-2xl object-contain p-1"
          data-ai-hint={hint}
          priority
        />
      </div>

      {/* Mood-reactive eye shine effect */}
      <div className={cn(
        "absolute top-[35%] left-[45%] w-2 h-2 rounded-full bg-white/60 blur-[1px] pointer-events-none",
        mood === 'sleepy' || mood === 'disappointed' ? 'opacity-0' : 'animate-pet-eyeshine'
      )} />
    </div>
  );
}
