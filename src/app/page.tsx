
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarDays, Clock, Award, ChevronRight, Star } from "lucide-react";
import Image from 'next/image';
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";

const features = [
  {
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    title: "Comprehensive Reviewer",
    description: "Tackle thousands of questions in both Study and Flashcard modes. Master General and Professional Education topics at your own pace.",
    link: "/review"
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-primary" />,
    title: "Daily Challenges",
    description: "Keep your skills sharp with daily questions and challenges. Earn points, build your streak, and climb the leaderboard.",
    link: "/daily"
  },
  {
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "Pomodoro Timer",
    description: "Boost your productivity with a built-in Pomodoro timer. Stay focused during study sessions and take effective breaks.",
    link: "/timer"
  },
  {
    icon: <Award className="w-8 h-8 text-primary" />,
    title: "Gamified Progress",
    description: "Stay motivated by earning points, unlocking cute pets, and customizing your app theme. Make studying fun!",
    link: "/home"
  }
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="w-full py-20 md:py-32 bg-primary/5 text-center">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter font-headline">
                  Ace the LET, One Question at a Time.
                </h1>
                <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
                  Your personalized and gamified review partner for the Licensure Examination for Teachers. Study smarter, not harder.
                </p>
                <Link href="/login" className="mx-auto">
                  <Button size="lg" className="mt-4">
                    Get Started for Free
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline">Everything You Need to Succeed</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                LETReview is packed with features designed to make your review sessions effective, engaging, and fun.
              </p>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-2">
              {features.map((feature) => (
                 <Card key={feature.title} className="p-6">
                    <CardHeader className="p-0">
                        <div className="flex items-center gap-4">
                            {feature.icon}
                            <CardTitle className="font-headline text-2xl">{feature.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* App Preview Section */}
        <section id="preview" className="w-full py-20 md:py-32 bg-primary/5">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline">See it in Action</h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                        Explore the clean and intuitive interface designed to keep you focused and motivated.
                    </p>
                </div>
                <div className="mx-auto max-w-5xl">
                    <Image
                        src="https://placehold.co/1200x800.png"
                        alt="LETReview App Screenshot"
                        width={1200}
                        height={800}
                        className="rounded-lg border shadow-2xl"
                        data-ai-hint="app screenshot"
                    />
                </div>
            </div>
        </section>

         {/* Testimonial Section */}
        <section id="testimonials" className="w-full py-20 md:py-32">
          <div className="container mx-auto grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Trusted by Future Educators
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                See what aspiring teachers are saying about their review journey with us.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <p className="text-muted-foreground">
                    "The daily challenges kept me consistent, and the Pomodoro timer was a game-changer for my focus. I passed on my first take!"
                  </p>
                  <p className="font-semibold mt-4">- Future LPT</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section id="cta" className="w-full py-20 md:py-32 bg-primary/5">
          <div className="container mx-auto text-center px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline mb-4">Ready to Start Your Journey?</h2>
            <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl mb-6">
              Sign up today and take the first step towards becoming a Licensed Professional Teacher.
            </p>
            <Link href="/login">
              <Button size="lg">
                Claim Your Reviewer Access
              </Button>
            </Link>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  )
}
