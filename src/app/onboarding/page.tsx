
"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createNewBank, saveUserProfile } from "@/lib/data";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from "lucide-react";
import { DatePicker } from "@/components/ui/datepicker";
import { format } from "date-fns";

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

interface TempUserInfo {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [tempUser, setTempUser] = useState<TempUserInfo | null>(null);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [bankName, setBankName] = useState('');
    const [examDate, setExamDate] = useState<Date | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const userInfoString = localStorage.getItem('tempNewUserInfo');
        if (userInfoString) {
            const userInfo: TempUserInfo = JSON.parse(userInfoString);
            setTempUser(userInfo);
            setName(userInfo.displayName || userInfo.email?.split('@')[0] || 'New User');
            setAvatarUrl(`https://placehold.co/100x100.png?text=${(userInfo.displayName || 'U').charAt(0)}`);
            setBankName("My First Reviewer");
        } else {
            // If no temp info, maybe they refreshed, send back to login
            router.replace('/login');
        }
    }, [router]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({
                    variant: "destructive",
                    title: "Image too large",
                    description: "Please select an image smaller than 2MB.",
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setAvatarUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOnboardingComplete = () => {
        if (!tempUser || !name.trim() || !bankName.trim()) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill out your name and a name for your first question bank." });
            return;
        }

        const newBank = createNewBank(bankName);
        if (examDate) {
            newBank.examDate = examDate.toISOString();
        }

        const userProfile: UserProfile = {
            uid: tempUser.uid,
            name: name.trim(),
            avatarUrl,
            themeMode: 'light',
            activeBankId: newBank.id,
            banks: [newBank],
            lastLogin: getTodayKey(),
        };

        saveUserProfile(userProfile);
        localStorage.setItem('currentUser', tempUser.uid);
        localStorage.removeItem('tempNewUserInfo');
        
        router.refresh();
        router.push('/home');

        toast({
            title: "Welcome to Qwiz!",
            description: "Your profile has been created successfully.",
            className: "bg-primary border-primary text-primary-foreground",
        });
    };

    if (!tempUser) {
        return null; // Or a loading spinner
    }

    return (
        <div className="container mx-auto p-4 max-w-md flex items-center justify-center min-h-screen">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-center">Welcome to Qwiz!</CardTitle>
                    <CardDescription className="text-center">Let's set up your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-24 w-24 border-4 border-primary">
                                <AvatarImage src={avatarUrl} alt={name} data-ai-hint="profile picture" />
                                <AvatarFallback>
                                    <User className="h-12 w-12" />
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                size="icon"
                                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                                onClick={handleAvatarClick}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bankName">Name Your First Question Bank</Label>
                        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Civil Service Exam" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="examDate">Exam Date (Optional)</Label>
                        <DatePicker date={examDate} setDate={setExamDate} />
                         <p className="text-xs text-muted-foreground">You can add this later in your profile settings.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleOnboardingComplete}>
                        Let's Go!
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

    