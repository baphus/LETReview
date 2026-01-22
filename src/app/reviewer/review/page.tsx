
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Book, Video, Brain, Bookmark, PlusCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Reviewer as ReviewArticle, Subject } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/auth/use-user';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const articleTypeIcons = {
  "article": <Book className="h-4 w-4" />,
  "video": <Video className="h-4 w-4" />,
  "mixed": <Brain className="h-4 w-4" />,
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
    const [categoryId, setCategoryId] = useState<'gened' | 'profed' | 'majorship'>('profed');
    const [subjectId, setSubjectId] = useState<'all' | string>('all');
    const firestore = useFirestore();
    const { user, isAdmin, firebaseUser } = useUser();
    const { toast } = useToast();

    const articlesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(
            collection(firestore, 'reviewers'),
            where('status', '==', 'published'),
            where('category', '==', categoryId)
        );

        if (subjectId !== 'all') {
            q = query(q, where('subjectId', '==', subjectId));
        }
        
        return q;
    }, [firestore, categoryId, subjectId]);
    
    const subjectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'subjects'), orderBy('orderIndex'));
    }, [firestore]);
    
    const bookmarksQuery = useMemoFirebase(() => {
        if (!firestore || !user || !firebaseUser || firebaseUser.isAnonymous) return null;
        return collection(firestore, `users/${user.uid}/reviewerBookmarks`);
    }, [firestore, user, firebaseUser]);

    const { data: articles, isLoading: isLoadingArticles } = useCollection<ReviewArticle>(articlesQuery);
    const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);
    const { data: bookmarks } = useCollection(bookmarksQuery);

    const bookmarkedIds = useMemo(() => {
        if (!bookmarks) return new Set();
        return new Set(bookmarks.map(b => b.id));
    }, [bookmarks]);

    const filteredSubjects = useMemo(() => {
        if (!subjects) return [];
        return subjects.filter(s => s.categoryId === categoryId);
    }, [subjects, categoryId]);

    const sortedArticles = useMemo(() => {
        if (!articles) return [];
        return [...articles].sort((a, b) => {
            const aIsBookmarked = bookmarkedIds.has(a.id);
            const bIsBookmarked = bookmarkedIds.has(b.id);
            
            if (aIsBookmarked && !bIsBookmarked) return -1;
            if (!aIsBookmarked && bIsBookmarked) return 1;
            
            return (a.orderIndex || 0) - (b.orderIndex || 0);
        });
    }, [articles, bookmarkedIds]);

    const handleToggleBookmark = async (e: React.MouseEvent, article: ReviewArticle) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || !firestore || !firebaseUser || firebaseUser.isAnonymous) {
            toast({ variant: 'destructive', title: 'Please log in to bookmark articles.'});
            return;
        }

        const bookmarkRef = doc(firestore, `users/${user.uid}/reviewerBookmarks`, article.id);
        const isBookmarked = bookmarkedIds.has(article.id);

        try {
             if (isBookmarked) {
                await deleteDoc(bookmarkRef);
                toast({ title: 'Bookmark removed' });
            } else {
                await setDoc(bookmarkRef, { createdAt: serverTimestamp() });
                toast({ title: 'Article bookmarked!'});
            }
        } catch(error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not update bookmark.'});
        }
    };


    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <Tabs value={categoryId} onValueChange={(value) => {
                    setCategoryId(value as 'gened' | 'profed' | 'majorship');
                    setSubjectId('all');
                }}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gened">General Ed</TabsTrigger>
                        <TabsTrigger value="profed">Professional Ed</TabsTrigger>
                        <TabsTrigger value="majorship">Majorship</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <Select value={subjectId} onValueChange={(value) => setSubjectId(value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder="Filter by subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {isLoadingSubjects ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                                filteredSubjects.map(subject => (
                                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                     <div className="flex-1 flex justify-end gap-2 w-full sm:w-auto">
                        <Link href="/flashcards" passHref>
                            <Button variant="outline">
                                <Zap className="mr-2 h-4 w-4" />
                                Flashcard Mode
                            </Button>
                        </Link>
                        {isAdmin && (
                            <Link href="/reviewer/review/new" passHref>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Article
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingArticles && Array.from({ length: 3 }).map((_, i) => <ReviewCardSkeleton key={i} />)}
                
                {!isLoadingArticles && sortedArticles.map(article => {
                    const isBookmarked = bookmarkedIds.has(article.id);
                    return (
                        <Card key={article.slug} className="flex flex-col hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="capitalize mb-2" style={{ backgroundColor: subjects?.find(s => s.id === article.subjectId)?.color || '#6c757d', color: 'white' }}>
                                        {subjects?.find(s => s.id === article.subjectId)?.name || article.subjectId}
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
                                <CardDescription>{article.excerpt}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex items-center text-sm text-muted-foreground gap-4">
                                    <div className="flex items-center gap-1">
                                        {articleTypeIcons[article.reviewerType as keyof typeof articleTypeIcons]}
                                        <span className="capitalize">{article.reviewerType}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{article.estimatedTime} min read</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between mt-auto">
                                <Button variant="ghost" size="icon" onClick={(e) => handleToggleBookmark(e, article)}>
                                    <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current text-primary")} />
                                </Button>
                                <Link href={`/reviewer/review/${article.slug}`} passHref>
                                    <Button>Start Review</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {!isLoadingArticles && sortedArticles.length === 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">No review articles found for this category.</p>
                </div>
            )}
             <div className="text-center py-10 mt-8 border-t">
                <p className="text-muted-foreground">More reviewers coming soon.</p>
            </div>
        </div>
    );
}
