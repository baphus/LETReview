"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <CardTitle className="font-headline text-3xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Last updated: January 19, 2026</p>
          
          <div>
            <h2 className="font-headline text-2xl mb-2">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to LETReview. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">2. Information We Collect</h2>
            <p className="text-muted-foreground">
              We may collect information about you in a variety of ways. The information we may collect on the Service includes:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground">
              <li>
                <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and profile picture, that you voluntarily give to us when you register with the Service.
              </li>
              <li>
                <strong>Usage Data:</strong> Information your browser sends whenever you visit our Service. This may include your computer's IP address, browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, and other statistics.
              </li>
             <li>
                <strong>Progress Data:</strong> We collect data related to your progress in the app, such as points, streaks, quiz scores, and completed challenges, to provide the gamified experience.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">3. Use of Your Information</h2>
            <p className="text-muted-foreground">
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground">
              <li>Create and manage your account.</li>
              <li>Personalize your experience on the app.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
              <li>Notify you about updates to the Service.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">4. Disclosure of Your Information</h2>
            <p className="text-muted-foreground">
              We do not share, sell, rent, or trade your information with any third parties for their promotional purposes.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">5. Security of Your Information</h2>
            <p className="text-muted-foreground">
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </div>

          <div>
            <h2 className="font-headline text-2xl mb-2">6. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions or comments about this Privacy Policy, please contact us.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
