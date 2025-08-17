
"use client";

import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookCopy, Star, Clock, Palette } from "lucide-react";

// Feature Snippet Component (for under the hero title)
const FeatureSnippet = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
                <h3 className="font-semibold text-card-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

// Main Feature Card Component
const FeatureCard = ({ title, description, image, hint, reverse = false }: { title: string, description: string, image: string, hint: string, reverse?: boolean }) => {
    return (
        <div className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
            <div className="lg:w-1/2">
                <h3 className="text-2xl md:text-3xl font-bold font-headline mb-4">{title}</h3>
                <p className="text-muted-foreground md:text-lg">{description}</p>
            </div>
            <div className="lg:w-1/2 w-full">
                <div className="aspect-[4/3] relative rounded-xl bg-muted border shadow-lg hover:shadow-2xl transition-shadow duration-300">
                    <Image src={image} alt={title} layout="fill" objectFit="cover" className="rounded-xl" data-ai-hint={hint} />
                </div>
            </div>
        </div>
    );
};


export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold font-headline">Qwiz</span>
                    </Link>
                    <Link href="/login">
                        <Button>Get Started</Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="text-center max-w-3xl mx-auto">
                            <span className="inline-block px-3 py-1 text-sm font-semibold text-primary bg-primary/10 rounded-full mb-4">
                                For Students & Learners
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight">
                                Ace Your Biggest Exams
                            </h1>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                                Qwiz is your all-in-one study partner, designed to make learning more efficient, engaging, and personalized.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12 text-left">
                            <FeatureSnippet
                                icon={BookCopy}
                                title="Custom Question Banks"
                                description="Create tailored decks for any subject to focus your study sessions."
                            />
                            <FeatureSnippet
                                icon={Star}
                                title="Gamified Learning"
                                description="Stay motivated with daily challenges, points, and streaks."
                            />
                            <FeatureSnippet
                                icon={Clock}
                                title="Focus Tools"
                                description="Use the Pomodoro timer to manage study intervals and maximize productivity."
                            />
                        </div>

                        <div className="mt-16">
                            <div className="relative aspect-video max-w-5xl mx-auto">
                                <Image
                                    src="/images/landing/app-preview.png"
                                    alt="Qwiz App Preview"
                                    width={1200}
                                    height={750}
                                    className="rounded-xl border shadow-2xl mx-auto"
                                    data-ai-hint="app dashboard"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-16 md:py-24 bg-muted/40">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="text-center mb-12 md:mb-16">
                            <span className="inline-block px-3 py-1 text-sm font-semibold text-primary bg-primary/10 rounded-full mb-4">
                                Features
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Your All-in-One Study Hub</h2>
                            <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
                                Forget juggling apps. Get everything you need to succeed in one place.
                            </p>
                        </div>
                        <div className="space-y-16 md:space-y-24">
                            <FeatureCard
                                title="Build & Manage Your Knowledge"
                                description="Create unlimited question banks for different subjects. Add questions with images, detailed explanations, and difficulty levels. The flexible reviewer lets you switch between study and flashcard modes."
                                image="/images/landing/feature-reviewer.png"
                                hint="question list management"
                            />
                            <FeatureCard
                                title="Stay Consistent with Daily Challenges"
                                description="Turn studying into a rewarding habit. Complete daily challenges to earn points, build up your study streak, and secure your progress. See how many days in a row you can keep it up!"
                                image="/images/landing/feature-challenges.png"
                                hint="gamified mobile challenges"
                                reverse={true}
                            />
                             <FeatureCard
                                title="Boost Focus with the Pomodoro Timer"
                                description="Master your study schedule with a built-in Pomodoro timer. Work in focused sprints and take scheduled breaks. Answer mini-quiz questions during sessions to earn bonus points and supercharge your learning."
                                image="/images/landing/feature-timer.png"
                                hint="productivity timer app"
                            />
                            <FeatureCard
                                title="Personalize Your Study Space"
                                description="Make Qwiz your own. Use points to unlock new color themes and collect adorable companion pets. Give your pets nicknames and watch your collection grow as you hit your study milestones."
                                image="/images/landing/feature-progress.png"
                                hint="customizable user profile"
                                reverse={true}
                            />
                        </div>
                    </div>
                </section>

                 {/* CTA Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">
                            Ready to Start Learning Smarter?
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
                            Join Qwiz today and take the first step towards acing your exams.
                        </p>
                        <div className="mt-8">
                            <Link href="/login">
                                <Button size="lg">
                                    Get Started for Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="py-6 border-t bg-muted/40">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Qwiz. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
