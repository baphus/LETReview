
"use client";

import { useState, useMemo, type FC, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  Lightbulb,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const QuizCard: FC<{ 
  question: QuizQuestion;
  onAnswer: (correct: boolean, answer: string) => void;
  userAnswer?: string | null;
  hasAnswered?: boolean;
}> = ({ question, onAnswer, userAnswer, hasAnswered }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(userAnswer || null);

  const handleAnswerClick = (answer: string) => {
    const correct = answer === question.answer;
    setSelectedAnswer(answer);
    onAnswer(correct, answer);
  };
  
  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
  }, [question, userAnswer]);


  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
       {question.image && (
        <div className="relative w-full h-48 mb-4">
            <Image 
                src={question.image} 
                alt={question.question} 
                layout="fill" 
                objectFit="contain"
                className="rounded-md"
            />
        </div>
      )}
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;
                const isTheCorrectAnswer = choice === question.answer;
                
                let isDisabled = hasAnswered;

                const getQuizClass = () => {
                    if (!hasAnswered) return "hover:bg-muted cursor-pointer hover:scale-105 transition-transform";
                    if (isTheCorrectAnswer) return "border-green-500 bg-green-50/10";
                    if (isSelected && !isTheCorrectAnswer) return "border-red-500 bg-red-50/10";
                    return "opacity-50";
                };

                return (
                    <Card 
                        key={`${choice}-${index}`}
                        onClick={() => !isDisabled && handleAnswerClick(choice)}
                        className={cn(
                            "p-4 transition-all h-auto",
                            getQuizClass(),
                            isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <p>{choice}</p>
                            {hasAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {hasAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-500" />}
                        </div>
                    </Card>
                )
            })}
        </div>
        {hasAnswered && selectedAnswer !== question.answer && question.explanation && (
           <div className="mt-4 p-4 bg-muted/50 rounded-md border">
              <h4 className="font-semibold mb-1">Explanation</h4>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};


interface ChallengeAnswer {
    questionId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    question: string;
}

export default function QuizPage() {
  const router = useRouter();

  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<ChallengeAnswer[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    setAllQuestions(loadQuestions());
  }, []);

  const questions = useMemo(() => {
    // For now, we only have one category 'custom'. This can be expanded later.
    let baseQuestions = allQuestions;

    if(isShuffled) {
        return [...baseQuestions].sort(() => Math.random() - 0.5)
            .map(q => ({ ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }));
    }
    
    return baseQuestions
      .map(q => ({ ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }));

  }, [allQuestions, isShuffled]);

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setQuizScore(0);
    setShowResults(false);
    setChallengeAnswers([]);
  }, []);


  const currentQuestion = questions[currentIndex];
  
  const hasAnsweredCurrent = useMemo(() => {
    if (!currentQuestion) return false;
    return challengeAnswers.some(a => a.questionId === currentQuestion.id);
  }, [currentQuestion, challengeAnswers]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
    } else {
        setQuizScore(challengeAnswers.reduce((acc, ans) => acc + (ans.isCorrect ? 1 : 0), 0));
        setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
    } else {
        setCurrentIndex(questions.length - 1); // Loop to the end
    }
  };
  
  const handleAnswer = (correct: boolean, answer: string) => {
    const newAnswers = [...challengeAnswers];
    const existingAnswerIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
    
    if (existingAnswerIndex !== -1) {
        newAnswers[existingAnswerIndex] = {
            ...newAnswers[existingAnswerIndex],
            userAnswer: answer,
            isCorrect: correct,
        };
    } else {
        newAnswers.push({
            questionId: currentQuestion.id,
            userAnswer: answer,
            correctAnswer: currentQuestion.answer,
            isCorrect: correct,
            question: currentQuestion.question,
        });
    }
    
    setChallengeAnswers(newAnswers);

    if (correct) {
        toast({
            title: "Correct!",
            description: "Nice work!",
            className: "bg-primary border-primary text-primary-foreground"
        });
    } else {
        toast({
            variant: "destructive",
            title: "Incorrect",
            description: "Better luck next time!",
        });
    }
  };

  const handleDialogClose = () => {
    setShowResults(false);
    resetQuizState();
  }

  const handleShuffleToggle = () => {
    setIsShuffled(prev => !prev);
    setCurrentIndex(0);
    resetQuizState();
    toast({
        title: isShuffled ? "Shuffle Off" : "Shuffle On",
        description: isShuffled ? "Questions are now in order." : "Questions have been shuffled.",
    });
  }

  useEffect(() => {
    resetQuizState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShuffled]);

  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  
  const userAnswerForCurrentQuestion = useMemo(() => {
    if (!currentQuestion) return null;
    return challengeAnswers.find(a => a.questionId === currentQuestion.id)?.userAnswer;
  }, [currentQuestion, challengeAnswers]);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
       <Dialog open={showResults} onOpenChange={handleDialogClose}>
        <DialogContent className="flex flex-col h-[90dvh] max-h-[600px]">
          <DialogHeader className="items-center text-center">
            <Trophy className="h-16 w-16 text-yellow-400" />
            <DialogTitle className="text-2xl font-bold font-headline">Quiz Complete!</DialogTitle>
            <DialogDescription>
              You scored {quizScore} out of {questions.length}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1 -mr-6 pr-6">
                  <div className="space-y-4">
                      {challengeAnswers.map(answer => (
                          <div key={answer.questionId} className="text-sm p-3 rounded-md bg-muted">
                              <p className="font-semibold mb-1">{answer.question}</p>
                              {answer.isCorrect ? (
                                  <div className="flex items-center gap-2 text-green-400">
                                      <CheckCircle className="h-4 w-4 shrink-0" /> 
                                      <span>Your answer: {answer.userAnswer}</span>
                                  </div>
                              ) : (
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-red-400">
                                          <XCircle className="h-4 w-4 shrink-0" />
                                          <span>Your answer: {answer.userAnswer}</span>
                                      </div>
                                          <div className="flex items-center gap-2 text-green-400 pl-6">
                                          <span>Correct answer: {answer.correctAnswer}</span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button onClick={handleDialogClose} className="w-full">Try Again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
        <>
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-2">
                <Lightbulb className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">Quiz Mode</h1>
                </div>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-muted-foreground text-sm">Reviewing your custom questions.</p>

                <div className="flex gap-2 w-full sm:w-auto">
                     <Button 
                        variant={isShuffled ? "default" : "outline"} 
                        size="icon" 
                        onClick={handleShuffleToggle}
                        aria-label="Shuffle questions"
                        className="shrink-0"
                     >
                        <Shuffle className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </>

      <div className="my-6">
        {questions.length > 0 && currentQuestion ? (
          <>
            <QuizCard 
                question={currentQuestion} 
                onAnswer={handleAnswer} 
                userAnswer={userAnswerForCurrentQuestion}
                hasAnswered={hasAnsweredCurrent}
            />
          </>
        ) : (
          <Card className="h-80 flex justify-center items-center">
             <div className="text-center text-muted-foreground">
              <p>No questions found.</p>
              <p>Add some questions on the Profile page to get started!</p>
            </div>
          </Card>
        )}
      </div>

      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between items-center">
          <Button onClick={handlePrev} disabled={questions.length <= 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!currentQuestion || !hasAnsweredCurrent}>
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
            {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
