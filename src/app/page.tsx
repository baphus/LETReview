"use client";

import { useState, useMemo, type FC } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Search,
  BookOpen,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sampleQuestions } from "@/lib/data";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
    <Card className="w-full min-h-80 shadow-lg">
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

export default function ReviewPage() {
  const [category, setCategory] = useState<"gen_education" | "professional">(
    "gen_education"
  );
  const [mode, setMode] = useState<"study" | "flashcard">("study");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [marked, setMarked] = useState<number[]>([]);
  const { toast } = useToast();

  const questions = useMemo(() => {
    return sampleQuestions
      .filter((q) => q.category === category)
      .filter((q) =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [category, searchTerm]);

  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
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

  const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  
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

      <Tabs defaultValue="gen_education" onValueChange={(value) => {
          setCategory(value as "gen_education" | "professional");
          setCurrentIndex(0);
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gen_education">General Education</TabsTrigger>
          <TabsTrigger value="professional">Professional Education</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="flex items-center justify-center space-x-2 my-4">
        <Label htmlFor="mode-switch">Study Mode</Label>
        <Switch id="mode-switch" checked={mode === 'flashcard'} onCheckedChange={(checked) => setMode(checked ? 'flashcard' : 'study')} />
        <Label htmlFor="mode-switch">Flashcard Mode</Label>
      </div>
      
      <div className="my-6">
        {questions.length > 0 ? (
           mode === 'study' ? <StudyCard question={currentQuestion} /> : <Flashcard question={currentQuestion} />
        ) : (
          <Card className="h-80 flex justify-center items-center">
            <p className="text-muted-foreground">No questions found.</p>
          </Card>
        )}
      </div>

      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <Button variant="outline" size="sm" onClick={toggleMark}>
            <Bookmark className={cn("h-4 w-4 mr-2", marked.includes(currentQuestion?.id) && "fill-primary text-primary")} />
            Mark for later
          </Button>
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between items-center">
          <Button onClick={handlePrev} disabled={questions.length <= 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext} disabled={questions.length <= 1}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
