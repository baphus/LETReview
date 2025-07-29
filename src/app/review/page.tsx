
"use client";

import { useState, useMemo, type FC, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sampleQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const Flashcard: FC<{ question: QuizQuestion }> = ({ question }) => {
  const [isFlipped, setIsFlipped] = useState(false);
 
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


const StudyCard: FC<{ question: QuizQuestion }> = ({ question }) => {
  return (
    <Card className="w-full min-h-80 shadow-lg relative p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.choices.map((choice, index) => {
                const isCorrect = choice === question.answer;
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
          <div className="p-4 bg-blue-50 border-blue-200 rounded-md">
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
    const correct = answer === question.answer;
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
                        className={cn("p-4 transition-all", getChallengeClass())}
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

function ReviewerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isChallenge = searchParams.get('challenge') === 'true';
  const challengeDifficulty = searchParams.get('difficulty') || 'easy';
  const challengeCount = parseInt(searchParams.get('count') || '0', 10);
  const challengeCategory = searchParams.get('category') as "gen_education" | "professional" || "gen_education";

  
  const [category, setCategory] = useState<"gen_education" | "professional">(
    isChallenge ? challengeCategory : "gen_education"
  );
  const [mode, setMode] = useState<'study' | 'flashcard'>(isChallenge ? 'study' : 'study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<ChallengeAnswer[]>([]);
  const [passingScore, setPassingScore] = useState(85);
  const [isShuffled, setIsShuffled] = useState(false);
  
  const { toast } = useToast();

   // Load state from localStorage on initial mount
  useEffect(() => {
    if (isChallenge) return; // Don't load state for challenges

    const savedProgress = localStorage.getItem('reviewProgress');
    if (savedProgress) {
      try {
        const { category, mode, currentIndex, isShuffled: savedIsShuffled } = JSON.parse(savedProgress);
        setCategory(category || 'gen_education');
        setMode(mode || 'study');
        setCurrentIndex(currentIndex || 0);
        setIsShuffled(savedIsShuffled || false);
      } catch (e) {
        console.error("Failed to parse review progress", e);
      }
    }
  }, [isChallenge]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isChallenge) return; // Don't save state for challenges

    const progress = {
      category,
      mode,
      currentIndex,
      isShuffled,
    };
    localStorage.setItem('reviewProgress', JSON.stringify(progress));
  }, [category, mode, currentIndex, isChallenge, isShuffled]);


  const loadUserData = useCallback(() => {
    const savedUser = localStorage.getItem("userProfile");
    if(savedUser){
        const user = JSON.parse(savedUser);
        setPassingScore(user.passingScore || 85);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData])


  const questions = useMemo(() => {
    let baseQuestions = sampleQuestions
      .filter((q) => q.category === category);

    if (isChallenge) {
       const today = new Date().toDateString();
       const rng = getSeed(today + challengeDifficulty + challengeCategory);
       const shuffled = baseQuestions
         .filter(q => q.difficulty === challengeDifficulty)
         .sort(() => rng() - rng());
       return shuffled.slice(0, challengeCount);
    }

    if(isShuffled) {
        return [...baseQuestions].sort(() => Math.random() - 0.5)
            .map(q => ({ ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }));
    }
    
    return baseQuestions
      .map(q => ({ ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }));

  }, [category, isChallenge, challengeCount, challengeDifficulty, challengeCategory, isShuffled]);
  
  const currentQuestion = questions[currentIndex];

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setQuizScore(0);
    setShowResults(false);
    setChallengeAnswers([]);
  }, []);

  const handleFinishChallenge = (finalAnswers: ChallengeAnswer[]) => {
    const finalScore = finalAnswers.reduce((acc, ans) => acc + (ans.isCorrect ? 1 : 0), 0);
    setQuizScore(finalScore);
    setShowResults(true);

    const scorePercentage = (finalScore / questions.length) * 100;
    const passed = scorePercentage >= passingScore;

    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const today = new Date();
        const todayString = today.toDateString();
        
        const challengeId = `${challengeDifficulty}-${challengeCategory}-${today.toISOString().split('T')[0]}`;
        
        // Only mark challenge as completed if PASSED
        if (passed) {
            if (!user.completedChallenges) {
                user.completedChallenges = [];
            }
            // Clear out challenges from other days to avoid bloating local storage
            const todayKey = today.toISOString().split('T')[0];
            user.completedChallenges = (user.completedChallenges || []).filter((id: string) => id.endsWith(todayKey));
            
            if (!user.completedChallenges.includes(challengeId)) {
                user.completedChallenges.push(challengeId);
            }

            // Award points and streak only on the first pass of the day for any challenge
            if (user.lastChallengeDate !== todayString) {
                user.streak = (user.streak || 0) + 1;
                if (user.streak > (user.highestStreak || 0)) {
                    user.highestStreak = user.streak;
                }
                user.lastChallengeDate = todayString;

                const pointsMap = { easy: 25, medium: 75, hard: 150 };
                const pointsEarned = pointsMap[challengeDifficulty as keyof typeof pointsMap] || 0;
                user.points = (user.points || 0) + pointsEarned;

                toast({
                    title: "Challenge Passed!",
                    description: `You earned ${pointsEarned} points and secured your streak!`,
                    className: "bg-green-100 border-green-300"
                });
            } else {
                 toast({
                    title: "Challenge Passed!",
                    description: `You passed another challenge!`,
                    className: "bg-green-100 border-green-300"
                });
            }
        }
        
        localStorage.setItem('userProfile', JSON.stringify(user));
    }
  };


  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
    } else {
        if (isChallenge) {
            // We pass the challengeAnswers directly to avoid state update issues
            handleFinishChallenge(challengeAnswers);
        } else {
            setCurrentIndex(0); 
        }
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
    const newAnswer: ChallengeAnswer = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        correctAnswer: currentQuestion.answer,
        isCorrect: correct,
        question: currentQuestion.question,
    };

    const newAnswers = [...challengeAnswers.filter(a => a.questionId !== currentQuestion.id), newAnswer];
    setChallengeAnswers(newAnswers);

    // Auto-advance to next question in a challenge
    setTimeout(() => {
        if (currentIndex < questions.length - 1) {
             setCurrentIndex((prev) => prev + 1);
        } else {
            handleFinishChallenge(newAnswers);
        }
    }, 300);
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
    setCurrentIndex(0);
    resetQuizState();
    toast({
        title: isShuffled ? "Shuffle Off" : "Shuffle On",
        description: isShuffled ? "Questions are now in order." : "Questions have been shuffled.",
    });
  }
  
  const handleTryAgain = () => {
    setShowResults(false);
    resetQuizState();
  };

  useEffect(() => {
    if (!isChallenge) {
        resetQuizState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, category, isShuffled]);
  
  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  
  const isChallengePassed = showResults && isChallenge && (quizScore / questions.length * 100) >= passingScore;

  if (isChallenge && !currentQuestion && challengeAnswers.length === questions.length && !showResults) {
    handleFinishChallenge(challengeAnswers);
    return null; // Or a loading indicator
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
       <Dialog open={showResults} onOpenChange={handleDialogClose}>
        <DialogContent className="flex flex-col h-auto max-h-[90dvh]">
          <DialogHeader className="items-center text-center">
            <Trophy className="h-16 w-16 text-yellow-400" />
            <DialogTitle className="text-2xl font-bold font-headline">Challenge Complete!</DialogTitle>
            <DialogDescription>
              You scored {quizScore} out of {questions.length}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex flex-col">
              {isChallenge && (
                  isChallengePassed ? (
                      <div className="text-center text-green-600 font-semibold p-4 bg-green-50 rounded-md mb-4">
                          <p>Congratulations! You passed the challenge.</p>
                      </div>
                  ) : (
                      <div className="text-center text-red-600 font-semibold p-4 bg-red-50 rounded-md mb-4">
                          <p>So close! You needed {passingScore}% to pass. Don't give up!</p>
                      </div>
                  )
              )}

              <ScrollArea className="h-64">
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
          </div>

          <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-col sm:space-x-0 gap-2">
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
      
      {!isChallenge && (
        <>
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">Question Reviewer</h1>
                </div>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Tabs value={category} onValueChange={(value) => {
                    setCategory(value as "gen_education" | "professional");
                }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gen_education">General Education</TabsTrigger>
                    <TabsTrigger value="professional">Professional Education</TabsTrigger>
                </TabsList>
                </Tabs>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Tabs value={mode} onValueChange={(value) => setMode(value as "study" | "flashcard")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="study">Study</TabsTrigger>
                            <TabsTrigger value="flashcard">Flashcard</TabsTrigger>
                        </TabsList>
                    </Tabs>
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
      )}

      {isChallenge && (
         <header className="flex flex-col gap-4 mb-6 text-center">
            <h1 className="text-3xl font-bold font-headline capitalize">{challengeDifficulty} Daily Challenge</h1>
            <p className="text-muted-foreground">Answer all {questions.length} {challengeCategory === 'gen_education' ? 'General' : 'Professional'} Education questions. You need {passingScore}% to pass.</p>
        </header>
      )}
      
      <div className="my-6">
        {questions.length > 0 && currentQuestion ? (
          <>
            {isChallenge ? (
              <QuizCard 
                question={currentQuestion} 
                onAnswer={handleAnswer} 
              />
            ) : (
              <>
                {mode === 'study' && <StudyCard question={currentQuestion} />}
                {mode === 'flashcard' && <Flashcard question={currentQuestion} />}
              </>
            )}
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

      {!isChallenge && (
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
            <Button onClick={handleNext}>
                {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
            </div>
        </footer>
      )}

       {isChallenge && (
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

export default function ReviewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewerPageContent />
        </Suspense>
    )
}

