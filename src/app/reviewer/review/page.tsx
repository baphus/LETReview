
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Bookmark, PlusCircle, Zap, Search, LayoutGrid, List, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Reviewer, Subject } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const ReviewerGridCard = ({ article, subject, isBookmarked, onBookmarkToggle }: { article: Reviewer, subject?: Subject, isBookmarked: boolean, onBookmarkToggle: (e: React.MouseEvent) => void }) => {
    const hasTopics = article.topicIds && article.topicIds.length > 0;
    return (
        <Card className="flex flex-col hover:border-primary/50 transition-colors h-full">
             <CardHeader>
                <div className="flex justify-between items-start">
                    {subject && <Badge variant="secondary" className="capitalize mb-2" style={{ backgroundColor: subject.color || '#6c757d', color: 'white' }}>{subject.name}</Badge>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 shrink-0" onClick={onBookmarkToggle}>
                        <Bookmark className={cn("h-5 w-5 text-muted-foreground", isBookmarked && "fill-current text-primary")} />
                    </Button>
                </div>
                <CardTitle className="font-headline text-xl">{article.title}</CardTitle>
                <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-muted-foreground gap-4">
                    <Badge
                        variant="outline"
                        className={cn(
                            "capitalize",
                            article.difficulty === 'easy' && 'border-green-300 text-green-800',
                            article.difficulty === 'medium' && 'border-yellow-300 text-yellow-800',
                            article.difficulty === 'hard' && 'border-red-300 text-red-800'
                        )}
                    >
                        {article.difficulty}
                    </Badge>
                     <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{article.estimatedTime} min</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex items-center gap-2 mt-auto">
                <Link href={`/reviewer/review/${article.slug}`} passHref className="flex-1">
                    <Button className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" /> Study
                    </Button>
                </Link>
                <Link href={`/reviewer/flashcards?topicId=${article.topicIds[0]}`} passHref>
                    <Button variant="outline" size="icon" disabled={!hasTopics} title="Flashcards">
                       <Zap className="h-4 w-4" />
                    </Button>
                </Link>
                <Link href={`/reviewer/questions?topic=${article.topicIds[0]}`} passHref>
                    <Button variant="outline" size="icon" disabled={!hasTopics} title="Start Quiz">
                       <Brain className="h-4 w-4" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
};

const ReviewerListCard = ({ article, subject, isBookmarked, onBookmarkToggle }: { article: Reviewer, subject?: Subject, isBookmarked: boolean, onBookmarkToggle: (e: React.MouseEvent) => void }) => {
    const hasTopics = article.topicIds && article.topicIds.length > 0;
    return (
        <Card className="hover:border-primary/50 transition-colors w-full">
            <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-2">
                        {subject && <Badge variant="secondary" className="capitalize" style={{ backgroundColor: subject.color || '#6c757d', color: 'white' }}>{subject.name}</Badge>}
                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                            <Badge
                                variant="outline"
                                className={cn(
                                    "capitalize",
                                    article.difficulty === 'easy' && 'border-green-300 text-green-800',
                                    article.difficulty === 'medium' && 'border-yellow-300 text-yellow-800',
                                    article.difficulty === 'hard' && 'border-red-300 text-red-800'
                                )}
                            >
                                {article.difficulty}
                            </Badge>
                             <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{article.estimatedTime} min</span>
                            </div>
                        </div>
                    </div>
                    <CardTitle className="font-headline text-xl mb-2">{article.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{article.excerpt}</CardDescription>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-auto" />
                <div className="p-6 pt-0 sm:pt-6 sm:pl-0 flex items-center justify-end sm:justify-center">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onBookmarkToggle} title="Bookmark">
                            <Bookmark className={cn("h-5 w-5 text-muted-foreground", isBookmarked && "fill-current text-primary")} />
                        </Button>
                        <Link href={`/reviewer/questions?topic=${article.topicIds[0]}`} passHref>
                            <Button variant="outline" size="icon" disabled={!hasTopics} title="Start Quiz">
                               <Brain className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href={`/reviewer/flashcards?topicId=${article.topicIds[0]}`} passHref>
                            <Button variant="outline" size="icon" disabled={!hasTopics} title="Flashcards">
                               <Zap className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href={`/reviewer/review/${article.slug}`} passHref>
                            <Button><BookOpen className="mr-2 h-4 w-4" /> Study</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const ReviewerSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
    if (viewMode === 'list') {
        return (
            <Card className="w-full">
                <div className="flex flex-col sm:flex-row p-6 gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
            </Card>
        )
    }
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mt-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </CardHeader>
            <CardContent className="flex-grow">
                <Skeleton className="h-5 w-1/2" />
            </CardContent>
            <CardFooter className="flex items-center gap-2 mt-auto">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
            </CardFooter>
        </Card>
    );
}

export default function ReviewPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryId, setCategoryId] = useState<'all' | 'gened' | 'profed' | 'majorship'>('all');
    const [subjectId, setSubjectId] = useState<'all' | string>('all');
    const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const firestore = useFirestore();
    const { user, isAdmin, firebaseUser } = useUser();
    const { toast } = useToast();

    const allArticlesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'reviewers'),
            where('status', '==', 'published'),
        );
    }, [firestore]);

    const subjectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'subjects'), orderBy('orderIndex'));
    }, [firestore]);
    
    const bookmarksQuery = useMemoFirebase(() => {
        if (!firestore || !user || !firebaseUser || firebaseUser.isAnonymous) return null;
        return collection(firestore, `users/${user.uid}/reviewerBookmarks`);
    }, [firestore, user, firebaseUser]);

    const { data: allArticles, isLoading: isLoadingArticles } = useCollection<Reviewer>(allArticlesQuery);
    const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);
    const { data: bookmarks } = useCollection(bookmarksQuery);

    const bookmarkedIds = useMemo(() => {
        if (!bookmarks) return new Set();
        return new Set(bookmarks.map(b => b.id));
    }, [bookmarks]);

    const filteredSubjects = useMemo(() => {
        if (!subjects) return [];
        if (categoryId === 'all') return subjects;
        return subjects.filter(s => s.categoryId === categoryId);
    }, [subjects, categoryId]);

    const displayedArticles = useMemo(() => {
        if (!allArticles) return [];
        
        let filtered = allArticles;

        if (showOnlyBookmarked) {
            filtered = filtered.filter(article => bookmarkedIds.has(article.id));
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(article => 
                article.title.toLowerCase().includes(lowercasedTerm) || 
                article.excerpt.toLowerCase().includes(lowercasedTerm)
            );
        }

        if (categoryId !== 'all') {
            filtered = filtered.filter(article => article.category === categoryId);
        }

        if (subjectId !== 'all') {
            filtered = filtered.filter(article => article.subjectId === subjectId);
        }
        
        return filtered.sort((a, b) => {
            const aIsBookmarked = bookmarkedIds.has(a.id);
            const bIsBookmarked = bookmarkedIds.has(b.id);
            if (aIsBookmarked && !bIsBookmarked) return -1;
            if (!aIsBookmarked && bIsBookmarked) return 1;
            return (a.orderIndex || 0) - (b.orderIndex || 0);
        });
    }, [allArticles, searchTerm, categoryId, subjectId, showOnlyBookmarked, bookmarkedIds]);

    const handleToggleBookmark = async (e: React.MouseEvent, article: Reviewer) => {
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
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search articles by title or keyword..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select value={categoryId} onValueChange={(value) => { setCategoryId(value as any); setSubjectId('all'); }}>
                        <SelectTrigger><SelectValue placeholder="All Categories"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="gened">General Education</SelectItem>
                            <SelectItem value="profed">Professional Education</SelectItem>
                            <SelectItem value="majorship">Majorship</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={subjectId} onValueChange={(value) => setSubjectId(value)}>
                        <SelectTrigger><SelectValue placeholder="All Subjects"/></SelectTrigger>
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
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Switch id="bookmarked-filter" checked={showOnlyBookmarked} onCheckedChange={setShowOnlyBookmarked} />
                        <Label htmlFor="bookmarked-filter">Show bookmarked only</Label>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border p-1">
                            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                             <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
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
            
            <div className={cn(
                "gap-6",
                viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
            )}>
                {isLoadingArticles && Array.from({ length: 6 }).map((_, i) => <ReviewerSkeleton key={i} viewMode={viewMode} />)}
                
                {!isLoadingArticles && displayedArticles.map(article => (
                    viewMode === 'grid' 
                        ? <ReviewerGridCard 
                            key={article.slug} 
                            article={article} 
                            subject={subjects?.find(s => s.id === article.subjectId)}
                            isBookmarked={bookmarkedIds.has(article.id)}
                            onBookmarkToggle={(e) => handleToggleBookmark(e, article)}
                          />
                        : <ReviewerListCard 
                            key={article.slug} 
                            article={article} 
                            subject={subjects?.find(s => s.id === article.subjectId)}
                            isBookmarked={bookmarkedIds.has(article.id)}
                            onBookmarkToggle={(e) => handleToggleBookmark(e, article)}
                          />
                ))}
            </div>

            {!isLoadingArticles && displayedArticles.length === 0 && (
                <div className="col-span-full text-center py-16">
                    <p className="text-muted-foreground">No review articles found for this filter.</p>
                </div>
            )}
             <div className="text-center py-10 mt-8 border-t">
                <p className="text-muted-foreground">More reviewers coming soon.</p>
            </div>
        </div>
    );
}
