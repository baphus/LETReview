
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Reviewer, QuizQuestion } from '@/lib/types';

const questionFormSchema = z.object({
  question: z.string().min(10, 'Question is too short.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  choices: z.tuple([
    z.string().min(1, 'Choice A cannot be empty.'),
    z.string().min(1, 'Choice B cannot be empty.'),
    z.string().min(1, 'Choice C cannot be empty.'),
    z.string().min(1, 'Choice D cannot be empty.'),
  ]),
  correctAnswerIndex: z.string().min(1, 'You must select a correct answer.'),
  explanation: z.string().min(10, 'Explanation is too short.'),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

interface AddQuestionDialogProps {
  article: Reviewer;
}

export function AddQuestionDialog({ article }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      question: '',
      difficulty: 'medium',
      choices: ['', '', '', ''],
      correctAnswerIndex: '',
      explanation: '',
    },
  });

  const onSubmit = async (data: QuestionFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Database not available.' });
      return;
    }
    setIsSubmitting(true);
    
    const questionId = 'q-' + article.slug.slice(0, 20) + '-' + Date.now().toString(36);
    const newQuestion: QuizQuestion = {
      id: questionId,
      category: article.category,
      subjectId: article.subjectId,
      topicIds: article.topicIds,
      reviewerIds: [article.id],
      difficulty: data.difficulty,
      type: 'multiple_choice',
      question: data.question,
      choices: data.choices,
      correctAnswer: data.choices[parseInt(data.correctAnswerIndex)],
      answer: data.choices[parseInt(data.correctAnswerIndex)], // Ensure answer field is populated
      explanation: data.explanation,
    };

    const categoryDocRef = doc(firestore, 'questions', article.category);

    try {
      const docSnap = await getDoc(categoryDocRef);
      const existingQuestions = docSnap.exists() ? docSnap.data().questions || [] : [];
      const newQuestions = [...existingQuestions, newQuestion];
      await setDoc(categoryDocRef, { questions: newQuestions }, { merge: true });

      toast({
        title: 'Question Added!',
        description: 'The new question has been added to the question bank.',
        className: 'bg-green-100 border-green-200',
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Adding Question',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex-1">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
          <DialogDescription>
            Create a new question and link it to the article "{article.title}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="question" render={({ field }) => (
                <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="correctAnswerIndex" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Choices & Correct Answer</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                        {[0, 1, 2, 3].map(index => (
                            <FormField key={index} control={form.control} name={`choices.${index}` as any} render={({ field: choiceField }) => (
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <div className="flex items-center gap-2 w-full">
                                            <RadioGroupItem value={String(index)} />
                                            <Input {...choiceField} placeholder={`Choice ${String.fromCharCode(65 + index)}`} />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )} />
                        ))}
                    </RadioGroup>
                  </FormControl>
                <FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="explanation" render={({ field }) => (
                <FormItem><FormLabel>Explanation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
