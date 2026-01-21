'use client';

import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Reviewer, Subject, Topic } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Tag, Brain, Book, Video, Bookmark, BarChart, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { AddQuestionDialog } from '@/components/AddQuestionDialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemo } from 'react';
import { MdxRenderer } from '@/components/MdxRenderer';

const articleTypeIcons = {
  "article": <Book className="h-4 w-4" />,
  "video": <Video className="h-4 w-4" />,
  "mixed": <Brain className="h-4 w-4" />,
};

const ArticleSkeleton = () => (
    <div>
        <Skeleton className="h-10 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full mt-4" />
             <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
        </div>
    </div>
)

export default function ReviewArticlePage() {
    const params = useParams();
    const slug = params.slug as string;
    const firestore = useFirestore();
    const { user, isAdmin, firebaseUser } = useUser();
    const { toast } = useToast();

    const articleQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'reviewers'), where('slug', '==', slug));
    }, [firestore, slug]);
    
    const subjectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'subjects');
    }, [firestore]);

    const topicsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'topics');
    }, [firestore]);

    const { data: articles, isLoading: isLoadingArticle } = useCollection<Reviewer>(articleQuery);
    const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);
    const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(topicsQuery);
    
    const article = articles?.[0];
    const subject = subjects?.find(s => s.id === article?.subjectId);
    const isLoading = isLoadingArticle || isLoadingSubjects || isLoadingTopics;

    const bookmarksQuery = useMemoFirebase(() => {
        if (!firestore || !user || !firebaseUser || firebaseUser.isAnonymous) return null;
        return collection(firestore, `users/${user.uid}/reviewerBookmarks`);
    }, [firestore, user, firebaseUser]);
    const { data: bookmarks } = useCollection<{ createdAt: string }>(bookmarksQuery);

    const isBookmarked = useMemo(() => {
        if (!bookmarks || !article) return false;
        return bookmarks.some(b => b.id === article.id);
    }, [bookmarks, article]);

    const handleToggleBookmark = async () => {
        if (!user || !firestore || !article || !firebaseUser || firebaseUser.isAnonymous) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to bookmark articles.' });
            return;
        }

        const bookmarkRef = doc(firestore, `users/${user.uid}/reviewerBookmarks`, article.id);

        try {
            if (isBookmarked) {
                await deleteDoc(bookmarkRef);
                toast({ title: 'Bookmark removed' });
            } else {
                await setDoc(bookmarkRef, { createdAt: serverTimestamp() });
                toast({ title: 'Article bookmarked!', className: "bg-green-100 border-green-300" });
            }
        } catch (serverError) {
             console.error("Error toggling bookmark: ", serverError);
             const permissionError = new FirestorePermissionError({
                path: bookmarkRef.path,
                operation: isBookmarked ? 'delete' : 'write',
                requestResourceData: isBookmarked ? undefined : { createdAt: new Date().toISOString() },
            });
            errorEmitter.emit('permission-error', permissionError);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update your bookmark.',
            });
        }
    };

    if (isLoading) {
        return <ArticleSkeleton />;
    }

    if (!article) {
        return <div className="text-center">Article not found.</div>;
    }
    
    const articleTopics = topics?.filter(topic => article.topicIds.includes(topic.id)) || [];

    const mdxComponents = {
        h1: (props: any) => <h2 className="text-3xl font-bold font-headline mt-12 mb-4 border-b pb-2" {...props} />,
        h2: (props: any) => <h3 className="text-2xl font-bold font-headline mt-10 mb-4" {...props} />,
        h3: (props: any) => <h4 className="text-xl font-bold font-headline mt-8 mb-4" {...props} />,
        p: (props: any) => <p className="leading-7 mb-4" {...props} />,
        ul: (props: any) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
        ol: (props: any) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
        li: (props: any) => <li className="pl-2" {...props} />,
        a: (props: any) => <a className="text-primary underline hover:text-primary/90" {...props} />,
        strong: (props: any) => <strong className="font-semibold" {...props} />,
        blockquote: (props: any) => <blockquote className="border-l-4 border-primary bg-muted/50 p-4 italic my-6 rounded-r-lg" {...props} />,
        code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
                <pre className="bg-slate-900 text-white rounded-lg p-4 my-6 overflow-x-auto">
                    <code className="font-mono text-sm" {...props}>
                        {children}
                    </code>
                </pre>
            ) : (
                <code className="bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm" {...props}>
                    {children}
                </code>
            );
        },
        hr: (props: any) => <hr className="my-8 border-border" {...props} />,
        table: (props: any) => (
            <div className="overflow-x-auto my-8 border rounded-lg">
                <table className="w-full" {...props} />
            </div>
        ),
        thead: (props: any) => <thead className="bg-muted/50" {...props} />,
        tr: (props: any) => <tr className="border-b m-0 p-0 even:bg-muted/20" {...props} />,
        th: (props: any) => <th className="p-3 font-semibold text-left" {...props} />,
        td: (props: any) => <td className="p-3" {...props} />,
    };

    return (
        <article className="prose prose-quoteless prose-neutral dark:prose-invert max-w-none">
            <header className="mb-8">
                 <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                    {subject && (
                        <Badge variant="secondary" className="capitalize" style={{ backgroundColor: subject.color, color: 'white' }}>
                            {subject.name}
                        </Badge>
                    )}
                     <Badge
                        className={cn(
                            "capitalize",
                            article.difficulty === 'easy' && 'bg-green-100 text-green-800',
                            article.difficulty === 'medium' && 'bg-yellow-100 text-yellow-800',
                            article.difficulty === 'hard' && 'bg-red-100 text-red-800'
                        )}
                    >
                        {article.difficulty}
                    </Badge>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight font-headline text-foreground">{article.title}</h1>
                <p className="text-lg text-muted-foreground mt-2">{article.excerpt}</p>
                 <div className="flex items-center text-sm text-muted-foreground gap-4 mt-4">
                    <div className="flex items-center gap-1.5">
                        {articleTypeIcons[article.reviewerType as keyof typeof articleTypeIcons]}
                        <span className="capitalize">{article.reviewerType}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{article.estimatedTime} min read</span>
                    </div>
                </div>
            </header>

            <Card className="not-prose mb-8">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-lg">Review Tools</CardTitle>
                    <div className="flex items-center gap-2">
                         {isAdmin && (
                            <>
                                <Link href={`/reviewer/review/${article.slug}/edit`} passHref>
                                    <Button variant="outline" size="icon" aria-label="Edit article">
                                        <Edit className="h-5 w-5" />
                                    </Button>
                                </Link>
                                {article && <AddQuestionDialog article={article} />}
                            </>
                        )}
                        <Button variant={isBookmarked ? "secondary" : "outline"} size="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}>
                            <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {articleTopics.length > 0 ? (
                        articleTopics.map(topic => {
                            const progress = user?.quizProgress?.[topic.id];
                            const averageScore = progress ? progress.averageScore : null;
                            return (
                                <div key={topic.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border p-3">
                                    <div className="flex-1">
                                        <p className="font-semibold">{topic.name}</p>
                                        {averageScore !== null && typeof averageScore === 'number' ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <BarChart className="h-4 w-4 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">
                                                    Average Score: <span className="font-bold">{averageScore.toFixed(0)}%</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-1">No quiz data yet.</p>
                                        )}
                                    </div>
                                    <Link href={`/reviewer/questions?topic=${topic.id}`} passHref className="w-full sm:w-auto">
                                        <Button variant="outline" className="w-full justify-center">
                                            <Brain className="mr-2 h-4 w-4" />
                                            Practice Quiz
                                        </Button>
                                    </Link>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">No practice quizzes available for this article.</p>
                    )}
                </CardContent>
            </Card>
            
            <div className="markdown-content">
                 <MdxRenderer source={article.content} components={mdxComponents} />
            </div>
        </article>
    );
}
