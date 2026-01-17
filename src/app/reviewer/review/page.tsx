
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Book, Video, Brain, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { ReviewArticle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const articleTypeIcons = {
  "Article": <Book className="h-4 w-4" />,
  "Video": <Video className="h-4 w-4" />,
  "Mixed": <Brain className="h-4 w-4" />,
};

const ReviewCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-7 w-3/4 mt-2" />
            <Skeleton className="h-4 w-full mt-1" />
            <Skeleton className="h-4 w-5/6" />
        </CardHeader>
        <CardContent className="flex-grow">
            <Skeleton className="h-5 w-1/2" />
        </CardContent>
        <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-28" />
        </CardFooter>
    </Card>
);

export default function ReviewPage() {
    const [category, setCategory] = useState<'all' | 'gened' | 'profed'>('all');
    const firestore = useFirestore();

    const articlesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseQuery = collection(firestore, 'reviewers');
        if (category === 'all') {
            return query(baseQuery, orderBy('title'));
        } else {
            return query(baseQuery, where('category', '==', category), orderBy('title'));
        }
    }, [firestore, category]);

    const { data: articles, isLoading } = useCollection<ReviewArticle>(articlesQuery);

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Select value={category} onValueChange={(value) => setCategory(value as any)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="gened">General Education</SelectItem>
                        <SelectItem value="profed">Professional Education</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && Array.from({ length: 3 }).map((_, i) => <ReviewCardSkeleton key={i} />)}
                
                {!isLoading && articles?.map(article => (
                    <Card key={article.slug} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="secondary" className="capitalize mb-2">
                                    {article.category === 'gened' ? 'Gen Ed' : 'Prof Ed'}
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
                            <CardTitle className="font-headline text-xl">{article.title}</CardTitle>
                            <CardDescription>{article.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="flex items-center text-sm text-muted-foreground gap-4">
                                <div className="flex items-center gap-1">
                                    {articleTypeIcons[article.type as keyof typeof articleTypeIcons]}
                                    <span>{article.type}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{article.readingTime} min read</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" size="icon">
                                <Bookmark className="h-5 w-5" />
                            </Button>
                            <Link href={`#`} passHref>
                                <Button>Start Review</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {!isLoading && articles?.length === 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">No review articles found for this category.</p>
                </div>
            )}
        </div>
    );
}
