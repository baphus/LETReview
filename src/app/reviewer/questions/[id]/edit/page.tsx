'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Firebase and user hooks
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, doc, updateDoc, query } from 'firebase/firestore';
// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
// Types
import type { Subject, Topic, QuizQuestion } from '@/lib/types';

// Schema for validation
const formSchema = z.object({
  question: z.string().min(10, 'Question is too short.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  choices: z.tuple([
    z.string().min(1, 'Choice A cannot be empty.'),
    z.string().min(1, 'Choice B cannot be empty.'),
    z.string().min(1, 'Choice C cannot be empty.'),
    z.string().min(1, 'Choice D cannot be empty.'),
  ]),
  correctAnswer: z.string().min(1, 'Correct answer must be one of the choices.'),
  explanation: z.string().min(10, 'Explanation is too short.'),
  category: z.enum(['gened', 'profed', 'majorship']),
  subjectId: z.string().optional(),
  topicIds: z.array(z.string()).optional(),
}).refine(data => data.choices.includes(data.correctAnswer), {
    message: "Correct answer must be one of the choices",
    path: ["correctAnswer"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'questions', id) : null, [firestore, id]);
  const { data: question, isLoading: isLoadingQuestion } = useDoc<QuizQuestion>(questionRef);
  
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? collection(firestore, 'topics') : null, [firestore]));
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        question: '',
        difficulty: 'medium',
        choices: ['', '', '', ''],
        correctAnswer: '',
        explanation: '',
        category: 'profed',
        subjectId: '',
        topicIds: []
    }
  });
  
  useEffect(() => {
    if (question) {
        form.reset({
            ...question,
            choices: question.choices as [string, string, string, string] || ['', '', '', ''],
            correctAnswer: question.correctAnswer || '',
            explanation: question.explanation || '',
            subjectId: question.subjectId || '',
            topicIds: question.topicIds || [],
        });
    }
  }, [question, form]);

  const selectedCategory = form.watch("category");
  const selectedSubject = form.watch("subjectId");

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
      router.push('/quiz');
    }
  }, [isUserLoading, isAdmin, router, toast]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !questionRef) {
      toast({ variant: 'destructive', title: 'Database not available', description: 'Please try again later.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      await updateDoc(questionRef, data);

      toast({
        title: 'Question Updated!',
        description: 'The question has been updated successfully.',
        className: 'bg-green-100 border-green-200',
      });
      router.push('/admin');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Updating Question', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoadingQuestion || !isAdmin) {
    return <div className="text-center p-8">Loading...</div>;
  }
  
  const correctAnswer = form.watch("correctAnswer");

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold font-headline">Edit Question</h1>
      </div>
      
      <Card>
        <CardHeader>
           <CardTitle>Question Details</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="question" render={({ field }) => (
                    <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="gened">General Education</SelectItem>
                                    <SelectItem value="profed">Professional Education</SelectItem>
                                    <SelectItem value="majorship">Majorship</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                        <FormItem><FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="subjectId" render={({ field }) => (
                        <FormItem><FormLabel>Subject (optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.filter(s => s.categoryId === selectedCategory).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                
                 {selectedSubject && (
                    <FormField
                        control={form.control}
                        name="topicIds"
                        render={() => (
                            <FormItem>
                            <FormLabel>Topics (optional)</FormLabel>
                            <div className="max-h-40 overflow-y-auto rounded-md border p-4 space-y-2">
                                {isLoadingTopics ? <p>Loading...</p> : (topics?.filter(t => t.subjectId === selectedSubject) || []).map(topic => (
                                <FormField
                                    key={topic.id}
                                    control={form.control}
                                    name="topicIds"
                                    render={({ field }) => (
                                    <FormItem key={topic.id} className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(topic.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), topic.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== topic.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                        {topic.name}
                                        </FormLabel>
                                    </FormItem>
                                    )}
                                />
                                ))}
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}


                <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Choices & Correct Answer</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                            {[0, 1, 2, 3].map(index => {
                                const choiceField = form.watch(`choices.${index}` as const);
                                return (
                                <FormField key={index} control={form.control} name={`choices.${index}` as any} render={({ field: currentChoiceField }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <div className="flex items-center gap-2 w-full">
                                                <RadioGroupItem value={currentChoiceField.value || ''} />
                                                <Input {...currentChoiceField} placeholder={`Choice ${String.fromCharCode(65 + index)}`} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )} />
                            )})}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="explanation" render={({ field }) => (
                    <FormItem><FormLabel>Explanation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Question
                </Button>
            </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
