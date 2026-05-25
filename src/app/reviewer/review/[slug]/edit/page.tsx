
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, getDoc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Subject, Topic, Reviewer } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Database, PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

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

export default function EditReviewerPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [isManageTopicsOpen, setIsManageTopicsOpen] = useState(false);

  // Fetch the article to edit
  const articleRef = useMemoFirebase(() => firestore && slug ? doc(firestore, 'reviewers', slug) : null, [firestore, slug]);
  const { data: article, isLoading: isLoadingArticle } = useDoc<Reviewer>(articleRef);
  
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
      category: 'profed',
      subjectId: '',
      topicIds: [],
      difficulty: 'medium',
      reviewerType: 'article',
      estimatedTime: 25,
    }
  });
  
  useEffect(() => {
    if (article) {
        form.reset(article);
    }
  }, [article, form]);

  const selectedCategory = form.watch("category");
  const selectedSubjectId = form.watch("subjectId");

  useEffect(() => {
    if (!isUserLoading && article && user) {
        const isCreator = article.createdBy === user.uid;
        if (!isCreator && !isAdmin) {
            toast({ variant: 'destructive', title: 'Unauthorized', description: 'You can only edit your own articles.' });
            router.push(`/reviewer/review/${slug}`);
        }
    }
  }, [isUserLoading, article, user, isAdmin, router, toast, slug]);

  const handleAddSubject = async (data: z.infer<typeof subjectSchema>) => {
    if (!firestore || !selectedCategory) return;
    const newSlug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const subjectRef = doc(firestore, 'subjects', newSlug);
      await setDoc(subjectRef, {
        ...data,
        slug: newSlug,
        categoryId: selectedCategory,
        orderIndex: subjects?.length || 0,
        id: newSlug,
      });
      toast({ title: 'Subject Added', description: `${data.name} has been added.` });
      subjectForm.reset();
      form.setValue('subjectId', newSlug, { shouldValidate: true });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleAddTopic = async (data: z.infer<typeof topicSchema>) => {
    if (!firestore || !selectedSubjectId) return;
    const newSlug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const topicRef = doc(firestore, 'topics', newSlug);
      await setDoc(topicRef, {
        ...data,
        subjectId: selectedSubjectId,
        slug: newSlug,
        id: newSlug,
      });
      toast({ title: 'Topic Added', description: `${data.name} has been added.` });
      topicForm.reset();
      form.setValue('topicIds', [...form.getValues('topicIds'), newSlug], { shouldValidate: true });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleDeleteSubject = async (subjectId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'subjects', subjectId));
        toast({ title: 'Subject Deleted' });
        if (form.getValues('subjectId') === subjectId) {
            form.setValue('subjectId', '');
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'topics', topicId));
        toast({ title: 'Topic Deleted' });
        form.setValue('topicIds', form.getValues('topicIds').filter(id => id !== topicId), { shouldValidate: true });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const onSubmit = async (data: ReviewerFormValues) => {
    if (!firestore || !user || !articleRef) return;
    setIsSubmitting(true);

    const updatedReviewer = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(articleRef, updatedReviewer);
      toast({
        title: 'Article Updated!',
        description: 'Your changes have been saved.',
        className: 'bg-green-100 border-green-200'
      });
      router.push(`/reviewer/review/${data.slug}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem updating the article. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoadingArticle) {
    return <div className="text-center p-8">Loading...</div>;
  }
  
  if (!article) {
    return <div className="text-center p-8">Article not found.</div>;
  }

  const availableTopics = topics?.filter(t => t.subjectId === selectedSubjectId) || [];

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
              <Link href={`/reviewer/review/${slug}`} passHref>
                  <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <CardTitle className="font-headline text-2xl">Edit Review Article</CardTitle>
          </div>
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
                      <Input placeholder="auto-generated-from-title" {...field} disabled />
                    </FormControl>
                    <FormDescription>The slug cannot be changed after creation.</FormDescription>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                                if (value === 'manage') {
                                    setIsManageSubjectsOpen(true);
                                } else {
                                    field.onChange(value);
                                }
                            }} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.filter(s => s.categoryId === selectedCategory).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                {isAdmin && (
                                    <SelectItem value="manage" className="text-primary font-semibold">
                                        <span className="flex items-center"><PlusCircle className="h-4 w-4 mr-2" /> Manage subjects...</span>
                                    </SelectItem>
                                )}
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
                                {isAdmin && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsManageTopicsOpen(true)}>
                                        <PlusCircle className="h-4 w-4 mr-2" />
                                        Manage Topics
                                    </Button>
                                )}
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
                                )) : <p className="text-sm text-muted-foreground text-center">No topics found.</p>}
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
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Article
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isManageSubjectsOpen} onOpenChange={setIsManageSubjectsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Subjects</DialogTitle>
                <DialogDescription>Add or delete subjects for the '{categories.find(c => c.id === selectedCategory)?.name}' category.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {isLoadingSubjects ? <p>Loading...</p> : (subjects?.filter(s => s.categoryId === selectedCategory) || []).map(subject => (
                    <div key={subject.id} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: subject.color }} />
                            <span>{subject.name}</span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This will permanently delete the subject "{subject.name}".
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>
            <Separator />
            <p className="text-sm font-medium">Add New Subject</p>
            <Form {...subjectForm}>
                <form onSubmit={subjectForm.handleSubmit(handleAddSubject)} className="space-y-4">
                  <FormField control={subjectForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel className="sr-only">Subject Name</FormLabel><FormControl><Input placeholder="Subject Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={subjectForm.control} name="color" render={({ field }) => (
                      <FormItem><FormLabel className="sr-only">Color</FormLabel><FormControl><div className="flex items-center gap-2"><span>Color:</span><Input type="color" {...field} className="p-1 h-10 w-full" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter className="!mt-2">
                    <Button type="submit" disabled={subjectForm.formState.isSubmitting}>
                        {subjectForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Subject
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageTopicsOpen} onOpenChange={setIsManageTopicsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Topics</DialogTitle>
            <DialogDescription>For subject: {subjects?.find(s => s.id === selectedSubjectId)?.name || '...'}</DialogDescription>
          </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {isLoadingTopics ? <p>Loading...</p> : availableTopics.map(topic => (
                    <div key={topic.id} className="flex items-center justify-between rounded-md border p-2">
                        <span>{topic.name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the topic "{topic.name}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>
            <Separator/>
            <p className="text-sm font-medium">Add New Topic</p>
          <Form {...topicForm}>
            <form onSubmit={topicForm.handleSubmit(handleAddTopic)} className="space-y-4">
              <FormField control={topicForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel className="sr-only">Topic Name</FormLabel><FormControl><Input placeholder="Topic Name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="!mt-2">
                <Button type="submit" disabled={topicForm.formState.isSubmitting}>
                    {topicForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Topic
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
