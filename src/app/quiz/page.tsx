
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
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;
                const isTheCorrectAnswer = choice === question.correctAnswer;
                
                let isDisabled = false;
                if (!isChallenge && hasAnswered) {
                    isDisabled = true;
                }

                const getChallengeClass = () => {
                    if (isSelected) return "bg-muted border-primary";
                    return "hover:bg-muted cursor-pointer";
                };

                const getNonChallengeClass = () => {
                    if (!hasAnswered) return "hover:bg-muted cursor-pointer";
                    if (isTheCorrectAnswer) return "border-green-500 bg-green-50";
                    if (isSelected && !isTheCorrectAnswer) return "border-red-500 bg-red-50";
                    return "opacity-50";
                };

                return (
                    <Card 
                        key={`${choice}-${index}`}
                        onClick={() => !isDisabled && handleAnswerClick(choice)}
                        className={cn(
                            "p-4 transition-all rounded-lg",
                            isChallenge ? getChallengeClass() : getNonChallengeClass(),
                            isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <p>{choice}</p>
                            {!isChallenge && hasAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {!isChallenge && hasAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-500" />}
                        </div>
                    </Card>
                )
            })}
        </div>
        {!isChallenge && hasAnswered && selectedAnswer !== question.correctAnswer && question.explanation && (
           <p className="text-sm text-muted-foreground mt-4 p-2 bg-muted rounded-md">{question.explanation}</p>
        )}
      </CardContent>
    </Card>
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
  
  const { toast } = useToast();

  const fetchAndSetQuestions = useCallback(async () => {
    setIsLoading(true);
    const fetchedQuestions = await getQuestions({
        category,
        shuffle: isShuffled,
    });
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
    fetchAndSetQuestions();
  }, [fetchAndSetQuestions]);


  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnsweredCurrent(false);
    } else {
        setQuizScore(challengeAnswers.reduce((acc, ans) => acc + (ans.isCorrect ? 1 : 0), 0));
        setShowResults(true);
    }
    setAnsweredCurrent(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
    } else {
        setCurrentIndex(questions.length - 1); // Loop to the end
    }
  };
  
  const handleAnswer = (correct: boolean, answer: string) => {
    if (correct && user && !user.answeredQuestionIds?.includes(currentQuestion.id)) {
        updateUser({ 
            questionsAnswered: (user.questionsAnswered || 0) + 1,
            answeredQuestionIds: [...(user.answeredQuestionIds || []), currentQuestion.id]
        });
    }

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
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: correct,
            question: currentQuestion.question,
        });
    }
    
    setChallengeAnswers(newAnswers);

    if (correct) {
        toast({
            title: "Correct!",
            description: "Nice work!",
            className: "bg-green-100 border-green-300"
        });
    } else {
            toast({
            variant: "destructive",
            title: "Incorrect",
            description: "Better luck next time!",
        });
    }
    setAnsweredCurrent(true);
  };

  const handleDialogClose = () => {
    setShowResults(false);
    resetQuizState();
  }

  const handleShuffleToggle = () => {
    setIsShuffled(prev => !prev);
    setCurrentIndex(0);
    setChallengeAnswers([]);
    setAnsweredCurrent(false);
    toast({
        title: isShuffled ? "Shuffle Off" : "Shuffle On",
        description: isShuffled ? "Questions are now in order." : "Questions have been shuffled.",
    });
  }

  useEffect(() => {
    resetQuizState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  
  useEffect(() => {
    if(!currentQuestion) return;
    setAnsweredCurrent(
        challengeAnswers.some(a => a.questionId === currentQuestion?.id)
    );
  }, [currentIndex, challengeAnswers, currentQuestion]);

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
          
          <ScrollArea className="flex-1 -mr-6 pr-6">
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

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button onClick={handleDialogClose} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
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

                <div className="flex justify-end gap-2 w-full">
                     <Button 
                        variant={isShuffled ? "default" : "outline"} 
                        size="icon" 
                        onClick={handleShuffleToggle}
                        aria-label="Shuffle questions"
                        className="shrink-0"
                     >
                        <Shuffle className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                        <Link href="/reviewer/questions/new" passHref>
                            <Button variant="outline" size="icon" className="shrink-0" aria-label="Add new question">
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </>

      <div className="my-6">
        {isLoading ? (
          <QuestionSkeleton />
        ) : questions.length > 0 && currentQuestion ? (
          <>
            <QuizCard 
                question={currentQuestion} 
                onAnswer={handleAnswer} 
                isChallenge={false} 
                userAnswer={userAnswerForCurrentQuestion}
                hasAnswered={answeredCurrent}
            />
          </>
        ) : (
          <Card className="h-80 flex justify-center items-center">
             <div className="text-center text-muted-foreground">
              <p>No questions found for this criteria.</p>
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
          <Button onClick={handleNext} disabled={!currentQuestion || !answeredCurrent}>
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
            {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
