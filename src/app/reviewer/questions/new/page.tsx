
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewQuestionPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">New Question Form</CardTitle>
                <CardDescription>
                    This feature is coming soon! The UI and logic to add new questions to the database will be implemented here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Link href="/reviewer/questions" passHref>
                    <Button>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Questions
                    </Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  );
}
