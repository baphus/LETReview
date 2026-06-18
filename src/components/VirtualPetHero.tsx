'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/firebase/auth/use-user';
import { streakPets, achievementPets, rarePets } from '@/lib/data';
import { cn } from '@/lib/utils';
import { 
  Flame, Trophy, Brain, Stars, Moon, Coffee, Loader2, Send, Heart, 
  AlertCircle, Zap, Sparkles, PartyPopper, Frown, Clock, Sunrise, 
  BookOpen, Target, TrendingUp, TrendingDown, Timer
} from 'lucide-react';
import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { getPetAiMessage, chatWithPet } from '@/ai/flows/pet-message-flow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Topic } from '@/lib/types';

// Extended mood system with 12 moods for richer emotional expression
export type PetMood = 
  | 'proud' | 'happy' | 'motivated' | 'focused' | 'determined'
  | 'sleepy' | 'stressed' | 'concerned' | 'disappointed'
  | 'celebrating' | 'encouraging' | 'curious';

interface MoodConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgGlow: string;
  emoji: string;
}

const MOODS: Record<PetMood, MoodConfig> = {
  celebrating: { label: 'Celebrating!', icon: <PartyPopper className="h-3 w-3" />, color: 'bg-gradient-to-r from-yellow-400 to-amber-500', bgGlow: 'from-yellow-400/30', emoji: '🎉' },
  proud: { label: 'So Proud!', icon: <Trophy className="h-3 w-3" />, color: 'bg-gradient-to-r from-yellow-500 to-orange-500', bgGlow: 'from-yellow-500/20', emoji: '🏆' },
  motivated: { label: 'On Fire!', icon: <Flame className="h-3 w-3" />, color: 'bg-gradient-to-r from-red-500 to-orange-500', bgGlow: 'from-red-500/20', emoji: '🔥' },
  happy: { label: 'Happy', icon: <Stars className="h-3 w-3" />, color: 'bg-gradient-to-r from-green-500 to-emerald-500', bgGlow: 'from-green-500/20', emoji: '😊' },
  focused: { label: 'Deep Focus', icon: <Brain className="h-3 w-3" />, color: 'bg-gradient-to-r from-purple-500 to-indigo-500', bgGlow: 'from-purple-500/20', emoji: '🧠' },
  determined: { label: 'Determined', icon: <Zap className="h-3 w-3" />, color: 'bg-gradient-to-r from-blue-500 to-indigo-600', bgGlow: 'from-blue-500/20', emoji: '💪' },
  curious: { label: 'Curious', icon: <Sparkles className="h-3 w-3" />, color: 'bg-gradient-to-r from-cyan-500 to-blue-500', bgGlow: 'from-cyan-500/20', emoji: '✨' },
  encouraging: { label: 'Cheering You On', icon: <Heart className="h-3 w-3" />, color: 'bg-gradient-to-r from-pink-500 to-rose-500', bgGlow: 'from-pink-500/20', emoji: '💖' },
  sleepy: { label: 'Sleepy', icon: <Moon className="h-3 w-3" />, color: 'bg-gradient-to-r from-slate-400 to-blue-400', bgGlow: 'from-slate-400/20', emoji: '😴' },
  stressed: { label: 'Needs a Break', icon: <Coffee className="h-3 w-3" />, color: 'bg-gradient-to-r from-orange-500 to-amber-600', bgGlow: 'from-orange-500/20', emoji: '☕' },
  concerned: { label: 'Worried', icon: <AlertCircle className="h-3 w-3" />, color: 'bg-gradient-to-r from-amber-500 to-red-500', bgGlow: 'from-amber-500/20', emoji: '😟' },
  disappointed: { label: 'Missing You', icon: <Frown className="h-3 w-3" />, color: 'bg-gradient-to-r from-gray-500 to-slate-600', bgGlow: 'from-gray-500/20', emoji: '😢' },
};

// Context factors for mood computation
interface MoodContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  streak: number;
  daysInactive: number;
  averageScore: number;
  totalAnswers: number;
  todayQuestions: number;
  todayPomodoros: number;
  todayChallenges: number;
  todayPoints: number;
  daysUntilExam: number | null;
  isWeekend: boolean;
  recentTrend: 'improving' | 'declining' | 'stable' | 'new';
}

