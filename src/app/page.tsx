
"use client";

import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, CalendarDays, BarChart, Clock, Star } from "lucide-react";

// Feature Card Component
const FeatureCard = ({ icon, title, description, image, hint }: { icon: React.ElementType, title: string, description: string, image: string, hint: string }) => {
    const Icon = icon;
    return (
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
            <div className="relative h-48 w-full">
                <Image src={image} alt={title} layout="fill" objectFit="cover" className="bg-muted" data-ai-hint={hint} />
            </div>
            <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-bold font-headline">{title}</h3>
                </div>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

// Landing Page Component
export default function LandingPage() {
    const features = [
        {
            icon: BookOpen,
            title: "Custom Question Reviewer",
            description: "Tackle your own questions on any subject. Choose between Study Mode for mastery or Flashcard Mode for quick recall.",
            image: "/images/landing/feature-reviewer.png",
            hint: "studying flashcards"
        },
        {
            icon: Star,
            title: "Daily Challenges & Gamification",
            description: "Stay motivated with daily questions, earn points, build streaks, and unlock cute companion pets and custom themes.",
            image: "/images/landing/feature-challenges.png",
            hint: "mobile game rewards"
        },
        {
            icon: Clock,
            title: "Productivity-Boosting Pomodoro Timer",
            description: "Enhance your focus using the built-in Pomodoro timer. Complete mini-quizzes during sessions to earn bonus points.",
            image: "/images/landing/feature-timer.png",
            hint: "timer application"
        },
        {
            icon: BarChart,
            title: "Personalized Progress Tracking",
            description: "Monitor your performance with detailed stats, see a countdown to your exam, and customize your profile and pets.",
            image: "/images/landing/feature-progress.png",
            hint: "dashboard analytics"
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-xl font-bold font-headline">Qwiz</span>
                    </Link>
                    <Link href="/login">
                        <Button>Get Started</Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-20 text-center">
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline">
                            Your Personalized <span className="text-primary">Review Partner</span>
                        </h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                            Create your own personalized reviewer for any subject! Qwiz helps you study for any exam through a gamified and motivating approach.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Link href="/login">
                                <Button size="lg">
                                    Start Studying Now <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button size="lg" variant="outline">
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                        <div className="mt-16">
                            <Image
                                src="/images/landing/app-preview.png"
                                alt="Qwiz App Preview"
                                width={1000}
                                height={600}
                                className="rounded-lg border shadow-xl mx-auto"
                                data-ai-hint="app screenshot"
                            />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 bg-muted/40">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Features Designed for Success</h2>
                            <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
                                Everything you need to make studying effective and enjoyable.
                            </p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
                            {features.map((feature, index) => (
                                <FeatureCard key={index} {...feature} />
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-6 border-t">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Qwiz. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
