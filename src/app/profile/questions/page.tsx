
"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loadUserProfile, saveUserProfile } from '@/lib/data';
import type { QuizQuestion, QuizQuestionForm, UserProfile, QuestionBank } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash, Edit, PlusCircle, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const questionFormSchema = z.object({
  id: z.number().optional(),
  question: z.string().min(10, 'Question must be at least 10 characters long.'),
  image: z.string().optional().or(z.literal('')),
  choices: z.array(z.string().min(1, "Choice can't be empty.")).min(2, 'Must have at least 2 choices.').max(4, 'Cannot have more than 4 choices.'),
  answer: z.string().min(1, 'Answer is required.'),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
}).refine(data => data.choices.includes(data.answer), {
  message: 'The correct answer must be one of the choices.',
  path: ['answer'],
});


const QuestionForm = ({
  onSubmit,
  initialData,
  onOpenChange,
}: {
  onSubmit: (data: QuizQuestionForm) => void;
  initialData?: QuizQuestionForm | null;
  onOpenChange: (open: boolean) => void;
}) => {
  const form = useForm<QuizQuestionForm>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: initialData || {
      question: '',
      image: '',
      choices: ['', '', '', ''],
      answer: '',
      explanation: '',
      difficulty: 'easy',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'choices',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({ variant: "destructive", title: "Image too large", description: "Please select an image smaller than 2MB." });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            form.setValue('image', base64String);
            setImagePreview(base64String);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: QuizQuestionForm) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };
  
  useEffect(() => {
    const defaultValues = initialData || {
      question: '',
      image: '',
      choices: ['', '', '', ''],
      answer: '',
      explanation: '',
      difficulty: 'easy',
    };
    form.reset(defaultValues);
    setImagePreview(defaultValues.image || null);
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          <DialogDescription>
            Fill in the details for your question below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                    <Textarea placeholder="What is the capital of France?" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormItem>
                <FormLabel>Image (Optional)</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                           <ImageIcon className="mr-2 h-4 w-4"/> Upload Image
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                        {imagePreview && <Image src={imagePreview} alt="Preview" width={40} height={40} className="rounded-md object-cover" />}
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
            
            <div>
                <Label>Choices</Label>
                <div className="space-y-2 mt-2">
                    {fields.map((field, index) => (
                    <FormField
                        key={field.id}
                        control={form.control}
                        name={`choices.${index}`}
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input placeholder={`Choice ${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    ))}
                </div>
            </div>

            <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Correct Answer</FormLabel>
                <FormControl>
                    <Input placeholder="Enter the exact text of the correct choice" {...field} />
                </FormControl>
                 <FormDescription>
                    Copy and paste the correct choice text here.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="explanation"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Explanation (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="Provide a brief explanation for the answer." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a difficulty" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save Question</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


function QuestionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionForm | null>(null);
  
  const loadBankData = useCallback(() => {
    const userProfile = loadUserProfile();
    if (userProfile && bankId) {
        setProfile(userProfile);
        const currentBank = userProfile.banks.find(b => b.id === bankId);
        if (currentBank) {
            setBank(currentBank);
            setQuestions(currentBank.questions || []);
        } else {
            toast({ variant: "destructive", title: "Bank not found" });
            router.push('/profile');
        }
    } else {
        router.push('/login');
    }
  }, [bankId, router, toast]);

  useEffect(() => {
    loadBankData();
  }, [loadBankData]);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };

  const updateBankQuestions = (updatedQuestions: QuizQuestion[]) => {
    if (profile && bank) {
        const updatedBank = { ...bank, questions: updatedQuestions };
        const bankIndex = profile.banks.findIndex(b => b.id === bank.id);
        if (bankIndex !== -1) {
            profile.banks[bankIndex] = updatedBank;
            saveUserProfile(profile);
            setBank(updatedBank);
            setQuestions(updatedQuestions);
        }
    }
  }

  const handleDeleteQuestion = (id: number) => {
    const updatedQuestions = questions.filter(q => q.id !== id);
    updateBankQuestions(updatedQuestions);
    toast({
      title: 'Question Deleted',
      description: 'The question has been removed from this bank.',
      className: "bg-primary border-primary text-primary-foreground",
    });
  };

  const handleFormSubmit = (data: QuizQuestionForm) => {
    let updatedQuestions: QuizQuestion[];
    
    if (data.id) { // Editing existing question
      updatedQuestions = questions.map(q =>
        q.id === data.id ? { ...q, ...data, category: 'custom' } : q
      );
      toast({
        title: 'Question Updated!',
        description: 'Your changes have been saved.',
        className: "bg-primary border-primary text-primary-foreground",
      });
    } else { // Adding new question
      const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
      const newQuestion: QuizQuestion = {
        ...data,
        id: newId,
        category: 'custom',
      };
      updatedQuestions = [...questions, newQuestion];
      toast({
        title: 'Question Added!',
        description: 'Your new question is ready for review.',
        className: "bg-primary border-primary text-primary-foreground",
      });
    }
    
    updateBankQuestions(updatedQuestions);
    setIsFormOpen(false);
  };

  if (!bank) {
    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <header className="flex items-center gap-4 mb-6">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-8 w-48" />
            </header>
            <Skeleton className="h-10 w-40 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold font-headline">Manage Questions</h1>
            <p className="text-muted-foreground">For bank: "{bank.name}"</p>
        </div>
      </header>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto mb-6" onClick={handleAddQuestion}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Question
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md md:max-w-xl">
                 <QuestionForm 
                    onSubmit={handleFormSubmit}
                    initialData={editingQuestion}
                    onOpenChange={setIsFormOpen}
                 />
            </DialogContent>
        </Dialog>


      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {questions.length > 0 ? (
          questions.map((q) => (
            <Card 
                key={q.id}
                className="flex flex-col cursor-pointer hover:border-primary transition-all duration-200 hover:scale-105"
                onClick={() => handleEditQuestion(q)}
            >
                {q.image && (
                   <div className="relative w-full h-32">
                        <Image src={q.image} alt={q.question} layout="fill" objectFit="cover" className="rounded-t-lg" />
                   </div>
                )}
                <CardContent className="p-4 flex-1">
                    <p className="font-semibold text-sm line-clamp-4">{q.question}</p>
                </CardContent>
                 <CardFooter className="p-2 border-t mt-auto">
                    <div className="flex w-full justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditQuestion(q)}}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this question. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}>
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="text-center p-8">
                <CardTitle>No Questions Yet</CardTitle>
                <CardDescription className="mt-2">
                Click the "Add New Question" button to start building your question bank.
                </CardDescription>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto p-4 max-w-4xl"><p>Loading...</p></div>}>
            <QuestionsPageContent />
        </Suspense>
    )
}