function getTimeOfDay(): MoodContext['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'lateNight';
}

function computeMood(ctx: MoodContext): PetMood {
  // Priority 1: Extended inactivity (3+ days)
  if (ctx.daysInactive >= 3) return 'disappointed';
  
  // Priority 2: Celebration moments
  if (ctx.streak > 0 && ctx.streak % 7 === 0) return 'celebrating'; // Weekly milestone
  if (ctx.todayPoints >= 200) return 'celebrating'; // Big day
  if (ctx.averageScore >= 90 && ctx.totalAnswers >= 30) return 'proud';
  
  // Priority 3: Late night studying
  if (ctx.timeOfDay === 'lateNight') {
    if (ctx.todayQuestions > 0) return 'stressed'; // Studying too late
    return 'sleepy';
  }
  
  // Priority 4: Performance-based
  if (ctx.averageScore < 50 && ctx.totalAnswers > 10) return 'concerned';
  if (ctx.recentTrend === 'declining' && ctx.totalAnswers > 15) return 'encouraging';
  
  // Priority 5: Exam pressure
  if (ctx.daysUntilExam !== null && ctx.daysUntilExam <= 7) {
    if (ctx.todayQuestions === 0) return 'concerned';
    return 'determined';
  }
  if (ctx.daysUntilExam !== null && ctx.daysUntilExam <= 30) return 'focused';
  
  // Priority 6: Streak & consistency
  if (ctx.streak >= 14) return 'motivated';
  if (ctx.streak >= 7) return 'proud';
  if (ctx.streak >= 3) return 'happy';
  
  // Priority 7: Today's activity level
  if (ctx.todayQuestions >= 20) return 'focused';
  if (ctx.todayChallenges >= 2) return 'motivated';
  if (ctx.todayPomodoros >= 2) return 'determined';
  
  // Priority 8: Time-of-day defaults
  if (ctx.timeOfDay === 'morning' && ctx.todayQuestions === 0) return 'curious';
  if (ctx.daysInactive === 1) return 'encouraging';
  
  // Priority 9: New user / weekend
  if (ctx.totalAnswers < 5) return 'curious';
  if (ctx.isWeekend && ctx.todayQuestions === 0) return 'sleepy';
  
  return 'happy';
}

