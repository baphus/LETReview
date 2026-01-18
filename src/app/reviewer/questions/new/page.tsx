
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Firebase and user hooks
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, doc, writeBatch } from 'firebase/firestore';
// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Code } from 'lucide-react';
import Link from 'next/link';
// Types
import type { Subject, Topic, QuizQuestion } from '@/lib/types';


// Schemas for validation
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

const batchImportSchema = z.object({
  jsonContent: z.string().min(1, 'JSON content cannot be empty.'),
});

// Zod schema for questions in batch import
const batchQuestionSchema = z.object({
  question: z.string().min(1, "Each question must have text."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  choices: z.array(z.string()).min(2, "Each question must have at least 2 choices.").max(4, "Each question can have at most 4 choices."),
  correctAnswer: z.string().min(1, "Each question must have a correct answer."),
  explanation: z.string().min(1, "Each question must have an explanation."),
});

type SingleQuestionFormValues = z.infer<typeof singleQuestionFormSchema>;
type BatchImportFormValues = z.infer<typeof batchImportSchema>;

export default function NewQuestionPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'gened' | 'profed' | 'majorship'>('profed');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? collection(firestore, 'topics') : null, [firestore]));
  
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
  });

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
      router.push('/quiz');
    }
  }, [isUserLoading, isAdmin, router, toast]);

  const onSingleSubmit = async (data: SingleQuestionFormValues) => {
    if (!firestore || !selectedSubject) {
      toast({ variant: 'destructive', title: 'Context Missing', description: 'Please select a category and subject first.' });
      return;
    }
    setIsSubmitting(true);
    
    const questionId = 'q-' + Date.now().toString(36);
    const newQuestion: Omit<QuizQuestion, 'id'> & { id: string } = {
      id: questionId,
      category: selectedCategory,
      subjectId: selectedSubject,
      topicIds: selectedTopics,
      difficulty: data.difficulty,
      type: 'multiple_choice',
      question: data.question,
      choices: data.choices,
      correctAnswer: data.choices[parseInt(data.correctAnswerIndex, 10)],
      explanation: data.explanation,
    };

    try {
      const batch = writeBatch(firestore);
      const questionRef = doc(firestore, 'questions', questionId);
      batch.set(questionRef, newQuestion);
      await batch.commit();

      toast({
        title: 'Question Added!',
        description: 'The new question has been added to the question bank.',
        className: 'bg-green-100 border-green-200',
      });
      singleQuestionForm.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Adding Question', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onBatchSubmit = async (data: BatchImportFormValues) => {
    if (!firestore || !selectedSubject) {
      toast({ variant: 'destructive', title: 'Context Missing', description: 'Please select a category and subject first.' });
      return;
    }
    setIsSubmitting(true);

    let parsedJson;
    try {
      parsedJson = JSON.parse(data.jsonContent);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Invalid JSON' });
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
    let errorFound = false;

    const newQuestions = batchQuestions.map((item, index) => {
      if (!item.choices.includes(item.correctAnswer)) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `In item ${index}: The 'correctAnswer' is not one of the 'choices'.` });
        errorFound = true;
      }
      return {
        id: `q-batch-${Date.now().toString(36)}-${index}`,
        category: selectedCategory,
        subjectId: selectedSubject,
        topicIds: selectedTopics,
        ...item
      };
    });

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
      toast({ title: 'Batch Import Successful!', description: `${newQuestions.length} questions have been added.` });
      batchImportForm.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Importing Questions', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !isAdmin) {
    return <div className="text-center p-8">Loading...</div>;
  }
  
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
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/quiz">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold font-headline">Add New Questions</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Set Question Context</CardTitle>
          <CardDescription>Choose the category, subject, and topics for the questions you're about to add.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={selectedCategory} onValueChange={(v) => {setSelectedCategory(v as any); setSelectedSubject(''); setSelectedTopics([]);}}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gened">General Education</SelectItem>
                  <SelectItem value="profed">Professional Education</SelectItem>
                  <SelectItem value="majorship">Majorship</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select value={selectedSubject} onValueChange={(v) => {setSelectedSubject(v); setSelectedTopics([]);}}>
                <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>
                  {isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.filter(s => s.categoryId === selectedCategory).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          </div>
          {selectedSubject && (
            <FormItem>
              <FormLabel>Topics (optional)</FormLabel>
              <div className="max-h-40 overflow-y-auto rounded-md border p-4 space-y-2">
                {isLoadingTopics ? <p>Loading...</p> : (topics?.filter(t => t.subjectId === selectedSubject) || []).map(topic => (
                  <div key={topic.id} className="flex items-center gap-2">
                    <Checkbox
                      id={topic.id}
                      checked={selectedTopics.includes(topic.id)}
                      onCheckedChange={(checked) => {
                        setSelectedTopics(prev => checked ? [...prev, topic.id] : prev.filter(id => id !== topic.id));
                      }}
                    />
                    <label htmlFor={topic.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{topic.name}</label>
                  </div>
                ))}
              </div>
            </FormItem>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <Tabs defaultValue="single" className="w-full">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Question</TabsTrigger>
                <TabsTrigger value="batch">Batch Import</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="single">
              <Form {...singleQuestionForm}>
                <form onSubmit={singleQuestionForm.handleSubmit(onSingleSubmit)} className="space-y-4 pt-4">
                  {/* Form content from AddQuestionDialog */}
                   <FormField control={singleQuestionForm.control} name="question" render={({ field }) => (
                        <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
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
                  <Button type="submit" disabled={isSubmitting || !selectedSubject}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Question
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="batch">
              <Form {...batchImportForm}>
                <form onSubmit={batchImportForm.handleSubmit(onBatchSubmit)} className="space-y-4 pt-4">
                  {/* Batch import form from AddQuestionDialog */}
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

                  <Button type="submit" disabled={isSubmitting || !selectedSubject}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Questions
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
