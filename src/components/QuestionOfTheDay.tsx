"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/firebase/auth/use-user";
import { getQuestionOfTheDay } from "@/lib/data";
import type { QuizQuestion, DailyProgress } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Star } from "lucide-react";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export const QuestionOfTheDay = ({ onCorrectAnswer, className }: { onCorrectAnswer?: () => void, className?: string }) => {
    const { toast } = useToast();
    const { user, updateUser } = useUser();
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        getQuestionOfTheDay().then(qotd => {
            setQuestion(qotd);
            if(user){
                const todayKey = getTodayKey();
                const todaysProgress = user.dailyProgress?.[todayKey];

                if(todaysProgress?.qotdCompleted){
                    setIsAnswered(true);
                    const previousAnswer = todaysProgress.qotdAnswer;
                    if (previousAnswer) {
                        setSelectedAnswer(previousAnswer);
                        setIsCorrect(previousAnswer === qotd.correctAnswer);
                    }
                } else {
                    setIsAnswered(false);
                    setSelectedAnswer(null);
                    setIsCorrect(false);
                }
            }
            setIsLoading(false);
        });
    }, [user]);

    const handleAnswer = async (answer: string) => {
        if (isAnswered || !user || !question) return;

        const correct = answer === question.correctAnswer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        const todayKey = getTodayKey();
        
        const updates: any = {};

        let dailyProgressUpdate: Partial<DailyProgress> = {
            qotdCompleted: true,
            qotdAnswer: answer,
        };
        
        if (correct) {
            dailyProgressUpdate.pointsEarned = (user.dailyProgress?.[todayKey]?.pointsEarned || 0) + 5;
            updates.points = (user.points || 0) + 5;
            
            if (!user.answeredQuestionIds?.includes(question.id)) {
                updates.questionsAnswered = (user.questionsAnswered || 0) + 1;
                updates.answeredQuestionIds = [...(user.answeredQuestionIds || []), question.id];
                dailyProgressUpdate.questionsAnswered = (user.dailyProgress?.[todayKey]?.questionsAnswered || 0) + 1;
            }

            if(onCorrectAnswer) onCorrectAnswer();
            toast({ title: "Correct!", description: "You earned 5 points!", className: "bg-green-100 border-green-300" });
        } else {
            toast({ variant: "destructive", title: "Incorrect", description: "Better luck tomorrow!" });
        }

        updates.dailyProgress = {
            ...user.dailyProgress,
            [todayKey]: {
                ...(user.dailyProgress?.[todayKey] || {}),
                ...dailyProgressUpdate,
            }
        };

        updateUser(updates);
    };

    if (isLoading) {
        return (
            <Card className={cn("mb-6", className)}>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Question of the Day</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!question) return null;

    return (
        <Card className={cn("mb-6", className)}>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Question of the Day</CardTitle>
                <CardDescription>{question.question}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                 {question.choices.map((choice, index) => {
                    const isTheCorrectAnswer = choice === question.correctAnswer;
                    const isSelected = choice === selectedAnswer;

                    return (
                        <Button
                            key={`${choice}-${index}`}
                            variant="outline"
                            onClick={() => handleAnswer(choice)}
                            disabled={isAnswered}
                            className={cn(
                                "h-auto whitespace-normal justify-start p-4 w-full text-left rounded-lg",
                                isAnswered && isTheCorrectAnswer && "bg-green-100 border-green-300 hover:bg-green-100 text-green-800",
                                isAnswered && isSelected && !isTheCorrectAnswer && "bg-red-100 border-red-300 hover:bg-red-100 text-red-800",
                                isAnswered && !isSelected && !isTheCorrectAnswer && "opacity-60"
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span>{choice}</span>
                                {isAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {isAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-500" />}
                            </div>
                        </Button>
                    )
                })}
            </CardContent>
            <CardFooter>
                 <div className={`flex items-center gap-1 font-semibold text-green-600`}>
                  <Star className={`h-4 w-4 fill-green-500`} />
                  <span>5 Points</span>
                </div>
            </CardFooter>
        </Card>
    );
}
