
'use client';

import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Reviewer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Tag, Brain, Book, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { AddQuestionDialog } from '@/components/AddQuestionDialog';

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
    const { isAdmin } = useUser();

    const articleQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'reviewers'), where('slug', '==', slug));
    }, [firestore, slug]);

    const { data: articles, isLoading } = useCollection<Reviewer>(articleQuery);
    const article = articles?.[0];

    if (isLoading) {
        return <ArticleSkeleton />;
    }

    if (!article) {
        return <div className="text-center">Article not found.</div>;
    }

    return (
        <article className="prose prose-quoteless prose-neutral dark:prose-invert max-w-none">
            <header className="mb-8">
                 <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                    <Badge variant="secondary" className="capitalize" style={{ backgroundColor: '#3F51B5', color: 'white' }}>
                        {article.subjectId.replace(/-/g, ' ')}
                    </Badge>
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
            
            <div className="markdown-content">
                 <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({node, ...props}) => <h2 className="text-3xl font-bold font-headline mt-12 mb-4 border-b pb-2" {...props} />,
                        h2: ({node, ...props}) => <h3 className="text-2xl font-bold font-headline mt-10 mb-4" {...props} />,
                        h3: ({node, ...props}) => <h4 className="text-xl font-bold font-headline mt-8 mb-4" {...props} />,
                        p: ({node, ...props}) => <p className="text-base leading-relaxed mb-4" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-6" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-8" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse" {...props} /></div>,
                        thead: ({node, ...props}) => <thead className="bg-muted/50" {...props} />,
                        th: ({node, ...props}) => <th className="p-2 border" {...props} />,
                        td: ({node, ...props}) => <td className="p-2 border" {...props} />,
                    }}
                 >
                    {article.content}
                </ReactMarkdown>
            </div>

            <footer className="mt-12 border-t pt-8">
                <h3 className="text-xl font-bold font-headline mb-4">What's Next?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-primary/5">
                        <CardHeader>
                            <CardTitle>Practice Questions</CardTitle>
                            <CardDescription>Test your understanding of this topic.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Link href={`/reviewer/questions?topic=${article.topicIds[0]}`} passHref>
                                <Button>Related Questions</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Mark as Complete</CardTitle>
                            <CardDescription>Keep track of your progress and move on.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                           <div className="w-full flex gap-2">
                                <Button variant="secondary" className="flex-1">Mark as Completed</Button>
                                {isAdmin && article && <AddQuestionDialog article={article} />}
                           </div>
                        </CardFooter>
                    </Card>
                </div>
            </footer>
        </article>
    );
}
