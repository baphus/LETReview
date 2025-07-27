"use client";

import { useState, useMemo, type FC, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Search,
  BookOpen,
  Copy,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sampleQuestions } from "@/lib/data";
import type { Question, QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generateQuiz } from "@/ai/flows/generate-quiz-flow";
import { Badge } from "@/components/ui/badge";

const Flashcard: FC<{ question: Question }> = ({ question }) => {
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


const StudyCard: FC<{ question: Question }> = ({ question }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(`${question.question}\n\nAnswer: ${question.answer}`);
    toast({
      title: "Copied!",
      description: "Question and answer copied to clipboard.",
    });
  };
  
  return (
    <Card className="w-full min-h-80 shadow-lg relative">
      <CardHeader>
        <CardTitle className="font-headline text-xl md:text-2xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold text-primary">{question.answer}</p>
        {question.explanation && (
          <p className="text-sm text-muted-foreground mt-2">{question.explanation}</p>
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
  onAnswer: (correct: boolean) => void;
}> = ({ question, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleAnswerClick = (answer: string) => {
    if (selectedAnswer) return; // Prevent changing answer

    const correct = answer === question.answer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    onAnswer(correct);
  };
  
  useEffect(() => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [question]);

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

                return (
                    <Card 
                        key={choice}
                        onClick={() => handleAnswerClick(choice)}
                        className={cn(
                            "p-4 cursor-pointer transition-all hover:bg-muted",
                            selectedAnswer && isTheCorrectAnswer && "border-green-500 bg-green-50",
                            isSelected && !isTheCorrectAnswer && "border-red-500 bg-red-50",
                            selectedAnswer && !isTheCorrectAnswer && !isSelected && "opacity-50"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <p>{choice}</p>
                            {selectedAnswer && isTheCorrectAnswer && isSelected && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {selectedAnswer && !isTheCorrectAnswer && isSelected && <XCircle className="h-5 w-5 text-red-500" />}
                        </div>
                    </Card>
                )
            })}
        </div>
        {isCorrect === false && question.explanation && (
           <p className="text-sm text-muted-foreground mt-4 p-2 bg-muted rounded-md">{question.explanation}</p>
        )}
      </CardContent>
    </Card>
  );
};


export default function ReviewPage() {
  const [category, setCategory] = useState<"gen_education" | "professional">(
    "gen_education"
  );
  const [mode, setMode] = useState<"study" | "flashcard" | "quiz">("study");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [marked, setMarked] = useState<number[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizPoints, setQuizPoints] = useState(0);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  
  const { toast } = useToast();

  const questions = useMemo(() => {
    return sampleQuestions
      .filter((q) => q.category === category)
      .filter((q) =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [category, searchTerm]);

  const currentQuestion = (mode === 'quiz' ? quizQuestions : questions)[currentIndex];

  const handleNext = () => {
    const totalQuestions = (mode === 'quiz' ? quizQuestions.length : questions.length);
    setCurrentIndex((prev) => (prev + 1) % totalQuestions);
  };

  const handlePrev = () => {
    const totalQuestions = (mode === 'quiz' ? quizQuestions.length : questions.length);
    setCurrentIndex((prev) => (prev - 1 + totalQuestions) % totalQuestions);
  };
  
  const toggleMark = () => {
    const questionId = currentQuestion.id;
    if (marked.includes(questionId)) {
      setMarked(marked.filter(id => id !== questionId));
      toast({ title: "Question unmarked." });
    } else {
      setMarked([...marked, questionId]);
      toast({ title: "Question marked for later." });
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      setQuizPoints(p => p + 10);
      toast({
        title: "Correct!",
        description: "You earned 10 points.",
      })
    } else {
       toast({
        variant: "destructive",
        title: "Incorrect",
        description: "Better luck next time!",
      })
    }
  };

  const startQuiz = async () => {
    if (questions.length === 0) return;
    setLoadingQuiz(true);
    setCurrentIndex(0);
    setQuizPoints(0);
    try {
      const result = await generateQuiz({ questions: questions.slice(0, 10) }); // Limit to 10 questions for performance
      setQuizQuestions(result.questions);
    } catch(e) {
      toast({
        variant: "destructive",
        title: "Failed to generate quiz",
        description: "The AI failed to generate a quiz. Please try again."
      });
      setMode("study"); // Fallback to study mode
    } finally {
      setLoadingQuiz(false);
    }
  };
  
  useEffect(() => {
    if (mode === 'quiz') {
      startQuiz();
    }
  }, [mode, category, searchTerm]); // Re-generate quiz if category or search term changes

  const progressValue = (mode === 'quiz' ? quizQuestions.length : questions.length) > 0 ? ((currentIndex + 1) / (mode === 'quiz' ? quizQuestions.length : questions.length)) * 100 : 0;
  
  const totalQuestions = mode === 'quiz' ? quizQuestions.length : questions.length;
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
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
            setCurrentIndex(0);
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
      
      <div className="my-6">
        {loadingQuiz ? (
          <Card className="h-80 flex flex-col justify-center items-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Generating your AI-powered quiz...</p>
          </Card>
        ) : totalQuestions > 0 ? (
          <>
            {mode === 'study' && <StudyCard question={currentQuestion} />}
            {mode === 'flashcard' && <Flashcard question={currentQuestion} />}
            {mode === 'quiz' && quizQuestions.length > 0 && <QuizCard question={currentQuestion as QuizQuestion} onAnswer={handleAnswer} />}
          </>
        ) : (
          <Card className="h-80 flex justify-center items-center">
            <p className="text-muted-foreground">No questions found.</p>
          </Card>
        )}
      </div>

      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <div className="flex items-center gap-4">
            {mode === 'quiz' && (
              <Badge variant="outline" className="text-base">
                Points: <span className="font-bold ml-1">{quizPoints}</span>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={toggleMark} disabled={mode === 'quiz'}>
              <Bookmark className={cn("h-4 w-4 mr-2", marked.includes(currentQuestion?.id) && "fill-primary text-primary")} />
              Mark for later
            </Button>
          </div>
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between items-center">
          <Button onClick={handlePrev} disabled={totalQuestions <= 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext} disabled={totalQuestions <= 1}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
