
'use client';

import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Reviewer, Subject, Topic, ReviewerProgress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Tag, Brain, Book, Video, Bookmark, BarChart, Edit, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemo, useState, useEffect } from 'react';
import { MdxRenderer } from '@/components/MdxRenderer';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


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

    // State for pagination
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

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

    // Query for user progress on this specific article
    const progressRef = useMemoFirebase(() => {
        if (!firestore || !user || !article || firebaseUser?.isAnonymous) return null;
        return doc(firestore, `users/${user.uid}/reviewerProgress`, article.id);
    }, [firestore, user, article, firebaseUser]);
    const { data: progress, isLoading: isLoadingProgress } = useDoc<ReviewerProgress>(progressRef);
    
    const bookmarksQuery = useMemoFirebase(() => {
        if (!firestore || !user || !firebaseUser || firebaseUser.isAnonymous) return null;
        return collection(firestore, `users/${user.uid}/reviewerBookmarks`);
    }, [firestore, user, firebaseUser]);
    const { data: bookmarks } = useCollection<{ createdAt: string }>(bookmarksQuery);

    const subject = subjects?.find(s => s.id === article?.subjectId);
    const isLoading = isLoadingArticle || isLoadingSubjects || isLoadingTopics;

    // Effect to split content into pages when article loads
    useEffect(() => {
        if (article) {
            const WORDS_PER_PAGE = 450;
            const finalPages: string[] = [];
            
            // Treat the entire content as one block and split by paragraphs.
            const paragraphs = article.content.split(/\n\n/);
            let currentPageContent = "";

            for (const para of paragraphs) {
                const trimmedPara = para.trim();
                if (!trimmedPara) continue;

                const currentWordCount = currentPageContent.split(/\s+/).filter(Boolean).length;
                const paraWordCount = trimmedPara.split(/\s+/).filter(Boolean).length;

                // If adding the next paragraph would make the page too long,
                // and the current page is not empty, push the current page.
                if (currentWordCount > 0 && currentWordCount + paraWordCount > WORDS_PER_PAGE) {
                    finalPages.push(currentPageContent);
                    currentPageContent = trimmedPara; // Start a new page with the current paragraph
                } else {
                    // Otherwise, add the paragraph to the current page.
                    if (currentPageContent.length > 0) {
                        currentPageContent += '\n\n';
                    }
                    currentPageContent += trimmedPara;
                }
            }

            // Add any remaining content as the last page.
            if (currentPageContent.trim()) {
                finalPages.push(currentPageContent);
            }
            
            setPages(finalPages.length > 0 ? finalPages : (article.content ? [article.content] : []));
        }
    }, [article]);

    // Effect to set initial page from saved progress
    useEffect(() => {
        if (progress && pages.length > 0) {
            const bookmarkedPage = progress.lastReadPosition || 0;
            if (bookmarkedPage < pages.length) {
                setCurrentPage(bookmarkedPage);
            }
        }
    // We only want this to run once when progress and pages are loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, pages.length > 0]);

    // Debounced effect to save progress when page changes
    useEffect(() => {
        const saveProgress = async () => {
            if (!progressRef || pages.length === 0 || isLoadingProgress || !user || firebaseUser?.isAnonymous) return;

            const totalPages = pages.length;
            const progressPercent = Math.round(((currentPage + 1) / totalPages) * 100);
            let status: ReviewerProgress['status'] = 'in_progress';
            if (currentPage === totalPages - 1) status = 'completed';
            else if (progressPercent < 5 && currentPage === 0) status = 'not_started';

            const progressData: Partial<ReviewerProgress> = {
                status,
                progressPercent,
                lastReadPosition: currentPage,
                updatedAt: serverTimestamp() as any,
            };

            try {
                await setDoc(progressRef, progressData, { merge: true });
            } catch (serverError) {
                console.error("Could not save progress", serverError);
                const permissionError = new FirestorePermissionError({
                    path: progressRef.path,
                    operation: 'write',
                    requestResourceData: progressData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        };

        const timeoutId = setTimeout(saveProgress, 1500); // Debounce for 1.5s
        return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, pages.length]);

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
    
    const handleNextPage = () => {
        if (currentPage < pages.length - 1) {
            setCurrentPage(p => p + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(p => p - 1);
            window.scrollTo(0, 0);
        }
    };

    if (isLoading) {
        return <ArticleSkeleton />;
    }

    if (!article) {
        return <div className="text-center">Article not found.</div>;
    }
    
    const articleTopics = topics?.filter(topic => article.topicIds.includes(topic.id)) || [];
    const totalPages = pages.length;
    const currentProgress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

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
        <article className="prose prose-quoteless prose-neutral dark:prose-invert max-w-none pb-32">
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
            
            <div className="markdown-content" suppressHydrationWarning>
                {pages.length > 0 && currentPage < pages.length ? (
                    <MdxRenderer source={pages[currentPage]} components={mdxComponents} />
                ) : (
                    <p>Loading content...</p>
                )}
            </div>

            {totalPages > 1 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-sm transition-[margin-left] duration-300 md:ml-[var(--sidebar-width)] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[var(--sidebar-width-icon)]">
                    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-2">
                        <Progress value={currentProgress} className="h-1" />
                        <div className="flex items-center justify-between gap-4 mt-2">
                            <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={currentPage === 0}>
                                <ArrowLeft className="h-5 w-5" />
                                <span className="sr-only">Previous Page</span>
                            </Button>
                            
                             <div className="flex items-center gap-2">
                                <Button variant={isBookmarked ? "secondary" : "ghost"} size="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}>
                                    <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current")} />
                                </Button>
                               
                               {articleTopics.length > 0 && (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label="Practice Quizzes">
                                            <Brain className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 mb-2">
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">Practice Quizzes</h4>
                                                <p className="text-sm text-muted-foreground">
                                                Test your knowledge on topics from this article.
                                                </p>
                                            </div>
                                            <div className="grid gap-2">
                                                {articleTopics.map(topic => (
                                                    <Link key={topic.id} href={`/reviewer/questions?topic=${topic.id}`} passHref>
                                                        <Button variant="outline" className="w-full justify-between">
                                                            {topic.name}
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                               )}

                                {isAdmin && (
                                     <Link href={`/reviewer/review/${article.slug}/edit`} passHref>
                                        <Button variant="ghost" size="icon" aria-label="Edit article">
                                            <Edit className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={currentPage >= totalPages - 1}>
                                <ArrowRight className="h-5 w-5" />
                                 <span className="sr-only">Next Page</span>
                            </Button>
                        </div>
                         <div className="text-center text-xs text-muted-foreground mt-1">
                            Page {currentPage + 1} of {totalPages}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
