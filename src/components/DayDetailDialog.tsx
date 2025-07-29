
"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getQuestionForDate } from '@/lib/data';
import type { DailyProgress, QuizQuestion } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Gem, BookOpen, Clock } from 'lucide-react';

interface DayDetailDialogProps {
  date: Date | null;
  onClose: () => void;
  userProgress?: DailyProgress;
}

export function DayDetailDialog({ date, onClose, userProgress }: DayDetailDialogProps) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);

  useEffect(() => {
    if (date) {
      setQuestion(getQuestionForDate(date));
    }
  }, [date]);

  if (!date) {
    return null;
  }

  const challengesCompleted = userProgress?.challengesCompleted?.length || 0;

  return (
    <Dialog open={!!date} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Progress for {format(date, 'MMMM d, yyyy')}</DialogTitle>
          <DialogDescription>
            Here's a summary of your activities on this day.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
                <Gem className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProgress?.pointsEarned || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pomodoros</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProgress?.pomodorosCompleted || 0}</div>
              </CardContent>
            </Card>
             <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Challenges Completed</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{challengesCompleted}</div>
              </CardContent>
            </Card>
          </div>

          {question && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex justify-between items-center">
                    <span>Question of the Day</span>
                     {userProgress?.qotdCompleted && (
                        <span className="flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1"/> Answered
                        </span>
                     )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{question.question}</p>
                <p className="text-sm text-muted-foreground mt-2">Correct Answer: <span className="font-bold">{question.answer}</span></p>
              </CardContent>
            </Card>
          )}

          {!userProgress && !question && (
             <p className="text-center text-muted-foreground">No activity recorded for this day.</p>
          )}

        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    