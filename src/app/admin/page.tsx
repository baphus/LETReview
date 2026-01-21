
'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import type { Reviewer, Subject, Topic, QuizQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string, type: 'reviewer' | 'question' } | null>(null);

  const { data: reviewers, isLoading: isLoadingReviewers } = useCollection<Reviewer>(useMemoFirebase(() => firestore ? query(collection(firestore, 'reviewers')) : null, [firestore]));
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? query(collection(firestore, 'topics')) : null, [firestore]));
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<QuizQuestion>(useMemoFirebase(() => firestore ? query(collection(firestore, 'questions')) : null, [firestore]));

  const handleDelete = async () => {
    if (!itemToDelete || !firestore) return;

    try {
      const docRef = doc(firestore, itemToDelete.type === 'reviewer' ? 'reviewers' : 'questions', itemToDelete.id);
      await deleteDoc(docRef);
      toast({
        title: `${itemToDelete.type === 'reviewer' ? 'Reviewer' : 'Question'} deleted`,
        description: `"${itemToDelete.name}" has been removed.`,
        className: 'bg-green-100 border-green-200'
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting item',
        description: error.message || 'There was a problem deleting the item.',
      });
    } finally {
      setItemToDelete(null);
    }
  };


  return (
    <div className="grid gap-4 md:gap-8">
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the {itemToDelete?.type} titled "{itemToDelete?.name}".
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Reviewers</CardTitle>
                    <CardDescription>Manage all review articles.</CardDescription>
                </div>
                <Link href="/reviewer/review/new">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Reviewer
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingReviewers ? (
                            <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
                        ) : (
                            reviewers?.map(reviewer => (
                                <TableRow key={reviewer.id}>
                                    <TableCell className="font-medium">{reviewer.title}</TableCell>
                                    <TableCell><Badge variant="secondary">{reviewer.category}</Badge></TableCell>
                                    <TableCell>{reviewer.difficulty}</TableCell>
                                    <TableCell><Badge>{reviewer.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/reviewer/review/${reviewer.slug}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setItemToDelete({ id: reviewer.id, name: reviewer.title, type: 'reviewer' })} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>Manage all questions in the question bank.</CardDescription>
                </div>
                 <Link href="/reviewer/questions/new">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Question
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingQuestions ? (
                            <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                        ) : (
                            questions?.slice(0, 10).map(q => (
                                <TableRow key={q.id}>
                                    <TableCell className="max-w-sm truncate font-medium">{q.question}</TableCell>
                                    <TableCell><Badge variant="secondary">{q.category}</Badge></TableCell>
                                    <TableCell>{q.difficulty}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/reviewer/questions/${q.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setItemToDelete({ id: q.id, name: q.question, type: 'question' })} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                 {questions && questions.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">Showing 10 of {questions.length} questions.</p>
                )}
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSubjects ? (
                                <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                            ) : (
                                subjects?.map(subject => (
                                    <TableRow key={subject.id}>
                                        <TableCell>{subject.name}</TableCell>
                                        <TableCell><Badge variant="secondary">{subject.categoryId}</Badge></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Topics</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Subject</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingTopics ? (
                                <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                            ) : (
                                topics?.slice(0,5).map(topic => (
                                    <TableRow key={topic.id}>
                                        <TableCell>{topic.name}</TableCell>
                                        <TableCell>{subjects?.find(s => s.id === topic.subjectId)?.name || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {topics && topics.length > 5 && (
                        <p className="text-sm text-muted-foreground mt-2">Showing 5 of {topics.length} topics.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
