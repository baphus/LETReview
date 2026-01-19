
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, LogOut, Camera, Palette, Gem, Trophy, Clock, Award, Check, Edit } from "lucide-react";
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
import { useAuth, useFirestore } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";

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
    icon: Clock,
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


export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [passingScore, setPassingScore] = useState(85);

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

  const handleNameSave = async () => {
    if (user && firestore && newName.trim()) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { name: newName.trim() });
        setEditingName(false);
        toast({
          title: "Success",
          description: "Your name has been updated.",
          className: "bg-green-100 border-green-300"
        });
    }
  };

  const handleSettingsSave = async () => {
     if (user && firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, {
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
    if (file && user && firestore) {
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
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { avatarUrl });
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
    if (!user || !firestore) return;
    
    const userRef = doc(firestore, "users", user.uid);

    if (user.unlockedThemes.includes(themeValue)) {
        await updateDoc(userRef, { activeTheme: themeValue });
        applyTheme(themeValue);
        toast({ title: "Theme Activated!", className: "bg-green-100 border-green-300"});
    } else {
        if (user.points >= cost) {
            await updateDoc(userRef, {
                points: increment(-cost),
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
     if (!user || !firestore) return;
      if (user.points >= cost) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, {
            points: increment(-cost),
            unlockedPets: [...new Set([...user.unlockedPets, petName])],
        });
        toast({ title: "Pet Unlocked!", description: `You spent ${cost} points to get ${petName}!`, className: "bg-green-100 border-green-300"});
      } else {
        toast({ variant: "destructive", title: "Not enough points!"});
      }
  }

  if (!user) {
    return null; // Or a loading spinner
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
    </div>
  );
}
