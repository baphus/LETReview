"use client";

import { useState, useMemo, type FC, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase/auth/use-user";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";


const QuizCard: FC<{
  question: QuizQuestion;
  onAnswer: (correct: boolean, answer: string) => void;
  isChallenge: boolean;
  userAnswer?: string | null;
  hasAnswered?: boolean;
}> = ({ question, onAnswer, isChallenge, userAnswer, hasAnswered }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(userAnswer || null);

  const handleAnswerClick = (answer: string) => {
    const correct = answer === question.correctAnswer;
    setSelectedAnswer(answer);
    onAnswer(correct, answer);
  };

  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
  }, [question, userAnswer]);

  return (
    <div className="w-full space-y-4">
      {/* Question */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold leading-snug">{question.question}</h2>
      </div>

      {/* Answer choices */}
      <div className="grid grid-cols-1 gap-2.5">
        {question.choices.map((choice, index) => {
          const isSelected = selectedAnswer === choice;
          const isTheCorrectAnswer = choice === question.correctAnswer;

          let isDisabled = false;
          if (!isChallenge && hasAnswered) isDisabled = true;

          const getStateClass = () => {
            if (isChallenge) {
              return isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted/50 active:scale-[0.98]";
            }
            if (!hasAnswered) return "hover:bg-muted/50 active:scale-[0.98]";
            if (isTheCorrectAnswer) return "border-green-500 bg-green-50";
            if (isSelected && !isTheCorrectAnswer) return "border-red-500 bg-red-50";
            return "opacity-40";
          };

          return (
            <button
              key={`${choice}-${index}`}
              onClick={() => !isDisabled && handleAnswerClick(choice)}
              disabled={isDisabled}
              className={cn(
                "w-full text-left p-4 rounded-xl border text-sm sm:text-base transition-all",
                getStateClass(),
                isDisabled && "pointer-events-none"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{choice}</span>
                </div>
                {!isChallenge && hasAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                {!isChallenge && hasAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {!isChallenge && hasAnswered && selectedAnswer !== question.correctAnswer && question.explanation && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};


interface ChallengeAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  question: string;
}

const QuestionSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-2xl border p-6">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-5 w-1/2 mt-2" />
    </div>
    <div className="space-y-2.5">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  </div>
);

const positiveEmojis = ['✨', '🎉', '👍', '✅', '💯'];

export default function QuizPage() {
  const router = useRouter();
  const { user, isAdmin, updateUser } = useUser();

  const [category, setCategory] = useState<'gened' | 'profed' | 'majorship'>("gened");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<ChallengeAnswer[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [quizStreak, setQuizStreak] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('✨');

  const { toast } = useToast();

  const fetchAndSetQuestions = useCallback(async () => {
    setIsLoading(true);
    const fetchedQuestions = await getQuestions({ category, shuffle: isShuffled });
    setQuestions(fetchedQuestions);
    setIsLoading(false);
  }, [category, isShuffled]);

  useEffect(() => {
    fetchAndSetQuestions();
  }, [fetchAndSetQuestions]);

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setQuizScore(0);
    setShowResults(false);
    setChallengeAnswers([]);
    setAnsweredCurrent(false);
    setQuizStreak(0);
    fetchAndSetQuestions();
  }, [fetchAndSetQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAnsweredCurrent(false);
    } else {
      const finalScore = challengeAnswers.reduce((acc, ans) => acc + (ans.isCorrect ? 1 : 0), 0);
      if (quizStreak > 0 && user && quizStreak > (user.highestQuizStreak || 0)) {
        updateUser({ highestQuizStreak: quizStreak });
      }
      setQuizScore(finalScore);
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(questions.length - 1);
    }
  };

  const handleAnswer = (correct: boolean, answer: string) => {
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

      if (user && !user.answeredQuestionIds?.includes(currentQuestion.id)) {
        updateUser({
          questionsAnswered: (user.questionsAnswered || 0) + 1,
          answeredQuestionIds: [...(user.answeredQuestionIds || []), currentQuestion.id]
        });
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

    const newAnswers = [...challengeAnswers];
    const existingAnswerIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);

    if (existingAnswerIndex !== -1) {
      newAnswers[existingAnswerIndex] = { ...newAnswers[existingAnswerIndex], userAnswer: answer, isCorrect: correct };
    } else {
      newAnswers.push({
        questionId: currentQuestion.id,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: correct,
        question: currentQuestion.question,
      });
    }

    setChallengeAnswers(newAnswers);
    setAnsweredCurrent(true);
  };

  const handleDialogClose = () => {
    setShowResults(false);
    resetQuizState();
  };

  const handleShuffleToggle = () => {
    setIsShuffled(prev => !prev);
    setCurrentIndex(0);
    setChallengeAnswers([]);
    setAnsweredCurrent(false);
    toast({
      title: isShuffled ? "Shuffle Off" : "Shuffle On",
      description: isShuffled ? "Questions are now in order." : "Questions have been shuffled.",
    });
  };

  useEffect(() => {
    resetQuizState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (!currentQuestion) return;
    setAnsweredCurrent(challengeAnswers.some(a => a.questionId === currentQuestion?.id));
  }, [currentIndex, challengeAnswers, currentQuestion]);

  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const userAnswerForCurrentQuestion = useMemo(() => {
    if (!currentQuestion) return null;
    return challengeAnswers.find(a => a.questionId === currentQuestion.id)?.userAnswer;
  }, [currentQuestion, challengeAnswers]);

  return (
    <div className="container mx-auto max-w-lg space-y-5">
      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={handleDialogClose}>
        <DialogContent className="flex flex-col max-h-[85dvh] rounded-2xl">
          <DialogHeader className="items-center text-center pt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <DialogTitle className="text-xl font-bold font-headline">Quiz Complete!</DialogTitle>
            <DialogDescription>
              You scored <strong>{quizScore}</strong> out of <strong>{questions.length}</strong>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {challengeAnswers.map(answer => (
                <div key={answer.questionId} className="rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1.5 leading-snug">{answer.question}</p>
                  {answer.isCorrect ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span className="text-xs">{answer.userAnswer}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span className="text-xs line-through">{answer.userAnswer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 pl-6">
                        <span className="text-xs">{answer.correctAnswer}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-3">
            <Button onClick={handleDialogClose} className="w-full rounded-xl">
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header Controls */}
      <div className="flex items-center gap-3">
        <Select value={category} onValueChange={(value) => setCategory(value as "gened" | "profed" | "majorship")}>
          <SelectTrigger className="flex-1 h-10 rounded-xl">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gened">General Education</SelectItem>
            <SelectItem value="profed">Professional Education</SelectItem>
            <SelectItem value="majorship">Majorship</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={isShuffled ? "secondary" : "outline"}
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
          onClick={handleShuffleToggle}
        >
          <Shuffle className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <Link href="/reviewer/questions/new">
            <Button size="icon" className="h-10 w-10 rounded-xl shrink-0">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Progress Bar */}
      {questions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            {quizStreak > 0 && (
              <Badge variant="destructive" className="gap-1 text-[10px] h-5">
                <Flame className="h-3 w-3" /> {quizStreak}
              </Badge>
            )}
          </div>
          <Progress value={progressValue} className="h-1.5 rounded-full" />
        </div>
      )}

      {/* Question Area */}
      {isLoading ? (
        <QuestionSkeleton />
      ) : questions.length > 0 && currentQuestion ? (
        <div className="relative">
          <QuizCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            isChallenge={false}
            userAnswer={userAnswerForCurrentQuestion}
            hasAnswered={answeredCurrent}
          />
          {showEmoji && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-5xl animate-emoji-pop">{currentEmoji}</span>
            </div>
          )}
          {showStreak && (
            <div className="pointer-events-none absolute -top-3 right-2 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-sm font-bold animate-combo-pop">
              x{quizStreak}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border p-10 text-center">
          <p className="text-muted-foreground text-sm">No questions found for this category.</p>
        </div>
      )}

      {/* Navigation Controls - fixed bottom on mobile feel */}
      {questions.length > 0 && !isLoading && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={questions.length <= 1}
            className="rounded-xl h-11 flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Prev
          </Button>
          <Button
            onClick={handleNext}
            className="rounded-xl h-11 flex-1"
          >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
            {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-1.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}
