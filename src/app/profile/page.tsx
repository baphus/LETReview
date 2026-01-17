
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, LogOut, Camera, Palette, Gem, Trophy, Clock, Award, Check, Edit, UserPlus, AlertTriangle, Database, PlusCircle } from "lucide-react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { achievementPets, rarePets } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/firebase/auth/use-user";
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, writeBatch, collection, addDoc, query, orderBy, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import reviewersSeed from '../../../docs/reviewers-seed.json';
import subjectsSeed from '../../../docs/subjects-seed.json';
import topicsSeed from '../../../docs/topics-seed.json';
import questionsSeed from '../../../docs/questions-seed.json';
import type { QuizQuestion, Subject } from '@/lib/types';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const themes = [
    { name: 'Default', value: 'default', cost: 0, colors: { primary: 'hsl(231 48% 48%)', accent: 'hsl(110 32% 48%)' } },
    { name: 'Mint', value: 'mint', cost: 100, colors: { primary: 'hsl(160, 50%, 45%)', accent: 'hsl(200, 60%, 50%)' } },
    { name: 'Sunset', value: 'sunset', cost: 100, colors: { primary: 'hsl(25, 80%, 55%)', accent: 'hsl(350, 70%, 60%)' } },
    { name: 'Rose', value: 'rose', cost: 100, colors: { primary: 'hsl(340, 70%, 55%)', accent: 'hsl(280, 50%, 60%)' } },
];

const allAchievements = [
  {
    name: "Pomodoro Novice",
    description: "Complete 10 Pomodoro sessions.",
    petReward: "Owlbert",
    icon: Clock,
    target: 10,
    getValue: (user: any) => user.completedSessions || 0,
  },
  {
    name: "Pomodoro Pro",
    description: "Complete 50 Pomodoro sessions.",
    petReward: "Einstein",
    icon: Award,
    target: 50,
    getValue: (user: any) => user.completedSessions || 0,
  },
  {
    name: "Quiz Whiz",
    description: "Achieve a quiz streak of 10.",
    petReward: "Sparky",
    icon: Award,
    target: 10,
    getValue: (user: any) => user.highestQuizStreak || 0,
  },
  {
    name: "Quiz Master",
    description: "Achieve a quiz streak of 25.",
    petReward: "Bolt",
    icon: Award,
    target: 25,
    getValue: (user: any) => user.highestQuizStreak || 0,
  },
];

