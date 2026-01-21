
'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Reviewer, Subject, Topic, QuizQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const firestore = useFirestore();

  const { data: reviewers, isLoading: isLoadingReviewers } = useCollection<Reviewer>(useMemoFirebase(() => firestore ? query(collection(firestore, 'reviewers')) : null, [firestore]));
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects')) : null, [firestore]));
  const { data: topics, isLoading: isLoadingTopics } = useCollection<Topic>(useMemoFirebase(() => firestore ? query(collection(firestore, 'topics')) : null, [firestore]));
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<QuizQuestion>(useMemoFirebase(() => firestore ? query(collection(firestore, 'questions')) : null, [firestore]));

  return (
    <div className="grid gap-4 md:gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Reviewers</CardTitle>
                <CardDescription>Manage all review articles.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingReviewers ? (
                            <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                        ) : (
                            reviewers?.map(reviewer => (
                                <TableRow key={reviewer.id}>
                                    <TableCell>{reviewer.title}</TableCell>
                                    <TableCell><Badge variant="secondary">{reviewer.category}</Badge></TableCell>
                                    <TableCell>{reviewer.difficulty}</TableCell>
                                    <TableCell><Badge>{reviewer.status}</Badge></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Manage all questions in the question bank.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingQuestions ? (
                            <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
                        ) : (
                            questions?.slice(0, 5).map(q => (
                                <TableRow key={q.id}>
                                    <TableCell className="max-w-sm truncate">{q.question}</TableCell>
                                    <TableCell><Badge variant="secondary">{q.category}</Badge></TableCell>
                                    <TableCell>{q.difficulty}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                 {questions && questions.length > 5 && (
                    <p className="text-sm text-muted-foreground mt-2">Showing 5 of {questions.length} questions.</p>
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
