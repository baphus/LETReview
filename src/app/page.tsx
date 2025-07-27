
"use client";

import { useState, useMemo, type FC, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Search,
  BookOpen,
  Copy,
  CheckCircle,
  XCircle,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sampleQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const Flashcard: FC<{ question: QuizQuestion }> = ({ question }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(`${question.question}\n\nAnswer: ${question.answer}`);
    toast({
      title: "Copied!",
      description: "Question and answer copied to clipboard.",
    });
  };

  return (
    <div className="flashcard-container cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("flashcard w-full h-80 relative", { "is-flipped": isFlipped })}>
        {/* Front of Card */}
        <div className="flashcard-front absolute w-full h-full">
          <Card className="h-full flex flex-col justify-center items-center text-center p-6 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl md:text-2xl">
                {question.question}
              </CardTitle>
            </CardHeader>
            <p className="text-muted-foreground mt-4">Tap to reveal answer</p>
          </Card>
        </div>
        {/* Back of Card */}
        <div className="flashcard-back absolute w-full h-full">
          <Card className="h-full flex flex-col justify-center items-center text-center p-6 shadow-lg bg-secondary">
            <CardContent className="flex flex-col items-center justify-center">
              <p className="text-lg md:text-xl font-semibold text-primary">{question.answer}</p>
              {question.explanation && (
                <p className="text-sm text-muted-foreground mt-4">{question.explanation}</p>
              )}
               <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


const StudyCard: FC<{ question: QuizQuestion }> = ({ question }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(`${question.question}\n\nAnswer: ${question.answer}`);
    toast({
      title: "Copied!",
      description: "Question and answer copied to clipboard.",
    });
  };

  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice) => {
                const isCorrect = choice === question.answer;
                return (
                    <Card 
                        key={choice}
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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-semibold text-blue-800 mb-1">Explanation</h4>
            <p className="text-sm text-blue-700">{question.explanation}</p>
          </div>
        )}
      </CardContent>
       <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={handleCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </Card>
  );
};