const subjectSchema = z.object({
  name: z.string().min(3, "Subject name must be at least 3 characters."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code (e.g., #RRGGBB)."),
});

const topicSchema = z.object({
  name: z.string().min(3, "Topic name must be at least 3 characters."),
  subjectId: z.string().min(1, "Please select a subject."),
});

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, firebaseUser, linkGoogleAccount, updateUser, isAdmin } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [passingScore, setPassingScore] = useState(85);

  const subjectsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'subjects'), orderBy('orderIndex')) : null, [firestore]);
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);

  const subjectForm = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", color: "#" },
  });

  const topicForm = useForm<z.infer<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: { name: "", subjectId: "" },
  });

  useEffect(() => {
    if (user) {
      setNewName(user.name);
      if (user.examDate) {
        setExamDate(new Date(user.examDate));
      }
      setPassingScore(user.passingScore || 85);
      applyTheme(user.activeTheme || 'default');
    }
  }, [user]);

  const handleSeed = async () => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Firestore not available" });
        return;
    }
    try {
      const batch = writeBatch(firestore);

      subjectsSeed.forEach((subject) => {
        batch.set(doc(firestore, 'subjects', subject.id), subject);
      });

      topicsSeed.forEach((topic) => {
        batch.set(doc(firestore, 'topics', topic.id), topic);
      });

      reviewersSeed.forEach((reviewer: any) => {
        batch.set(doc(firestore, 'reviewers', reviewer.id), { ...reviewer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      });
      
      const questionsByCategory = (questionsSeed as QuizQuestion[]).reduce((acc, q) => {
        if (q.category) {
            if (!acc[q.category]) acc[q.category] = [];
            acc[q.category].push(q);
        }
        return acc;
      }, {} as Record<string, QuizQuestion[]>);

      for (const category in questionsByCategory) {
        const categoryDocRef = doc(firestore, 'questions', category);
        const existingDoc = await getDoc(categoryDocRef);
        if (existingDoc.exists()) {
          batch.update(categoryDocRef, { questions: questionsByCategory[category] });
        } else {
          batch.set(categoryDocRef, { questions: questionsByCategory[category] });
        }
      }

      await batch.commit();
      
      toast({
        title: "Database Seeded",
        description: `Content was successfully added.`,
        className: "bg-green-100 border-green-300"
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Seeding Failed",
        description: error.message || "An unknown error occurred.",
      });
      console.error("Seeding failed:", error);
    }
  };

  const handleNameSave = async () => {
    if (user && newName.trim()) {
        updateUser({ name: newName.trim() });
        setEditingName(false);
        toast({
          title: "Success",
          description: "Your name has been updated.",
          className: "bg-green-100 border-green-300"
        });
    }
  };

  const handleSettingsSave = async () => {
     if (user) {
        updateUser({
            examDate: examDate ? examDate.toISOString() : undefined,
            passingScore: passingScore,
        });
        toast({
          title: "Success",
          description: "Your settings have been saved.",
          className: "bg-green-100 border-green-300"
        });
    }
  }

  const handleLogout = async () => {
      if(auth) {
        await signOut(auth);
        router.push('/');
      }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please select an image smaller than 2MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const avatarUrl = event.target?.result as string;
        updateUser({ avatarUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const applyTheme = (themeValue: string) => {
    document.documentElement.classList.remove('mint', 'sunset', 'rose');
    if(themeValue !== 'default') {
        document.documentElement.classList.add(themeValue);
    }
  }

  const handleThemeAction = async (themeValue: string, cost: number) => {
    if (!user) return;
    
    if (user.unlockedThemes.includes(themeValue)) {
        updateUser({ activeTheme: themeValue });
        applyTheme(themeValue);
        toast({ title: "Theme Activated!", className: "bg-green-100 border-green-300"});
    } else {
        if (user.points >= cost) {
             const currentPoints = user.points;
             updateUser({
                points: currentPoints - cost,
                unlockedThemes: [...user.unlockedThemes, themeValue],
                activeTheme: themeValue
            });
            applyTheme(themeValue);
            toast({ title: "Theme Unlocked!", description: `You spent ${cost} points.`, className: "bg-green-100 border-green-300"});
        } else {
            toast({ variant: "destructive", title: "Not enough points!"});
        }
    }
  }

  const handlePetPurchase = async (petName: string, cost: number) => {
     if (!user) return;
      if (user.points >= cost) {
        const currentPoints = user.points;
        updateUser({
            points: currentPoints - cost,
            unlockedPets: [...new Set([...user.unlockedPets, petName])],
        });
        toast({ title: "Pet Unlocked!", description: `You spent ${cost} points to get ${petName}!`, className: "bg-green-100 border-green-300"});
      } else {
        toast({ variant: "destructive", title: "Not enough points!"});
      }
  }

  const handleAddSubject = async (data: z.infer<typeof subjectSchema>) => {
    if (!firestore) return;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      await addDoc(collection(firestore, 'subjects'), {
        ...data,
        slug,
        orderIndex: subjects?.length || 0,
        id: slug,
      });
      toast({ title: 'Subject Added', description: `${data.name} has been added.` });
      subjectForm.reset({ name: "", color: "#" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleAddTopic = async (data: z.infer<typeof topicSchema>) => {
    if (!firestore) return;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      await addDoc(collection(firestore, 'topics'), {
        ...data,
        slug,
        id: slug,
      });
      toast({ title: 'Topic Added', description: `${data.name} has been added.` });
      topicForm.reset({ name: "", subjectId: "" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };


  if (!user) {
    return null; // Or a loading spinner
  }

  if (firebaseUser?.isAnonymous) {
      return (
        <div className="container mx-auto p-4 max-w-2xl h-full flex flex-col justify-center gap-4">
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Guest Mode</AlertTitle>
              <AlertDescription>
                Your progress is saved locally on this device only. Sign in to sync your data across devices.
              </AlertDescription>
            </Alert>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-center font-headline text-2xl">Save Your Progress</CardTitle>
                    <CardDescription className="text-center">
                        Sign in with Google to save your points, pets, and streaks. Don't lose your hard work!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={linkGoogleAccount}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign In with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">Profile & Settings</h1>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
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
                <div className="text-center w-full max-w-xs">
                    {editingName ? (
                    <div className="flex items-center gap-2">
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="text-xl font-bold font-headline h-auto p-1" onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                        <Button size="icon" variant="ghost" onClick={handleNameSave}>
                        <Check className="h-5 w-5 text-green-500" />
                        </Button>
                    </div>
                    ) : (
                    <div className="flex items-center justify-center gap-2">
                        <h2 className="text-xl font-bold font-headline">{user.name}</h2>
                        <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                        <Edit className="h-5 w-5" />
                        </Button>
                    </div>
                    )}
                </div>
            </div>
            
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Unlock new pets by completing milestones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {allAchievements.map(ach => {
                const currentValue = ach.getValue(user);
                const progress = Math.min((currentValue / ach.target) * 100, 100);
                const isUnlocked = progress === 100;
                return (
                    <div key={ach.name} className={cn("p-4 rounded-lg border", isUnlocked ? "bg-green-50 border-green-200" : "bg-muted/30")}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-full", isUnlocked ? "bg-green-200 text-green-700" : "bg-muted")}>
                                    <ach.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">{ach.name}</p>
                                    <p className="text-sm text-muted-foreground">{ach.description}</p>
                                </div>
                            </div>
                             {isUnlocked && (
                                <div className="flex flex-col items-center">
                                    <Image src={achievementPets.find(p => p.name === ach.petReward)?.image || ''} alt={ach.petReward} width={40} height={40} className="rounded-full bg-white p-1" />
                                    <p className="text-xs font-bold text-green-700">Unlocked!</p>
                                </div>
                            )}
                        </div>
                        {!isUnlocked && (
                            <div className="mt-2">
                                <Progress value={progress} />
                                <p className="text-xs text-right text-muted-foreground mt-1">{currentValue} / {ach.target}</p>
                            </div>
                        )}
                    </div>
                )
            })}
        </CardContent>
      </Card>
      
       <Card className="mt-6">
            <CardHeader>
                <CardTitle>App Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="exam-date">Exam Date</Label>
                    <DatePicker date={examDate} setDate={setExamDate} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="passing-score">Challenge Passing Score: <span className="font-bold text-primary">{passingScore}%</span></Label>
                    <Slider
                        id="passing-score"
                        min={50}
                        max={100}
                        step={5}
                        value={[passingScore]}
                        onValueChange={(value) => setPassingScore(value[0])}
                    />
                </div>
                 <Button className="w-full" onClick={handleSettingsSave}>
                    Save Settings
                </Button>
            </CardContent>
        </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Themes</CardTitle>
            <CardDescription>Customize the look and feel of your app. Your points: {user.points}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themes.map(theme => {
                const isUnlocked = user.unlockedThemes.includes(theme.value);
                const isActive = user.activeTheme === theme.value;
                return (
                    <div key={theme.value} className="flex flex-col items-center gap-2">
                         <div className={cn("flex items-center justify-center h-16 w-16 rounded-full border-4", isActive ? "border-primary" : "border-transparent")}>
                             <div 
                                className="h-12 w-12 rounded-full flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.accent})`
                                }}
                            />
                        </div>
                        <p className="font-semibold">{theme.name}</p>
                        <Button 
                            className="w-full"
                            variant={isActive ? "secondary" : "default"}
                            onClick={() => handleThemeAction(theme.value, theme.cost)}
                            disabled={isActive}
                        >
                            {isActive ? "Active" : (isUnlocked ? "Activate" : `${theme.cost} pts`)}
                        </Button>
                    </div>
                )
            })}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Pet Store</CardTitle>
            <CardDescription>Purchase rare pets with your points.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rarePets.map(pet => {
                const isUnlocked = user.unlockedPets.includes(pet.name);
                return (
                    <div key={pet.name} className="flex flex-col items-center gap-2 text-center">
                        <Image
                            src={pet.image}
                            alt={pet.name}
                            width={80}
                            height={80}
                            className={cn(
                                "rounded-full bg-muted p-2",
                                isUnlocked && "animate-bob"
                            )}
                            data-ai-hint={pet.hint}
                        />
                        <p className="font-semibold">{pet.name}</p>
                         <Button 
                            className="w-full"
                            onClick={() => handlePetPurchase(pet.name, pet.cost)}
                            disabled={isUnlocked}
                        >
                             {isUnlocked ? "Unlocked" : (
                                <>
                                 <Gem className="mr-2 h-4 w-4" />
                                 {pet.cost}
                                </>
                             )}
                        </Button>
                    </div>
                );
            })}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Add new subjects and topics to the database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...subjectForm}>
                <form onSubmit={subjectForm.handleSubmit(handleAddSubject)} className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-medium">Add New Subject</h3>
                  <FormField control={subjectForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Subject Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={subjectForm.control} name="color" render={({ field }) => (
                    <FormItem><FormLabel>Color (Hex)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={subjectForm.formState.isSubmitting}>Add Subject</Button>
                </form>
              </Form>
              <Form {...topicForm}>
                <form onSubmit={topicForm.handleSubmit(handleAddTopic)} className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-medium">Add New Topic</h3>
                  <FormField control={topicForm.control} name="subjectId" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                        <SelectContent>{isLoadingSubjects ? <SelectItem value="loading" disabled>Loading...</SelectItem> : subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={topicForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Topic Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={topicForm.formState.isSubmitting}>Add Topic</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Log out of your account.</p>
                <Button variant="destructive" className="w-full" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Seed the database with initial questions and articles. This should only be run once.</p>
                <Button variant="destructive" className="w-full" onClick={handleSeed}><Database className="mr-2 h-4 w-4" />Seed Database</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isAdmin && (
         <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div>
                    <p className="text-sm text-muted-foreground mb-2">Log out of your account.</p>
                    <Button variant="destructive" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </CardContent>
         </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About LETReview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This app is a review companion designed to help aspiring educators prepare for the Licensure Examination for Teachers (LET) in the Philippines.
          </p>
          <br />
           <p className="text-sm text-muted-foreground italic">
            This app is lovingly dedicated to my girlfriend, Yve, an aspiring teacher who inspired this project.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