export function VirtualPetHero() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [userChatInput, setUserChatInput] = useState("");
  
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: topics } = useCollection<Topic>(useMemoFirebase(() => firestore ? collection(firestore, 'topics') : null, [firestore]));

  const allPets = [...streakPets, ...achievementPets, ...rarePets];
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayStats = user?.dailyProgress?.[todayKey] || {};
  const streak = user?.streak || 0;
  const totalAnswers = user?.questionsAnswered || 0;
  const challengesToday = todayStats.challengesCompleted?.length || 0;

  const petProfile = useMemo(() => {
    const active = allPets.find((p) => p.name === user?.activePet);
    return active || allPets[0]; 
  }, [user?.activePet, allPets]);

  const petName = user?.petNames?.[petProfile.name] || petProfile.name;

  // Compute performance summary and trend
  const { performanceSummary, averageScore, recentTrend, weakTopics, strongTopics } = useMemo(() => {
    if (!user?.quizProgress || !topics) return { 
      performanceSummary: "No quiz data yet.", averageScore: 0, 
      recentTrend: 'new' as const, weakTopics: [] as string[], strongTopics: [] as string[] 
    };
    
    let totalScore = 0;
    let topicCount = 0;
    const weak: string[] = [];
    const strong: string[] = [];
    
    const summaries = Object.entries(user.quizProgress).map(([id, stats]) => {
      const topic = topics.find(t => t.id === id);
      const name = topic?.name || 'Topic';
      totalScore += stats.averageScore;
      topicCount++;
      
      if (stats.averageScore < 65) weak.push(name);
      else if (stats.averageScore >= 85) strong.push(name);
      
      return `${name}: ${stats.averageScore.toFixed(0)}%`;
    });
    
    // Determine trend from recent scores
    let trend: 'improving' | 'declining' | 'stable' | 'new' = 'stable';
    const allScores = Object.values(user.quizProgress).flatMap(s => s.scores || []);
    if (allScores.length >= 4) {
      const recent = allScores.slice(-3);
      const older = allScores.slice(-6, -3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    } else if (allScores.length < 3) {
      trend = 'new';
    }
    
    return {
      performanceSummary: summaries.length > 0 ? summaries.join(', ') : "No quiz data yet.",
      averageScore: topicCount > 0 ? totalScore / topicCount : 0,
      recentTrend: trend,
      weakTopics: weak,
      strongTopics: strong,
    };
  }, [user?.quizProgress, topics]);

  // Calculate days inactive
  const daysInactive = useMemo(() => {
    if (!user?.dailyProgress) return 0;
    const keys = Object.keys(user.dailyProgress).sort().reverse();
    for (const key of keys) {
      const progress = user.dailyProgress[key];
      if ((progress.questionsAnswered || 0) > 0 || (progress.pomodorosCompleted || 0) > 0 || (progress.challengesCompleted?.length || 0) > 0) {
        return differenceInDays(new Date(), parseISO(key));
      }
    }
    return 7; // No activity found
  }, [user?.dailyProgress]);

  // Compute days until exam
  const daysUntilExam = useMemo(() => {
    if (!user?.examDate) return null;
    const diff = differenceInDays(new Date(user.examDate), new Date());
    return diff > 0 ? diff : null;
  }, [user?.examDate]);

  // Compute mood with full context
  const moodConfig = useMemo(() => {
    const ctx: MoodContext = {
      timeOfDay: getTimeOfDay(),
      streak,
      daysInactive,
      averageScore,
      totalAnswers,
      todayQuestions: todayStats.questionsAnswered || 0,
      todayPomodoros: todayStats.pomodorosCompleted || 0,
      todayChallenges: challengesToday,
      todayPoints: todayStats.pointsEarned || 0,
      daysUntilExam,
      isWeekend: [0, 6].includes(new Date().getDay()),
      recentTrend,
    };
    
    const mood = computeMood(ctx);
    return MOODS[mood];
  }, [streak, daysInactive, averageScore, totalAnswers, todayStats, challengesToday, daysUntilExam, recentTrend]);

  // Pet XP / Level system
  const petLevel = user?.petLevel || 1;
  const petXP = user?.petXP || 0;
  const xpForNextLevel = petLevel * 100; // 100, 200, 300... XP per level
  const xpProgress = Math.min((petXP / xpForNextLevel) * 100, 100);

  const startTypewriter = (text: string) => {
    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    
    setDisplayedMessage("");
    let i = 0;
    typewriterIntervalRef.current = setInterval(() => {
      setDisplayedMessage(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
      }
    }, 20);
  };

  useEffect(() => {
    if (aiMessage) {
      startTypewriter(aiMessage);
    }
  }, [aiMessage]);

  // Fetch AI greeting on mount
  useEffect(() => {
    if (!user || !topics) return;
    const fetchGreeting = async () => {
      setIsGenerating(true);
      try {
        const response = await getPetAiMessage({
          petName,
          userName: user.name,
          mood: moodConfig.label,
          streak,
          todayPoints: todayStats.pointsEarned || 0,
          totalAnswers,
          challengesToday,
          performanceSummary,
          availableTopics: topics.map(t => t.name),
        });
        setAiMessage(response.message);
      } catch (error) {
        setAiMessage(null);
      } finally {
        setIsGenerating(false);
      }
    };
    fetchGreeting();
  }, [user?.uid, user?.activePet, !!topics, moodConfig.label]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatInput.trim() || isGenerating) return;

    const input = userChatInput.trim();
    setUserChatInput("");
    setIsGenerating(true);
    setAiMessage(null); 

    try {
      const response = await chatWithPet({
        petName,
        userName: user?.name || "Teacher",
        mood: moodConfig.label,
        streak,
        todayPoints: todayStats.pointsEarned || 0,
        totalAnswers,
        challengesToday,
        userMessage: input,
        performanceSummary,
        availableTopics: topics?.map(t => t.name) || [],
      });
      setAiMessage(response.message);
    } catch (e) {
      setAiMessage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full mb-6">
      {/* Pet Card with glass morphism effect */}
      <div className="relative rounded-3xl border bg-card/80 backdrop-blur-sm p-6 overflow-hidden">
        {/* Background glow */}
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[100px] opacity-30 transition-all duration-1000 bg-gradient-to-b",
          moodConfig.bgGlow
        )} />
        
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Speech bubble */}
          <div className="w-full max-w-sm animate-fade-in-up">
            <div className="relative bg-background/90 backdrop-blur-sm border shadow-sm rounded-2xl p-4 text-center min-h-[72px] flex items-center justify-center">
              {isGenerating && !aiMessage ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{petName} is thinking...</span>
                </div>
              ) : (
                <p className="text-sm font-medium leading-relaxed text-foreground px-1">
                  {displayedMessage || `${moodConfig.emoji} ...`}
                </p>
              )}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-background/90" />
            </div>
          </div>

          {/* Pet avatar with mood glow */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-full blur-2xl opacity-25 transition-all duration-700 scale-125",
                moodConfig.color
              )} />
              <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center overflow-hidden">
                <Image
                  src={petProfile.image}
                  alt={petName}
                  width={144}
                  height={144}
                  className="animate-bob p-1 drop-shadow-2xl object-contain"
                  data-ai-hint={petProfile.hint}
                />
              </div>
            </div>
            
            {/* Pet name & mood */}
            <h2 className="mt-3 text-xl font-bold font-headline">{petName}</h2>
            <Badge variant="secondary" className={cn("mt-1.5 gap-1 text-white border-none px-3 py-1 text-xs shadow-sm", moodConfig.color)}>
              {moodConfig.icon}
              {moodConfig.label}
            </Badge>

            {/* Pet Level Progress */}
            <div className="mt-3 w-full max-w-[200px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lv. {petLevel}</span>
                <span className="text-[10px] text-muted-foreground">{petXP}/{xpForNextLevel} XP</span>
              </div>
              <Progress value={xpProgress} className="h-1.5" />
            </div>
          </div>

          {/* Chat input */}
          <form onSubmit={handleChat} className="flex w-full max-w-sm items-center space-x-2">
            <Input 
              type="text" 
              placeholder={`Ask ${petName} anything...`} 
              value={userChatInput}
              onChange={(e) => setUserChatInput(e.target.value)}
              className="flex-1 rounded-full bg-background border-border focus-visible:ring-primary h-10 text-sm"
              disabled={isGenerating}
            />
            <Button type="submit" size="icon" className="rounded-full shrink-0 h-10 w-10" disabled={isGenerating || !userChatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick stats row */}
          <div className="w-full max-w-md grid grid-cols-4 gap-2 mt-1">
            <StatPill icon={<Flame className="h-4 w-4 text-destructive" />} value={streak} label="Streak" />
            <StatPill icon={<Target className="h-4 w-4 text-primary" />} value={`${averageScore.toFixed(0)}%`} label="Avg" />
            <StatPill icon={<BookOpen className="h-4 w-4 text-accent" />} value={todayStats.questionsAnswered || 0} label="Today" />
            <StatPill icon={<Timer className="h-4 w-4 text-purple-500" />} value={todayStats.pomodorosCompleted || 0} label="Focus" />
          </div>

          {/* Context-aware tips */}
          {daysUntilExam !== null && daysUntilExam <= 30 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 mt-1">
              <Clock className="h-3 w-3" />
              <span><strong>{daysUntilExam}</strong> days until your exam</span>
            </div>
          )}

          {weakTopics.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-full px-3 py-1.5">
              <TrendingDown className="h-3 w-3" />
              <span>Focus on: <strong>{weakTopics.slice(0, 2).join(', ')}</strong></span>
            </div>
          )}

          {recentTrend === 'improving' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-full px-3 py-1.5">
              <TrendingUp className="h-3 w-3" />
              <span>Your scores are improving! Keep it up!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-muted/40 rounded-xl p-2.5 border border-transparent hover:border-primary/10 transition-colors">
      {icon}
      <span className="text-sm font-bold leading-none">{value}</span>
      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
