"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarDays, Clock, Award, ChevronRight, Star, Check } from "lucide-react";
import Image from 'next/image';
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { useUser } from "@/firebase/auth/use-user";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    title: "Reviewer & Practice Quiz",
    description: "Master concepts with in-depth articles and test your knowledge with thousands of practice questions.",
    benefits: [
        "Study detailed articles on GENED & PROFED.",
        "Take practice quizzes by topic or category.",
        "Track your quiz performance over time."
    ],
    link: "/reviewer/review",
    image: "/images/landing/feature-reviewer.png",
    image_hint: "studying app",
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-primary" />,
    title: "Daily Challenges & Streaks",
    description: "Stay consistent and motivated with daily questions and challenges to build your study habit.",
    benefits: [
        "Answer the Question of the Day for bonus points.",
        "Complete challenges to build and maintain your streak.",
        "Visualize your progress with the activity calendar."
    ],
    link: "/daily",
    image: "/images/landing/feature-challenges.png",
    image_hint: "calendar daily challenges",
  },
  {
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "Productivity Timer",
    description: "Enhance your focus and manage your study time effectively with the built-in Pomodoro timer.",
    benefits: [
        "Manage work and break periods using the Pomodoro technique.",
        "Earn extra points by answering quick questions during focus sessions.",
        "Build your quiz streak to unlock special rewards."
    ],
    link: "/timer",
    image: "/images/landing/feature-timer.png",
    image_hint: "timer app",
  },
  {
    icon: <Award className="w-8 h-8 text-primary" />,
    title: "Gamified Dashboard",
    description: "Track your progress, unlock cute pets, and customize your app to make studying more fun.",
    benefits: [
        "Keep your core stats (streak, points) always in view.",
        "Unlock companion pets by maintaining streaks and completing achievements.",
        "Personalize your experience with custom themes."
    ],
    link: "/home",
    image: "/images/landing/feature-progress.png",
    image_hint: "gamified progress pets",
  }
];


export default function LandingPage() {
  const { user, firebaseUser, linkGoogleAccount } = useUser();
  const router = useRouter();
  const isAnonymous = firebaseUser?.isAnonymous;

  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const testimonialRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const [animatedElements, setAnimatedElements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const elementsToObserve = [
      ...featureRefs.current,
      testimonialRef.current,
      ctaRef.current,
    ].filter(Boolean) as Element[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-animation-id');
            if (id) {
              setAnimatedElements((prev) => new Set(prev).add(id));
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    elementsToObserve.forEach((el) => observer.observe(el));

    return () => {
      elementsToObserve.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="w-full pt-20 md:pt-32 pb-28 md:pb-40 bg-primary/5 relative">
           <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 104 73' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M57.1576 7.44863C53.831 5.16772 51.182 3.5966 47.193 3.21034C43.8401 2.88567 40.4399 2.98776 37.104 3.43439C27.4742 4.72371 18.5278 10.1981 11.7423 16.9887C4.51029 24.226 -0.0601712 34.0308 0.892389 44.4084C2.03799 56.8891 11.2616 65.8317 22.6653 69.7276C37.5325 74.8068 55.3079 71.9896 69.5261 65.9911C82.4612 60.534 98.1688 50.2841 102.471 35.9373C106.219 23.4392 95.872 11.7376 85.8562 5.97051C77.5557 1.19116 67.8156 -0.854239 58.4918 2.0932C51.6146 4.26724 44.7193 7.80313 39.1564 12.4182C32.891 17.616 28.6773 24.2755 24.1785 30.9319' stroke='%239C92AC' stroke-opacity='0.05' stroke-width='1.2' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: '30px',
            }}
          />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter font-headline animate-fade-in-up">
                  Ace the LET, One Question at a Time.
                </h1>
                <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl animate-fade-in-up animation-delay-200">
                  Your personalized and gamified review partner for the Licensure Examination for Teachers. Study smarter, not harder.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
                 <Button size="lg" onClick={() => user && !isAnonymous ? router.push('/home') : linkGoogleAccount()}>
                    {user && !isAnonymous ? "Go to Dashboard" : "Get Started for Free"}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                  {(!user || isAnonymous) && (
                    <Button size="lg" variant="outline" onClick={() => router.push('/home')}>
                        Try as a Guest
                    </Button>
                  )}
              </div>
              <div className="w-full max-w-4xl mt-8 animate-fade-in-up animation-delay-600">
                 <Image 
                    src="/images/landing/app-preview.png"
                    alt="App Preview"
                    width={1200}
                    height={800}
                    className="rounded-lg shadow-2xl w-full h-auto"
                    data-ai-hint="app screenshot"
                    priority
                 />
              </div>
            </div>
          </div>
           <div className="absolute bottom-0 left-0 right-0 overflow-hidden z-0" style={{lineHeight: 0}}>
              <svg
                  className="relative block"
                  data-name="Layer 1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  style={{height: '55px', width: '100%'}}
              >
                  <path
                      d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                      className="fill-slate-900"
                  ></path>
              </svg>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-24 bg-slate-900">
          <div className="container mx-auto px-4 md:px-6 space-y-20">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
              >
                <div 
                  ref={(el) => (featureRefs.current[index] = el)}
                  data-animation-id={`feature-image-${index}`}
                  className={`flex justify-center ${index % 2 === 1 ? 'md:order-2' : ''} ${animatedElements.has(`feature-image-${index}`) ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                    <Image 
                        src={feature.image}
                        alt={feature.title}
                        width={350}
                        height={500}
                        className="rounded-lg border-4 border-white/10 shadow-2xl"
                        data-ai-hint={feature.image_hint}
                        priority
                    />
                </div>
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div>
                    <div className="inline-block rounded-lg bg-primary/20 text-primary px-3 py-1 text-sm mb-2">{feature.title}</div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline text-white">
                        {feature.description}
                    </h2>
                  </div>
                  <ul className="space-y-4">
                    {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                           <Check className="h-6 w-6 text-primary mt-1" />
                           <span className="text-slate-400 text-lg">{benefit}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
        
         {/* Testimonial Section */}
        <section id="testimonials" className="w-full py-20 md:py-32 relative">
          <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{lineHeight: 0, transform: 'rotate(180deg)'}}>
              <svg
                  className="relative block"
                  data-name="Layer 1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  style={{height: '55px', width: '100%'}}
              >
                  <path
                      d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                      className="fill-slate-900"
                  ></path>
              </svg>
          </div>
          <div
            ref={testimonialRef}
            data-animation-id="testimonial"
            className={`container mx-auto grid items-center justify-center gap-4 px-4 text-center md:px-6 ${animatedElements.has('testimonial') ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
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
                  <div className="flex items-center justify-center mb-2">
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
          <div
            ref={ctaRef}
            data-animation-id="cta"
            className={`container mx-auto text-center px-4 md:px-6 ${animatedElements.has('cta') ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter font-headline mb-4">Ready to Start Your Journey?</h2>
              <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl mb-6">
                Sign up today and take the first step towards becoming a Licensed Professional Teacher.
              </p>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => user && !isAnonymous ? router.push('/home') : linkGoogleAccount()}>
                    {user && !isAnonymous ? "Go to Dashboard" : "Sign Up to Save Progress"}
                </Button>
                {(!user || isAnonymous) && (
                    <Button size="lg" variant="outline" onClick={() => router.push('/home')}>
                        Try as a Guest
                    </Button>
                )}
            </div>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  )
}
