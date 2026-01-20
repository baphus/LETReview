"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl py-12">
      <div className="mb-8">
        <Link href="/" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Last updated: January 19, 2026</p>

          <div>
            <h2 className="font-headline text-2xl mb-2">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By using our application, LETReview ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">2. Use of the Service</h2>
            <p className="text-muted-foreground">
              You agree to use the Service only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the Service. Prohibited behavior includes harassing or causing distress or inconvenience to any other user, transmitting obscene or offensive content, or disrupting the normal flow of dialogue within the Service.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">3. User Accounts</h2>
            <p className="text-muted-foreground">
              To use certain features of the Service, you must register for an account. You must provide accurate and complete information and keep your account information updated. You are responsible for the security of your account and for all activities that occur under your account.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">4. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service and its original content, features, and functionality are and will remain the exclusive property of LETReview and its licensors.
            </p>
          </div>
          
          <div>
            <h2 className="font-headline text-2xl mb-2">5. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not to a breach of the Terms.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall LETReview, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </div>
          
          <div>
            <h2 className="font-headline text-2xl mb-2">7. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">8. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
