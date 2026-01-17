
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Book, Video, Brain, Bookmark } from 'lucide-react';
import { reviewArticles } from '@/lib/review-articles';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const articleTypeIcons = {
  "Article": <Book className="h-4 w-4" />,
  "Video": <Video className="h-4 w-4" />,
  "Mixed": <Brain className="h-4 w-4" />,
};

export default function ReviewPage() {
    const [category, setCategory] = useState<'all' | 'gened' | 'profed'>('all');

    const filteredArticles = reviewArticles.filter(article => 
        category === 'all' || article.category === category
    );

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
                {filteredArticles.map(article => (
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
                                    {articleTypeIcons[article.type]}
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
        </div>
    );
}
