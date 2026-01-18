
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, getDoc, writeBatch } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Subject, Topic, Reviewer, QuizQuestion } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Database, PlusCircle } from 'lucide-react';
import reviewersSeed from '../../../../../docs/reviewers-seed.json';
import subjectsSeed from '../../../../../docs/subjects-seed.json';
import topicsSeed from '../../../../../docs/topics-seed.json';
import questionsSeed from '../../../../../docs/questions-seed.json';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const reviewerFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  slug: z.string().min(3, "Slug must be at least 3 characters long.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  excerpt: z.string().min(20, "Excerpt is too short.").max(300, "Excerpt is too long."),
  content: z.string().min(100, "Content must be at least 100 characters long."),
  category: z.enum(['gened', 'profed', 'majorship'], { required_error: "Please select a category." }),
  subjectId: z.string({ required_error: "Please select a subject." }).min(1, "Please select a subject."),
  topicIds: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one topic.",
  }),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  reviewerType: z.enum(['article', 'video', 'mixed']),
  estimatedTime: z.coerce.number().min(1, "Estimated time must be at least 1 minute."),
});

type ReviewerFormValues = z.infer<typeof reviewerFormSchema>;

const subjectSchema = z.object({
  name: z.string().min(3, "Subject name must be at least 3 characters."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code (e.g., #RRGGBB)."),
});

const topicSchema = z.object({
  name: z.string().min(3, "Topic name must be at least 3 characters."),
});

const categories = [
    { id: 'gened', name: 'General Education' },
    { id: 'profed', name: 'Professional Education' },
    { id: 'majorship', name: 'Majorship' },
] as const;

export default function NewReviewerPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);

  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? query(collection(firestore, 'topics')) : null, [firestore]));

  const subjectForm = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", color: "#3F51B5" },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { name: "" },
  });

  const form = useForm<ReviewerFormValues>({
    resolver: zodResolver(reviewerFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      subjectId: '',
      estimatedTime: 25,
      difficulty: 'medium',
      reviewerType: 'article',
      topicIds: [],
      category: 'profed',
    },
  });

  const titleValue = form.watch("title");
  const selectedCategory = form.watch("category");
  const selectedSubjectId = form.watch("subjectId");

  useEffect(() => {
    if (titleValue) {
      const slug = titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      form.setValue('slug', slug, { shouldValidate: true });
    }
  }, [titleValue, form]);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
      router.push('/reviewer/review');
    }
  }, [isUserLoading, isAdmin, router, toast]);

  const handleAddSubject = async (data: z.infer<typeof subjectSchema>) => {
    if (!firestore || !selectedCategory) return;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const subjectRef = doc(firestore, 'subjects', slug);
      await setDoc(subjectRef, {
        ...data,
        slug,
        categoryId: selectedCategory,
        orderIndex: subjects?.length || 0,
        id: slug,
      });
      toast({ title: 'Subject Added', description: `${data.name} has been added.` });
      subjectForm.reset();
      setIsAddSubjectOpen(false);
      form.setValue('subjectId', slug, { shouldValidate: true });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleAddTopic = async (data: z.infer<typeof topicSchema>) => {
    if (!firestore || !selectedSubjectId) return;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const topicRef = doc(firestore, 'topics', slug);
      await setDoc(topicRef, {
        ...data,
        subjectId: selectedSubjectId,
        slug,
        id: slug,
      });
      toast({ title: 'Topic Added', description: `${data.name} has been added.` });
      topicForm.reset();
      setIsAddTopicOpen(false);
      form.setValue('topicIds', [...form.getValues('topicIds'), slug], { shouldValidate: true });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSeed = async () => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Firestore not available" });
        return;
    }
    try {
      const batch = writeBatch(firestore);

      subjectsSeed.forEach((subject) => {
        batch.set(doc(firestore, 'subjects', subject.id), subject);
      });

      topicsSeed.forEach((topic) => {
        batch.set(doc(firestore, 'topics', topic.id), topic);
      });

      reviewersSeed.forEach((reviewer: any) => {
        batch.set(doc(firestore, 'reviewers', reviewer.id), { ...reviewer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      });
      
      questionsSeed.forEach((question) => {
        const questionRef = doc(firestore, 'questions', question.id);
        batch.set(questionRef, question);
      });

      await batch.commit();
      
      toast({
        title: "Database Seeded",
        description: `Content was successfully added.`,
        className: "bg-green-100 border-green-300"
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Seeding Failed",
        description: error.message || "An unknown error occurred.",
      });
      console.error("Seeding failed:", error);
    }
  };

  const onSubmit = async (data: ReviewerFormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);

    const newReviewer: Omit<Reviewer, 'id'> = {
      ...data,
      contentFormat: 'markdown',
      status: 'published',
      orderIndex: 0, 
      createdBy: user.uid,
      publishedAt: new Date().toISOString(),
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    try {
      const docRef = doc(firestore, 'reviewers', data.slug);
      await setDoc(docRef, newReviewer);
      toast({
        title: 'Article Published!',
        description: 'Your new review article is now live.',
        className: 'bg-green-100 border-green-200'
      });
      router.push(`/reviewer/review/${data.slug}`);
    } catch (error) {
      console.error("Error creating reviewer:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem creating the article. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !isAdmin) {
    return <div className="text-center p-8">Checking permissions...</div>;
  }
  
  const availableTopics = topics?.filter(t => t.subjectId === selectedSubjectId) || [];

  return (
    <>
      <Card className="mb-6">
          <CardHeader>
              <CardTitle>Content Management</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Seed the database with initial questions and articles. This should only be run once.</p>
              <Button variant="outline" className="w-full" onClick={handleSeed}><Database className="mr-2 h-4 w-4" />Seed Database</Button>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create New Review Article</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Key Theories of Cognitive Development" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="auto-generated-from-title" {...field} />
                    </FormControl>
                    <FormDescription>This is the unique identifier for the URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A short summary of the article..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Write your article content here. Use Markdown for formatting." className="min-h-[300px] font-mono" {...field} />
                    </FormControl>
                    <FormDescription>
                      Supports headings (#), bold (**text**), italics (*text*), lists, and more.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('subjectId', ''); // Reset subject when category changes
                            form.setValue('topicIds', []); // Reset topics too
                        }} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                {selectedCategory && (
                    <FormField
                        control={form.control}
                        name="subjectId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={(value) => {
                                if (value === 'add-new') {
                                    setIsAddSubjectOpen(true);
                                } else {
                                    field.onChange(value);
                                    form.setValue('topicIds', []); // Reset topics when subject changes
                                }
                            }} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.filter(s => s.categoryId === selectedCategory).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                <SelectItem value="add-new" className="text-primary font-semibold">
                                    <span className="flex items-center"><PlusCircle className="h-4 w-4 mr-2" /> Add new subject...</span>
                                </SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
              </div>
              
              {selectedSubjectId && (
                    <FormField
                    control={form.control}
                    name="topicIds"
                    render={() => (
                        <FormItem>
                            <div className="flex justify-between items-center mb-2">
                                <FormLabel>Topics</FormLabel>
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTopicOpen(true)}>
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    New Topic
                                </Button>
                            </div>
                        
                            <div className="max-h-40 overflow-y-auto rounded-md border p-4 space-y-2">
                            {isLoadingTopics ? <p>Loading...</p> : availableTopics.length > 0 ? availableTopics.map((topic) => (
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
                                                ? field.onChange([...field.value, topic.id])
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
                                )) : <p className="text-sm text-muted-foreground text-center">No topics found for this subject. Add one!</p>}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
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
                  <FormField
                    control={form.control}
                    name="reviewerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reviewer Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estimated Time (min)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="25" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Article
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Add Subject Dialog */}
      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
             <DialogDescription>For category: {categories.find(c => c.id === selectedCategory)?.name || '...'}</DialogDescription>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleAddSubject)} className="space-y-4">
              <FormField control={subjectForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Subject Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={subjectForm.control} name="color" render={({ field }) => (
                  <FormItem><FormLabel>Color</FormLabel><FormControl><Input type="color" {...field} className="p-1 h-10 w-full" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddSubjectOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={subjectForm.formState.isSubmitting}>
                    {subjectForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Subject
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add Topic Dialog */}
      <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Topic</DialogTitle>
            <DialogDescription>For subject: {subjects?.find(s => s.id === selectedSubjectId)?.name || '...'}</DialogDescription>
          </DialogHeader>
          <Form {...topicForm}>
            <form onSubmit={topicForm.handleSubmit(handleAddTopic)} className="space-y-4">
              <FormField control={topicForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Topic Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddTopicOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={topicForm.formState.isSubmitting}>
                    {topicForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Topic
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
