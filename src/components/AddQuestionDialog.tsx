
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
import { PlusCircle, Loader2, Code } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Reviewer, QuizQuestion } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const singleQuestionFormSchema = z.object({
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

type SingleQuestionFormValues = z.infer<typeof singleQuestionFormSchema>;

const batchImportSchema = z.object({
  jsonContent: z.string().min(1, 'JSON content cannot be empty.'),
});

const batchQuestionSchema = z.object({
  question: z.string().min(1, "Each question must have text."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  choices: z.array(z.string()).min(2, "Each question must have at least 2 choices.").max(4, "Each question can have at most 4 choices."),
  correctAnswer: z.string().min(1, "Each question must have a correct answer."),
  explanation: z.string().min(1, "Each question must have an explanation."),
});

type BatchImportFormValues = z.infer<typeof batchImportSchema>;


interface AddQuestionDialogProps {
  article: Reviewer;
}

export function AddQuestionDialog({ article }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const singleQuestionForm = useForm<SingleQuestionFormValues>({
    resolver: zodResolver(singleQuestionFormSchema),
    defaultValues: {
      question: '',
      difficulty: 'medium',
      choices: ['', '', '', ''],
      correctAnswerIndex: '',
      explanation: '',
    },
  });

  const batchImportForm = useForm<BatchImportFormValues>({
    resolver: zodResolver(batchImportSchema),
    defaultValues: {
      jsonContent: ''
    }
  });

  const onSingleSubmit = async (data: SingleQuestionFormValues) => {
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
      explanation: data.explanation,
    };

    const questionRef = doc(firestore, 'questions', questionId);

    try {
      await setDoc(questionRef, newQuestion);

      toast({
        title: 'Question Added!',
        description: 'The new question has been added to the question bank.',
        className: 'bg-green-100 border-green-200',
      });
      singleQuestionForm.reset();
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
  
  const onBatchSubmit = async (data: BatchImportFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Database not available.' });
      return;
    }
    setIsSubmitting(true);

    let parsedJson;
    try {
      parsedJson = JSON.parse(data.jsonContent);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'The provided text is not valid JSON.' });
      setIsSubmitting(false);
      return;
    }

    const validationResult = z.array(batchQuestionSchema).safeParse(parsedJson);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({ variant: 'destructive', title: 'Validation Error', description: `In item ${firstError.path[0]}: ${firstError.message}` });
      setIsSubmitting(false);
      return;
    }

    const batchQuestions = validationResult.data;
    const newQuestions: QuizQuestion[] = [];
    let errorFound = false;

    for (const [index, item] of batchQuestions.entries()) {
      if (!item.choices.includes(item.correctAnswer)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `In item ${index}: The 'correctAnswer' is not one of the 'choices'.` });
        errorFound = true;
        break;
      }
      const questionId = 'q-' + article.slug.slice(0, 15) + '-' + Date.now().toString(36) + '-' + index;
      newQuestions.push({
        id: questionId,
        category: article.category,
        subjectId: article.subjectId,
        topicIds: article.topicIds,
        reviewerIds: [article.id],
        difficulty: item.difficulty,
        type: 'multiple_choice',
        question: item.question,
        choices: item.choices,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
      });
    }

    if (errorFound) {
      setIsSubmitting(false);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      newQuestions.forEach(q => {
          const questionRef = doc(firestore, 'questions', q.id);
          batch.set(questionRef, q);
      });
      await batch.commit();

      toast({
        title: 'Batch Import Successful!',
        description: `${newQuestions.length} questions have been added.`,
        className: 'bg-green-100 border-green-200',
      });
      batchImportForm.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Importing Questions',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const jsonFormatReference = `[
  {
    "question": "Your question text here...",
    "difficulty": "easy",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correctAnswer": "The exact text of the correct choice",
    "explanation": "Explanation for the answer."
  }
]`;

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
            Create a question for "{article.title}".
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Question</TabsTrigger>
                <TabsTrigger value="batch">Batch Import</TabsTrigger>
            </TabsList>
            <TabsContent value="single">
                <Form {...singleQuestionForm}>
                <form onSubmit={singleQuestionForm.handleSubmit(onSingleSubmit)} className="space-y-4 pt-4">
                    <FormField control={singleQuestionForm.control} name="question" render={({ field }) => (
                        <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField control={singleQuestionForm.control} name="difficulty" render={({ field }) => (
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

                    <FormField control={singleQuestionForm.control} name="correctAnswerIndex" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Choices & Correct Answer</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                                {[0, 1, 2, 3].map(index => (
                                    <FormField key={index} control={singleQuestionForm.control} name={`choices.${index}` as any} render={({ field: choiceField }) => (
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

                    <FormField control={singleQuestionForm.control} name="explanation" render={({ field }) => (
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
            </TabsContent>
            <TabsContent value="batch">
                <Form {...batchImportForm}>
                    <form onSubmit={batchImportForm.handleSubmit(onBatchSubmit)} className="space-y-4 pt-4">
                        <FormField control={batchImportForm.control} name="jsonContent" render={({ field }) => (
                            <FormItem>
                                <FormLabel>JSON Content</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Paste your JSON array of questions here." className="min-h-[200px] font-mono text-xs" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Alert>
                          <Code className="h-4 w-4" />
                          <AlertTitle>Required JSON Format</AlertTitle>
                          <AlertDescription>
                            <p className="mb-2 text-xs">Paste an array of question objects. Example for one question:</p>
                            <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded-md">
                              <code>{jsonFormatReference}</code>
                            </pre>
                          </AlertDescription>
                        </Alert>
                        
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Import Questions
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