const QuizCard: FC<{ 
  question: QuizQuestion;
  onAnswer: (correct: boolean, answer: string) => void;
  isChallenge: boolean;
  userAnswer?: string | null;
}> = ({ question, onAnswer, isChallenge, userAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(userAnswer || null);
  const [hasAnswered, setHasAnswered] = useState(!!userAnswer);

  const handleAnswerClick = (answer: string) => {
    if (hasAnswered) return;

    const correct = answer === question.answer;
    setSelectedAnswer(answer);
    onAnswer(correct, answer);
    setHasAnswered(true);
  };
  
  useEffect(() => {
    setSelectedAnswer(userAnswer || null);
    setHasAnswered(!!userAnswer);
  }, [question, userAnswer]);

  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice) => {
                const isSelected = selectedAnswer === choice;
                const isTheCorrectAnswer = choice === question.answer;
                
                // In challenge mode, we only show if the answer was selected, not if it was right or wrong.
                const getChallengeClass = () => {
                    if (!hasAnswered) return "hover:bg-muted";
                    if (isSelected) return "bg-muted border-primary";
                    return "cursor-default";
                };

                const getNonChallengeClass = () => {
                    if (!hasAnswered) return "hover:bg-muted";
                    if (isTheCorrectAnswer) return "border-green-500 bg-green-50";
                    if (isSelected && !isTheCorrectAnswer) return "border-red-500 bg-red-50";
                    return "opacity-50";
                };

                return (
                    <Card 
                        key={choice}
                        onClick={() => handleAnswerClick(choice)}
                        className={cn(
                            "p-4 cursor-pointer transition-all",
                            isChallenge ? getChallengeClass() : getNonChallengeClass()
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
        {!isChallenge && hasAnswered && selectedAnswer && selectedAnswer !== question.answer && question.explanation && (
           <p className="text-sm text-muted-foreground mt-4 p-2 bg-muted rounded-md">{question.explanation}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Function to generate a seed from a string (e.g., today's date)
const getSeed = (str: string) => {
  let h = 1779033703, i = 0;
  for (i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
};


interface ChallengeAnswer {
    questionId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    question: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChallenge = searchParams.get('challenge') === 'true';
  const challengeDifficulty = searchParams.get('difficulty') || 'easy';
  const challengeCount = parseInt(searchParams.get('count') || '0', 10);
  const challengeCategory = searchParams.get('category') as "gen_education" | "professional" || "gen_education";

  
  const [category, setCategory] = useState<"gen_education" | "professional">(
    isChallenge ? challengeCategory : "gen_education"
  );
  const [mode, setMode] = useState<"study" | "flashcard" | "quiz">("study");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [marked, setMarked] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<ChallengeAnswer[]>([]);
  
  const { toast } = useToast();

  const questions = useMemo(() => {
    let baseQuestions = sampleQuestions
      .filter((q) => q.category === category);

    if (isChallenge) {
      // For challenges, get a deterministic random shuffle based on the date
       const today = new Date().toDateString();
       const rng = getSeed(today + challengeDifficulty + challengeCategory);
       const shuffled = baseQuestions
         .filter(q => q.difficulty === challengeDifficulty)
         .sort(() => rng() - rng());
       return shuffled.slice(0, challengeCount);
    }

    // For regular mode, filter by search term and shuffle choices
    const shuffledQuestions = baseQuestions
      .map(q => ({ ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }));
      
    return shuffledQuestions
      .filter((q) =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [category, searchTerm, isChallenge, challengeCount, challengeDifficulty, challengeCategory]);

  useEffect(() => {
    if (isChallenge) {
      setMode('quiz');
      setCategory(challengeCategory);
    }
  }, [isChallenge, challengeCategory]);

  const currentQuestion = questions[currentIndex];

  const handleFinishChallenge = () => {
    setShowResults(true);
    const scorePercentage = (quizScore / questions.length) * 100;
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const today = new Date().toDateString();
        
        // Only update streak if the last challenge was not today and they passed
        if (scorePercentage >= 85 && user.lastChallengeDate !== today) {
            user.streak = (user.streak || 0) + 1;
            if (user.streak > (user.highestStreak || 0)) {
                user.highestStreak = user.streak;
            }
            user.lastChallengeDate = today;
        }

        const pointsPerQuestion = { easy: 5, medium: 10, hard: 15 };
        const pointsEarned = quizScore * pointsPerQuestion[challengeDifficulty as keyof typeof pointsPerQuestion];
        user.points = (user.points || 0) + pointsEarned;
        
        localStorage.setItem('userProfile', JSON.stringify(user));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
    } else {
        if (mode === 'quiz') {
            if (isChallenge) {
                handleFinishChallenge();
            } else {
                setShowResults(true);
            }
        } else {
            setCurrentIndex(0); // Loop back to the start
        }
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
  };
  
  const toggleMark = () => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    if (marked.includes(questionId)) {
      setMarked(marked.filter(id => id !== questionId));
      toast({ title: "Question unmarked." });
    } else {
      setMarked([...marked, questionId]);
      toast({ title: "Question marked for later." });
    }
  };

  const handleAnswer = (correct: boolean, answer: string) => {
    if (isChallenge) {
        setChallengeAnswers(prev => [...prev, {
            questionId: currentQuestion.id,
            userAnswer: answer,
            correctAnswer: currentQuestion.answer,
            isCorrect: correct,
            question: currentQuestion.question,
        }]);
    }
    
    if (correct) {
      setQuizScore(s => s + 1);
    }

    if (!isChallenge) {
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
    }
    setAnsweredCurrent(true);
  };

  const resetQuizState = () => {
    setCurrentIndex(0);
    setQuizScore(0);
    setShowResults(false);
    setChallengeAnswers([]);
    setAnsweredCurrent(false);
  }

  const handleDialogClose = () => {
    setShowResults(false);
    if (isChallenge) {
      router.push('/daily');
    } else {
      resetQuizState();
    }
  }

  useEffect(() => {
    resetQuizState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, category, searchTerm]);
  
  useEffect(() => {
    setAnsweredCurrent(
        isChallenge 
            ? challengeAnswers.some(a => a.questionId === currentQuestion?.id)
            : false
    );
  }, [currentIndex, challengeAnswers, currentQuestion, isChallenge]);

  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  
  const userAnswerForCurrentQuestion = useMemo(() => {
    if (!isChallenge || !currentQuestion) return null;
    return challengeAnswers.find(a => a.questionId === currentQuestion.id)?.userAnswer;
  }, [isChallenge, currentQuestion, challengeAnswers]);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
        <Dialog open={showResults} onOpenChange={handleDialogClose}>
        <DialogContent className="max-h-[90dvh] flex flex-col">
          <DialogHeader className="items-center text-center">
            <Trophy className="h-16 w-16 text-yellow-400" />
            <DialogTitle className="text-2xl font-bold font-headline">Quiz Complete!</DialogTitle>
            <DialogDescription>
              You scored {quizScore} out of {questions.length}.
            </DialogDescription>
          </DialogHeader>
           {isChallenge && (
            <>
                {(quizScore / questions.length) >= 0.85 ? (
                    <div className="text-center text-green-600 font-semibold p-4 bg-green-50 rounded-md">
                        <p>Congratulations! You passed the challenge. Your streak is safe!</p>
                    </div>
                ) : (
                    <div className="text-center text-red-600 font-semibold p-4 bg-red-50 rounded-md">
                        <p>So close! You needed 85% to pass. Try another challenge!</p>
                    </div>
                )}
                <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-6">
                        {challengeAnswers.map(answer => (
                            <div key={answer.questionId} className="text-sm p-3 rounded-md bg-muted">
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
            </>
           )}
          <Button onClick={handleDialogClose}>{isChallenge ? 'Back to Challenges' : 'Try Again'}</Button>
        </DialogContent>
      </Dialog>
      
      {!isChallenge && (
        <>
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">Question Reviewer</h1>
                </div>
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search questions..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentIndex(0);
                    }}
                />
                </div>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <Tabs value={category} onValueChange={(value) => {
                    setCategory(value as "gen_education" | "professional");
                }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gen_education">General Education</TabsTrigger>
                    <TabsTrigger value="professional">Professional Education</TabsTrigger>
                </TabsList>
                </Tabs>

                <Tabs value={mode} onValueChange={(value) => setMode(value as "study" | "flashcard" | "quiz")}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="study">Study</TabsTrigger>
                    <TabsTrigger value="flashcard">Flashcard</TabsTrigger>
                    <TabsTrigger value="quiz">Quiz</TabsTrigger>
                </TabsList>
                </Tabs>
            </div>
        </>
      )}

      {isChallenge && (
         <header className="flex flex-col gap-4 mb-6 text-center">
            <h1 className="text-3xl font-bold font-headline capitalize">{challengeDifficulty} Daily Challenge</h1>
            <p className="text-muted-foreground">Answer all {questions.length} {challengeCategory === 'gen_education' ? 'General' : 'Professional'} Education questions. You need 85% to pass.</p>
        </header>
      )}
      
      <div className="my-6">
        {questions.length > 0 && currentQuestion ? (
          <>
            {mode === 'study' && <StudyCard question={currentQuestion} />}
            {mode === 'flashcard' && <Flashcard question={currentQuestion} />}
            {mode === 'quiz' && <QuizCard 
                question={currentQuestion} 
                onAnswer={handleAnswer} 
                isChallenge={isChallenge} 
                userAnswer={userAnswerForCurrentQuestion}
            />}
          </>
        ) : (
          <Card className="h-80 flex justify-center items-center">
             <div className="text-center text-muted-foreground">
              <p>No questions found for this criteria.</p>
              {isChallenge && <p>Please check back tomorrow for new questions.</p>}
            </div>
          </Card>
        )}
      </div>

      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <div className="flex items-center gap-4">
            {mode === 'quiz' && (
              <Badge variant="outline" className="text-base">
                Score: <span className="font-bold ml-1">{quizScore}</span>
              </Badge>
            )}
            {!isChallenge && (
              <Button variant="outline" size="sm" onClick={toggleMark} disabled={mode === 'quiz' || !currentQuestion}>
                <Bookmark className={cn("h-4 w-4 mr-2", currentQuestion && marked.includes(currentQuestion.id) && "fill-primary text-primary")} />
                Mark for later
              </Button>
            )}
          </div>
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between items-center">
          <Button onClick={handlePrev} disabled={questions.length <= 1 || (isChallenge && currentIndex === 0)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!currentQuestion || (mode === 'quiz' && !answeredCurrent)}>
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
            {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}

    