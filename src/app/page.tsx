
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarDays, Clock, Award, ChevronRight, Star, Check } from "lucide-react";
import Image from 'next/image';
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";

const features = [
  {
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    title: "Custom Reviewer",
    description: "Build your own question bank for any subject, complete with images.",
    benefits: [
        "Create questions for any topic you need.",
        "Choose between study and flashcard modes.",
        "Add images to make questions more engaging."
    ],
    link: "/review",
    image: "/images/landing/feature-reviewer.png",
    image_hint: "studying app",
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-primary" />,
    title: "Daily Challenges",
    description: "Keep your skills sharp with daily questions and challenges.",
    benefits: [
        "Earn points for completing challenges.",
        "Build your study streak.",
        "Climb the leaderboard."
    ],
    link: "/daily",
    image: "/images/landing/feature-challenges.png",
    image_hint: "calendar daily challenges",
  },
  {
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "Pomodoro Timer",
    description: "Boost your productivity with a built-in Pomodoro timer.",
    benefits: [
        "Stay focused during study sessions.",
        "Take effective breaks.",
        "Earn bonus points with mini-quizzes."
    ],
    link: "/timer",
    image: "/images/landing/feature-timer.png",
    image_hint: "timer app",
  },
  {
    icon: <Award className="w-8 h-8 text-primary" />,
    title: "Gamified Progress",
    description: "Stay motivated by earning points and unlocking rewards.",
    benefits: [
        "Unlock cute pets as you build your streak.",
        "Customize your app theme.",
        "Make studying fun and engaging."
    ],
    link: "/home",
    image: "/images/landing/feature-progress.png",
    image_hint: "gamified progress pets",
  }
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="w-full py-20 md:py-32 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter font-headline">
                  Ace Any Exam, One Question at a Time.
                </h1>
                <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl">
                  Your personalized and gamified review partner. Create your own reviewer and study smarter, not harder.
                </p>
              </div>
              <div>
                <Link href="/login">
                  <Button size="lg">
                    Get Started for Free
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="w-full max-w-4xl mt-8">
                 <Image 
                    src="/images/landing/app-preview.png"
                    alt="App Preview"
                    width={1200}
                    height={800}
                    className="rounded-lg shadow-2xl w-full h-auto"
                    data-ai-hint="app screenshot"
                 />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-24 bg-card">
          <div className="container mx-auto px-4 md:px-6 space-y-20">
            {features.map((feature, index) => (
              <div key={feature.title} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className={`flex justify-center ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                    <Image 
                        src={feature.image}
                        alt={feature.title}
                        width={350}
                        height={500}
                        className="rounded-lg border-4 border-border/10 shadow-2xl"
                        data-ai-hint={feature.image_hint}
                    />
                </div>
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div>
                    <div className="inline-block rounded-lg bg-primary/20 text-primary px-3 py-1 text-sm mb-2">{feature.title}</div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline">
                        {feature.description}
                    </h2>
                  </div>
                  <ul className="space-y-4">
                    {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                           <Check className="h-6 w-6 text-primary mt-1" />
                           <span className="text-muted-foreground text-lg">{benefit}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
        
         {/* Testimonial Section */}
        <section id="testimonials" className="w-full py-20 md:py-32">
          <div className="container mx-auto grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Trusted by Students and Professionals
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                See what users are saying about their review journey with us.
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
              Sign up today and take the first step towards acing your exam.
            </p>
            <Link href="/login">
              <Button size="lg">
                Create Your Reviewer
              </Button>
            </Link>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  )
}
