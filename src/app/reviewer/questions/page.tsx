
"use client";

import { useState, useMemo, type FC, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, XCircle, Trophy, Shuffle, RefreshCcw, PlusCircle, BarChart, Gauge, Repeat, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQuestions } from "@/lib/data";
import type { QuizQuestion, TopicQuizProgress } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Label } from "@/components/ui/label";

const StudyCard: FC<{ question: QuizQuestion }> = ({ question }) => {
  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice, index) => {
                const isCorrect = choice === question.correctAnswer;
                return (
                    <Card 
                        key={`${choice}-${index}`}
                        className={cn(
                            "p-4",
                            isCorrect ? "border-green-500 bg-green-50" : "bg-muted/40"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <p className={cn(isCorrect && "font-semibold text-green-800")}>{choice}</p>
                            {isCorrect && <CheckCircle className="h-5 w-5 text-green-500" />}
                        </div>
                    </Card>
                )
            })}
        </div>
        {question.explanation && (
          <div className="p-4 bg-blue-50 border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-1">Explanation</h4>
            <p className="text-sm text-blue-700">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const QuizCard: FC<{ 
  question: QuizQuestion;
  onAnswer: (correct: boolean, answer: string) => void;
}> = ({ question, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleAnswerClick = (answer: string) => {
    const correct = answer === question.correctAnswer;
    setSelectedAnswer(answer);
    onAnswer(correct, answer);
  };
  
  useEffect(() => {
    setSelectedAnswer(null);
  }, [question]);


  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;

                const getChallengeClass = () => {
                    if (isSelected) return "bg-muted border-primary";
                    return "hover:bg-muted cursor-pointer";
                };

                return (
                    <Card 
                        key={`${choice}-${index}`}
                        onClick={() => handleAnswerClick(choice)}
                        className={cn("p-4 transition-all rounded-lg", getChallengeClass())}
                    >
                        <div className="flex items-center justify-between">
                            <p>{choice}</p>
                        </div>
                    </Card>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
};

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');


interface ChallengeAnswer {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    question: string;
}

const QuestionSkeleton = () => (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <Skeleton className="h-8 w-3/4" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
)

const positiveEmojis = ['✨', '🎉', '👍', '✅', '💯'];

function QuestionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, updateUser } = useUser();
  const firestore = useFirestore();

  const [initialQuizPhase, setInitialQuizPhase] = useState<'settings' | 'active' | 'study'>('study');
  
  const isChallenge = searchParams.get('challenge') === 'true';
  const challengeDifficulty = searchParams.get('difficulty') || 'easy';
  const challengeCount = parseInt(searchParams.get('count') || '0', 10);
  const challengeCategory = searchParams.get('category') as 'gened' | 'profed' | 'majorship' || "gened";
  const topicId = searchParams.get('topic');

  const [category, setCategory] = useState<'gened' | 'profed' | 'majorship'>("gened");
  const [quizPhase, setQuizPhase] = useState<'settings' | 'active' | 'results' | 'study'>(initialQuizPhase);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<ChallengeAnswer[]>([]);
  const [passingScore, setPassingScore] = useState(85);
  const [isShuffled, setIsShuffled] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicName, setTopicName] = useState<string | null>(null);
  
  const [topicStats, setTopicStats] = useState<TopicQuizProgress | null>(null);
  const [practiceQuizConfig, setPracticeQuizConfig] = useState({ count: 10, difficulty: 'all' });
  
  const [quizStreak, setQuizStreak] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('✨');

  const { toast } = useToast();
  
  useEffect(() => {
    let phase: 'settings' | 'active' | 'study' = 'study';
    if (isChallenge) {
      phase = 'active';
      setCategory(challengeCategory);
    } else if (topicId) {
      phase = 'settings';
    }
    setInitialQuizPhase(phase);
    setQuizPhase(phase);
  }, [isChallenge, challengeCategory, topicId]);

  useEffect(() => {
    if (topicId && firestore) {
        const topicRef = doc(firestore, 'topics', topicId);
        getDoc(topicRef).then(docSnap => {
            if (docSnap.exists()) {
                setTopicName(docSnap.data().name);
            }
        });
    } else {
        setTopicName(null);
    }
  }, [topicId, firestore]);
  
  useEffect(() => {
    if (user) {
        setPassingScore(user.passingScore || 85);
        if (topicId) {
            setTopicStats(user.quizProgress?.[topicId] || { scores: [], highestScore: 0, averageScore: 0 });
        }
    }
  }, [user, topicId]);

  const fetchAndSetQuestions = useCallback(async (config?: { count: number, difficulty: string }) => {
      setIsLoading(true);
      
      const difficulty = config?.difficulty === 'all' ? undefined : config?.difficulty as 'easy' | 'medium' | 'hard';
      
      const fetchedQuestions = await getQuestions({
          category: topicId ? undefined : category,
          difficulty: isChallenge ? challengeDifficulty as any : difficulty,
          limit: isChallenge ? challengeCount : config?.count,
          shuffle: isChallenge || isShuffled || !!topicId,
          topicId: topicId || undefined,
      });
      setQuestions(fetchedQuestions);
      setIsLoading(false);
  }, [category, isChallenge, challengeDifficulty, challengeCount, isShuffled, topicId]);

  useEffect(() => {
    if ((isChallenge && quizPhase === 'active') || (quizPhase === 'study' && !topicId && !isChallenge)) {
      fetchAndSetQuestions();
    }
  }, [fetchAndSetQuestions, quizPhase, topicId, isChallenge]);
  
  const currentQuestion = questions[currentIndex];

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setQuizScore(0);
    setShowResults(false);
    setChallengeAnswers([]);
    setQuizStreak(0);
    
    if (topicId) {
        setQuizPhase('settings');
    } else if (!isChallenge) {
        fetchAndSetQuestions();
    }
    
  }, [fetchAndSetQuestions, topicId, isChallenge]);

  const handleFinishQuiz = useCallback(async (finalAnswers: ChallengeAnswer[], finalScore: number) => {
    if (quizStreak > 0 && user && quizStreak > (user.highestQuizStreak || 0)) {
        updateUser({ highestQuizStreak: quizStreak });
    }

    if (isChallenge) {
        setShowResults(true);

        const scorePercentage = (finalScore / questions.length) * 100;
        const passed = scorePercentage >= passingScore;
        const todayKey = getTodayKey();
        const challengeId = `${challengeDifficulty}-${challengeCategory}`;
        
        if (passed) {
            const todaysChallenges = user?.dailyProgress?.[todayKey]?.challengesCompleted || [];
            const alreadyCompletedToday = todaysChallenges.includes(challengeId);
            
            let updates: any = {};
            
            if (!alreadyCompletedToday) {
                updates.dailyProgress = {
                    ...user?.dailyProgress,
                    [todayKey]: {
                        ...user?.dailyProgress?.[todayKey],
                        challengesCompleted: [...todaysChallenges, challengeId]
                    }
                };
            }

            const wasAnyChallengeCompletedToday = user?.lastChallengeDate === todayKey;
            const pointsMap = { easy: 25, medium: 75, hard: 150 };
            const pointsEarned = pointsMap[challengeDifficulty as keyof typeof pointsMap] || 0;

            if (!wasAnyChallengeCompletedToday) {
                updates.streak = (user?.streak || 0) + 1;
                if ((updates.streak) > (user?.highestStreak || 0)) {
                    updates.highestStreak = updates.streak;
                }
                updates.lastChallengeDate = todayKey;
                updates.points = (user?.points || 0) + pointsEarned;
                
                updates.dailyProgress = {
                    ...updates.dailyProgress,
                    [todayKey]: {
                        ...updates.dailyProgress?.[todayKey],
                        pointsEarned: (updates.dailyProgress?.[todayKey]?.pointsEarned || 0) + pointsEarned
                    }
                };

                toast({
                    title: "Challenge Passed!",
                    description: `You earned ${pointsEarned} points and secured your streak!`,
                    className: "bg-green-100 border-green-300"
                });
            } else {
                 if (!alreadyCompletedToday) {
                    updates.points = (user?.points || 0) + pointsEarned;
                     updates.dailyProgress = {
                        ...updates.dailyProgress,
                        [todayKey]: {
                            ...updates.dailyProgress?.[todayKey],
                            pointsEarned: (updates.dailyProgress?.[todayKey]?.pointsEarned || 0) + pointsEarned
                        }
                    };

                    toast({
                        title: "Challenge Passed!",
                        description: `You passed another challenge and earned ${pointsEarned} points!`,
                        className: "bg-green-100 border-green-300"
                    });
                 } else {
                     toast({
                        title: "Challenge Complete!",
                        description: `You've already earned points for this challenge today.`,
                        className: "bg-blue-100 border-blue-300"
                    });
                 }
            }
            if (user) updateUser(updates);
        }
    } else if (topicId && user) {
        setQuizPhase('results');
        const scorePercentage = (finalScore / questions.length) * 100;
        
        const existingProgress = user.quizProgress?.[topicId] || { scores: [], highestScore: 0, averageScore: 0 };
        const newScores = [...existingProgress.scores, scorePercentage];
        const newHighest = Math.max(existingProgress.highestScore, scorePercentage);
        const newAverage = newScores.reduce((a, b) => a + b, 0) / newScores.length;

        const updatePayload = {
            quizProgress: {
                ...user.quizProgress,
                [topicId]: {
                    scores: newScores,
                    highestScore: newHighest,
                    averageScore: newAverage,
                }
            }
        };
        updateUser(updatePayload);
    }
  }, [isChallenge, questions.length, passingScore, challengeDifficulty, challengeCategory, user, updateUser, toast, topicId, quizStreak]);

  const handleAnswer = (correct: boolean, answer: string) => {
    if (!isChallenge) {
        if (correct) {
            const newStreak = quizStreak + 1;
            setQuizStreak(newStreak);

            setCurrentEmoji(positiveEmojis[Math.floor(Math.random() * positiveEmojis.length)]);
            setShowEmoji(true);
            setTimeout(() => setShowEmoji(false), 1000);

            if (newStreak > 1) {
                setShowStreak(true);
                setTimeout(() => setShowStreak(false), 1500);
            }
        } else {
            if (quizStreak > 0) {
                toast({
                    variant: "destructive",
                    title: "Streak Lost!",
                    description: `You had a streak of ${quizStreak}. Keep trying!`,
                });
                if (user && quizStreak > (user.highestQuizStreak || 0)) {
                    updateUser({ highestQuizStreak: quizStreak });
                }
            }
            setQuizStreak(0);
        }
    }
    
    if (correct && user && !user.answeredQuestionIds?.includes(currentQuestion.id)) {
        const todayKey = getTodayKey();
        const dailyProgress = user.dailyProgress?.[todayKey] || {};
        updateUser({ 
            questionsAnswered: (user.questionsAnswered || 0) + 1,
            answeredQuestionIds: [...(user.answeredQuestionIds || []), currentQuestion.id],
            dailyProgress: {
                ...user.dailyProgress,
                [todayKey]: {
                    ...dailyProgress,
                    questionsAnswered: (dailyProgress.questionsAnswered || 0) + 1,
                }
            }
        });
    }

    const newAnswer: ChallengeAnswer = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: correct,
        question: currentQuestion.question,
    };

    const newAnswers = [...challengeAnswers.filter(a => a.questionId !== currentQuestion.id), newAnswer];
    setChallengeAnswers(newAnswers);
    
    const advanceTimeout = isChallenge ? 300 : 1200;

    setTimeout(() => {
        if (currentIndex < questions.length - 1) {
             setCurrentIndex((prev) => prev + 1);
        } else {
            const finalScore = newAnswers.reduce((acc, ans) => acc + (ans.isCorrect ? 1 : 0), 0);
            setQuizScore(finalScore);
            handleFinishQuiz(newAnswers, finalScore);
        }
    }, advanceTimeout);
  };
  
    const handleStartPracticeQuiz = () => {
        setCurrentIndex(0);
        setChallengeAnswers([]);
        setQuizScore(0);
        setQuizStreak(0);
        fetchAndSetQuestions(practiceQuizConfig);
        setQuizPhase('active');
    };

  const handleDialogClose = () => {
    setShowResults(false);
    if (isChallenge) {
      router.push('/daily');
    } else {
      resetQuizState();
    }
  }

  const handleShuffleToggle = () => {
    setIsShuffled(prev => !prev);
  }
  
  const handleTryAgain = () => {
    setShowResults(false);
    setCurrentIndex(0);
    setChallengeAnswers([]);
    setQuizScore(0);
    setQuizStreak(0);
    fetchAndSetQuestions();
  };
  
  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isChallengePassed = showResults && isChallenge && (quizScore / questions.length * 100) >= passingScore;

  if (isLoading && (quizPhase !== 'settings')) {
    return (
      <div className="container mx-auto p-4 max-w-2xl text-center">
          {isChallenge ? (
            <>
                <header className="flex flex-col gap-4 mb-6 text-center">
                    <h1 className="text-3xl font-bold font-headline capitalize">{challengeDifficulty} Daily Challenge</h1>
                    <p className="text-muted-foreground">Preparing your challenge...</p>
                </header>
                <QuestionSkeleton />
            </>
          ) : (
             <QuestionSkeleton />
          )}
      </div>
    )
  }
  
  if (isChallenge && !isLoading && questions.length === 0) {
     return (
        <div className="container mx-auto p-4 max-w-2xl text-center">
            <p>Could not load questions for the challenge.</p>
        </div>
    )
  }

  const getCategoryName = (category: 'gened' | 'profed' | 'majorship') => {
      switch (category) {
          case 'gened': return 'General Education';
          case 'profed': return 'Professional Education';
          case 'majorship': return 'Majorship';
      }
  }

  if (topicId && !isChallenge) {
    if (quizPhase === 'settings') {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <header>
            <h1 className="text-3xl font-bold font-headline">Practice Quiz</h1>
            <p className="text-muted-foreground">Topic: {topicName || 'Loading...'}</p>
          </header>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary"/> Your Stats for this Topic</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                    <p className="text-3xl font-bold">{topicStats?.highestScore.toFixed(0) || 0}%</p>
                </div>
                 <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-3xl font-bold">{topicStats?.averageScore.toFixed(0) || 0}%</p>
                </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Quiz Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Number of Questions</Label>
                    <Select value={String(practiceQuizConfig.count)} onValueChange={(val) => setPracticeQuizConfig(c => ({...c, count: Number(val)}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label>Difficulty</Label>
                    <Select value={practiceQuizConfig.difficulty} onValueChange={(val) => setPracticeQuizConfig(c => ({...c, difficulty: val}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Difficulties</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleStartPracticeQuiz}>Start Quiz</Button>
            </CardFooter>
          </Card>
        </div>
      )
    }
    
    if (quizPhase === 'results') {
      const scorePercent = (quizScore / questions.length) * 100;
        return (
             <div className="max-w-2xl mx-auto space-y-6">
                <header className="text-center">
                    <Trophy className="h-16 w-16 text-yellow-400 mx-auto" />
                    <h1 className="text-3xl font-bold font-headline mt-2">Quiz Complete!</h1>
                    <p className="text-muted-foreground">You scored {quizScore} out of {questions.length}</p>
                </header>
                <Card>
                    <CardHeader><CardTitle className="text-center">{scorePercent.toFixed(0)}%</CardTitle></CardHeader>
                    <CardContent><Progress value={scorePercent} /></CardContent>
                </Card>
                <ScrollArea className="max-h-80 mt-4 border rounded-lg">
                  <div className="space-y-4 p-4">
                      {challengeAnswers.map(answer => (
                          <div key={answer.questionId} className="text-sm p-3 rounded-lg bg-muted">
                              <p className="font-semibold mb-1">{answer.question}</p>
                              {answer.isCorrect ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                      <CheckCircle className="h-4 w-4 shrink-0" /> 
                                      <span>Your answer: {answer.userAnswer}</span>
                                  </div>
                              ) : (
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-red-600">
                                          <XCircle className="h-4 w-4 shrink-0" />
                                          <span>Your answer: {answer.userAnswer}</span>
                                      </div>
                                          <div className="flex items-center gap-2 text-green-600 pl-6">
                                          <span>Correct answer: {answer.correctAnswer}</span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full" onClick={() => setQuizPhase('settings')}>
                        <Repeat className="mr-2 h-4 w-4"/>
                        Take Another Quiz
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Article
                    </Button>
                </div>
            </div>
        )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
       <Dialog open={showResults} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold font-headline">Challenge Complete!</DialogTitle>
            <DialogDescription className="text-center">
              You scored {quizScore} out of {questions.length}.
            </DialogDescription>
          </DialogHeader>
           {isChallenge && (
                isChallengePassed ? (
                    <div className="text-center text-green-600 font-semibold p-4 bg-green-50 rounded-lg">
                        <Trophy className="h-12 w-12 mx-auto text-yellow-400 mb-2" />
                        <p>Congratulations! You passed the challenge.</p>
                    </div>
                ) : (
                    <div className="text-center text-red-600 font-semibold p-4 bg-red-50 rounded-lg">
                        <p>So close! You needed {passingScore}% to pass. Don't give up!</p>
                    </div>
                )
            )}
          <ScrollArea className="max-h-60 mt-4 pr-6">
              <div className="space-y-4">
                  {challengeAnswers.map(answer => (
                      <div key={answer.questionId} className="text-sm p-3 rounded-lg bg-muted">
                          <p className="font-semibold mb-1">{answer.question}</p>
                          {answer.isCorrect ? (
                              <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-4 w-4 shrink-0" /> 
                                  <span>Your answer: {answer.userAnswer}</span>
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-red-600">
                                      <XCircle className="h-4 w-4 shrink-0" />
                                      <span>Your answer: {answer.userAnswer}</span>
                                  </div>
                                      <div className="flex items-center gap-2 text-green-600 pl-6">
                                      <span>Correct answer: {answer.correctAnswer}</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </ScrollArea>
          <DialogFooter className="mt-4 flex-col sm:flex-col sm:space-x-0 gap-2">
            {!isChallengePassed && isChallenge && (
                <Button onClick={handleTryAgain} variant="secondary">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
            )}
            <Button onClick={handleDialogClose} className="w-full">
                {isChallenge ? 'Back to Challenges' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {!isChallenge && !topicId && (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-6">
                 <Select value={category} onValueChange={(value) => setCategory(value as "gened" | "profed" | "majorship")}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gened">General Education</SelectItem>
                        <SelectItem value="profed">Professional Education</SelectItem>
                        <SelectItem value="majorship">Majorship</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-2 justify-start sm:justify-end">
                    <Button 
                        variant={isShuffled ? "secondary" : "outline"} 
                        onClick={handleShuffleToggle}
                        aria-label="Shuffle questions"
                        className="w-full sm:w-auto"
                    >
                        <Shuffle className="h-4 w-4 mr-2" />
                        {isShuffled ? "Shuffled" : "Shuffle"}
                    </Button>
                     {isAdmin && (
                        <Link href="/reviewer/questions/new" passHref className="w-full sm:w-auto">
                            <Button className="w-full justify-center">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </>
      )}

      {isChallenge && (
         <header className="flex flex-col gap-4 mb-6 text-center">
            <h1 className="text-3xl font-bold font-headline capitalize">{challengeDifficulty} Daily Challenge</h1>
            <p className="text-muted-foreground">Answer all {questions.length} {getCategoryName(challengeCategory)} questions. You need {passingScore}% to pass.</p>
        </header>
      )}

      <div className="my-6">
        {questions.length > 0 && currentQuestion ? (
          <div className="relative">
            {isChallenge || (topicId && quizPhase === 'active') ? (
              <QuizCard 
                question={currentQuestion} 
                onAnswer={handleAnswer} 
              />
            ) : (
                quizPhase === 'study' && <StudyCard question={currentQuestion} />
            )}
             {showEmoji && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl animate-emoji-pop">{currentEmoji}</span>
                </div>
            )}
            {showStreak && (
                <div className="pointer-events-none absolute -top-4 -right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-lg font-bold animate-combo-pop">
                    🔥 Streak x{quizStreak}!
                </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <Card className="h-80 flex justify-center items-center">
               <div className="text-center text-muted-foreground">
                <p>No questions found for this criteria.</p>
                {isChallenge && <p>Please check back tomorrow for new questions.</p>}
              </div>
            </Card>
          )
        )}
      </div>

      {(quizPhase === 'study' && !topicId && !isChallenge) && (
         <footer className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
            </p>
            </div>
            <Progress value={progressValue} />
            <div className="flex justify-between items-center">
            <Button onClick={() => setCurrentIndex(p => p > 0 ? p-1 : questions.length - 1)} disabled={questions.length <= 1}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
            </Button>
            <Button onClick={() => setCurrentIndex(p => p < questions.length - 1 ? p+1 : 0)}>
                {currentIndex === questions.length - 1 ? 'Start Over' : 'Next'}
                {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
            </div>
        </footer>
      )}

       {(isChallenge || (topicId && quizPhase === 'active')) && (
         <footer className="flex flex-col gap-4">
            <Progress value={progressValue} />
            <p className="text-sm text-muted-foreground text-center">
                Question {currentIndex + 1} of {questions.length}
            </p>
        </footer>
      )}
    </div>
  );
}

export default function QuestionsPage() {
    return (
        <Suspense fallback={<div className="max-w-2xl mx-auto"><QuestionSkeleton /></div>}>
            <QuestionsPageContent />
        </Suspense>
    )
}
