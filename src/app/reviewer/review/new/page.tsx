
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';

const reviewerFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  slug: z.string().min(3, "Slug must be at least 3 characters long.").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  excerpt: z.string().min(20, "Excerpt is too short.").max(300, "Excerpt is too long."),
  content: z.string().min(100, "Content must be at least 100 characters long."),
  subjectId: z.string({ required_error: "Please select a subject." }).min(1, "Please select a subject."),
  topicIds: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one topic.",
  }),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  reviewerType: z.enum(['article', 'video', 'mixed']),
  estimatedTime: z.coerce.number().min(1, "Estimated time must be at least 1 minute."),
});

type ReviewerFormValues = z.infer<typeof reviewerFormSchema>;

export default function NewReviewerPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? query(collection(firestore, 'topics')) : null, [firestore]));

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
    },
  });

  const titleValue = form.watch("title");

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

  const onSubmit = async (data: ReviewerFormValues) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);

    const newReviewer: Omit<Reviewer, 'id'> = {
      ...data,
      status: 'published',
      orderIndex: 0, 
      createdBy: user.uid,
      publishedAt: new Date().toISOString(),
      createdAt: serverTimestamp() as any, // Let server set this
      updatedAt: serverTimestamp() as any, // Let server set this
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

  return (
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
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="topicIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Topics</FormLabel>
                       <FormDescription>
                        Select applicable topics for this article.
                      </FormDescription>
                      <div className="max-h-40 overflow-y-auto rounded-md border p-4 space-y-2">
                         {isLoadingTopics ? <p>Loading...</p> : topics?.map((topic) => (
                            <FormField
                              key={topic.id}
                              control={form.control}
                              name="topicIds"
                              render={({ field }) => {
                                return (
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
                                )
                              }}
                            />
                          ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Article
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
