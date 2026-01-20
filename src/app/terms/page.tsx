import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-2xl py-12">
        <Link href="/" className="mb-8 inline-block">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Button>
        </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>Last updated: January 19, 2026</p>
          <p>
            Please read these terms and conditions carefully before using Our
            Service.
          </p>

          <h2>Acknowledgment</h2>
          <p>
            These are the Terms and Conditions governing the use of this
            Service and the agreement that operates between You and the
            Company. These Terms and Conditions set out the rights and
            obligations of all users regarding the use of the Service.
          </p>
          <p>
            Your access to and use of the Service is conditioned on Your
            acceptance of and compliance with these Terms and Conditions. These
            Terms and Conditions apply to all visitors, users and others who
            access or use the Service.
          </p>
          <p>
            By accessing or using the Service You agree to be bound by these
            Terms and Conditions. If You disagree with any part of these Terms
            and Conditions then You may not access the Service.
          </p>

          <h2>User Accounts</h2>
          <p>
            When You create an account with Us, You must provide Us information
            that is accurate, complete, and current at all times. Failure to
            do so constitutes a breach of the Terms, which may result in
            immediate termination of Your account on Our Service.
          </p>

          <h2>Termination</h2>
          <p>
            We may terminate or suspend Your Account immediately, without prior
            notice or liability, for any reason whatsoever, including without
            limitation if You breach these Terms and Conditions.
          </p>

          <h2>Changes to These Terms and Conditions</h2>
          <p>
            We reserve the right, at Our sole discretion, to modify or replace
            these Terms at any time.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, You can
            contact us.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
