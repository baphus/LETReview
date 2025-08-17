
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { User, LogOut, Settings, Edit, Check, Camera, Palette, Gem, Brush, AlertTriangle, Moon, Sun, BookCopy, PlusCircle, Trash, Copy } from "lucide-react";
import { useEffect, useState, useRef, ChangeEvent, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { rarePets, createNewBank, saveUserProfile, loadUserProfile, getActiveBank } from "@/lib/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { auth } from "@/lib/firebase";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent, DialogDescription } from "@/components/ui/dialog";
import type { UserProfile, QuestionBank } from "@/lib/types";

const themes = [
    { name: 'Default', value: 'default', cost: 0, colors: { primary: 'hsl(217.2 91.2% 59.8%)', accent: 'hsl(217.2 32.6% 20%)' } },
    { name: 'Mint', value: 'mint', cost: 100, colors: { primary: 'hsl(160, 50%, 45%)', accent: 'hsl(200, 60%, 50%)' } },
    { name: 'Sunset', value: 'sunset', cost: 100, colors: { primary: 'hsl(25, 80%, 55%)', accent: 'hsl(350, 70%, 60%)' } },
    { name: 'Rose', value: 'rose', cost: 100, colors: { primary: 'hsl(340, 70%, 55%)', accent: 'hsl(280, 50%, 60%)' } },
];

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeBank, setActiveBank] = useState<QuestionBank | null>(null);
  
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [passingScore, setPassingScore] = useState(75);
  const [showGuide, setShowGuide] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  const applyUserTheme = (mode: 'light' | 'dark', theme: string) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'mint', 'sunset', 'rose');
    root.classList.add(mode);
    if (theme !== 'default') {
      root.classList.add(theme);
    }
  };
  
  const loadData = useCallback(() => {
    const userProfile = loadUserProfile();
    if (userProfile) {
        setProfile(userProfile);
        setNewName(userProfile.name);
        
        const currentBank = userProfile.banks.find(b => b.id === userProfile.activeBankId);
        if (currentBank) {
            setActiveBank(currentBank);
            setExamDate(currentBank.examDate ? new Date(currentBank.examDate) : undefined);
            setPassingScore(currentBank.passingScore || 75);
            applyUserTheme(userProfile.themeMode, currentBank.activeTheme);
        }

        const hasSeenGuide = localStorage.getItem('hasSeenProfileGuide');
        if (!hasSeenGuide) {
            setShowGuide(true);
        }
    } else {
        router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
        window.removeEventListener('storage', loadData);
    }
  }, [loadData]);


  const saveProfileAndBank = (updatedProfile: UserProfile, updatedBank: QuestionBank | null) => {
    if (updatedBank) {
      const bankIndex = updatedProfile.banks.findIndex(b => b.id === updatedBank.id);
      if (bankIndex !== -1) {
          updatedProfile.banks[bankIndex] = updatedBank;
      }
    }
    saveUserProfile(updatedProfile);
    setProfile({...updatedProfile});
    setActiveBank(updatedBank ? {...updatedBank} : null);
  };
  
  const handleNameSave = () => {
    if (profile && newName.trim()) {
        const updatedProfile = { ...profile, name: newName.trim() };
        saveUserProfile(updatedProfile);
        setProfile(updatedProfile);
        setEditingName(false);
        toast({
          title: "Success",
          description: "Your name has been updated.",
          className: "bg-primary border-primary text-primary-foreground"
        });
    }
  };

  const handleSettingsSave = () => {
     if (profile && activeBank) {
        const updatedBank = { 
            ...activeBank, 
            examDate: examDate ? examDate.toISOString() : undefined,
            passingScore: passingScore,
        };
        saveProfileAndBank(profile, updatedBank);
        toast({
          title: "Success",
          description: "Your settings have been saved.",
          className: "bg-primary border-primary text-primary-foreground"
        });
    }
  }

  const handleSignOut = () => {
      auth.signOut().then(() => {
        localStorage.removeItem('currentUser');
        router.push('/login');
        toast({
            title: "Signed Out",
            description: "You have been successfully signed out.",
        });
      });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
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
        const avatarUrl = event.target?.result as string;
        const updatedProfile = { ...profile, avatarUrl };
        saveUserProfile(updatedProfile);
        setProfile(updatedProfile);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThemeModeToggle = (isDark: boolean) => {
    if (!profile) return;
    const newMode = isDark ? 'dark' : 'light';
    const updatedProfile = { ...profile, themeMode: newMode };
    saveUserProfile(updatedProfile);
    setProfile(updatedProfile);
    if(activeBank) {
        applyUserTheme(newMode, activeBank.activeTheme);
    }
  };

  const handleThemeAction = (themeValue: string, cost: number) => {
    if (!profile || !activeBank) return;
    
    if (activeBank.unlockedThemes.includes(themeValue)) {
        const updatedBank = { ...activeBank, activeTheme: themeValue };
        saveProfileAndBank(profile, updatedBank);
        applyUserTheme(profile.themeMode, themeValue);
        toast({ title: "Theme Activated!", className: "bg-primary border-primary text-primary-foreground"});
    } else {
        if (activeBank.points >= cost) {
            const updatedBank = { 
                ...activeBank, 
                points: activeBank.points - cost, 
                unlockedThemes: [...activeBank.unlockedThemes, themeValue],
                activeTheme: themeValue
            };
            saveProfileAndBank(profile, updatedBank);
            applyUserTheme(profile.themeMode, themeValue);
            toast({ title: "Theme Unlocked!", description: `You spent ${cost} points.`, className: "bg-primary border-primary text-primary-foreground"});
        } else {
            toast({ variant: "destructive", title: "Not enough points!"});
        }
    }
  }

  const handlePetPurchase = (petName: string, cost: number) => {
     if (!profile || !activeBank) return;
      if (activeBank.points >= cost) {
        const updatedBank = {
            ...activeBank,
            points: activeBank.points - cost,
            unlockedPets: [...new Set([...activeBank.unlockedPets, petName])],
        };
        saveProfileAndBank(profile, updatedBank);
        toast({ title: "Pet Unlocked!", description: `You spent ${cost} points to get ${petName}!`, className: "bg-primary border-primary text-primary-foreground"});
      } else {
        toast({ variant: "destructive", title: "Not enough points!"});
      }
  }

  const handleCloseGuide = () => {
    localStorage.setItem('hasSeenProfileGuide', 'true');
    setShowGuide(false);
  };
  
  const handleBankFormSubmit = () => {
    if (!profile || !newBankName.trim()) return;

    if (editingBankId) { // Editing
        const bankIndex = profile.banks.findIndex(b => b.id === editingBankId);
        if (bankIndex !== -1) {
            profile.banks[bankIndex].name = newBankName;
            toast({ title: "Bank Renamed", description: `Bank has been renamed to "${newBankName}".` });
        }
    } else { // Adding new
        const newBank = createNewBank(newBankName);
        profile.banks.push(newBank);
        toast({ title: "Bank Created", description: `New bank "${newBankName}" has been created.` });
    }
    
    saveUserProfile(profile);
    setProfile({...profile});
    setShowBankDialog(false);
    setNewBankName("");
    setEditingBankId(null);
  };

  const handleDeleteBank = (bankId: string) => {
    if (!profile || profile.banks.length <= 1) {
        toast({ variant: "destructive", title: "Cannot delete", description: "You must have at least one question bank." });
        return;
    }
    
    const updatedProfile = { ...profile, banks: profile.banks.filter(b => b.id !== bankId) };
    if (updatedProfile.activeBankId === bankId) {
        updatedProfile.activeBankId = updatedProfile.banks[0].id;
    }
    
    saveUserProfile(updatedProfile);
    setProfile(updatedProfile);
    setActiveBank(updatedProfile.banks.find(b => b.id === updatedProfile.activeBankId) || null);
    toast({ title: "Bank Deleted" });
  };
  
  const handleSwitchBank = (bankId: string) => {
      if (!profile) return;
      const updatedProfile = { ...profile, activeBankId: bankId };
      saveUserProfile(updatedProfile);
      loadData(); // Reload all data for the new active bank
      toast({ title: "Switched Bank", description: `Now using "${profile.banks.find(b => b.id === bankId)?.name}" bank.`});
  }

  const handleResetBank = () => {
      if (!profile || !activeBank) return;
      const originalName = activeBank.name;
      const newBank = createNewBank(originalName);
      newBank.id = activeBank.id; // Keep the same ID

      const bankIndex = profile.banks.findIndex(b => b.id === activeBank.id);
      if (bankIndex !== -1) {
          profile.banks[bankIndex] = newBank;
          saveProfileAndBank(profile, newBank);
          toast({ title: "Bank Reset", description: `All stats for "${originalName}" have been reset.` });
      }
  }


  if (!profile || !activeBank) {
    return null; // Or a loading spinner
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
       {/* Onboarding Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Profile & Settings</DialogTitle>
            <DialogDescription asChild>
              <div className="text-base text-muted-foreground pt-4 space-y-4">
                <div>This is where you can customize your app experience and manage your account.</div>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-primary">Edit Profile:</strong> Change your name and avatar.</li>
                  <li><strong className="text-primary">Question Banks:</strong> This is the most powerful feature! Create different banks for different subjects (e.g., "Math", "History"). Each bank has its own separate questions, stats, streaks, and progress.</li>
                  <li><strong className="text-primary">Appearance:</strong> Spend your points to unlock new color themes and purchase rare pets from the store for the active bank.</li>
                  <li><strong className="text-primary">Danger Zone:</strong> Reset stats for the current bank or sign out.</li>
                </ul>
                <div>Make this space your own!</div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseGuide}>Got it!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Bank Management Dialog */}
        <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingBankId ? "Edit" : "Create"} Question Bank</DialogTitle>
                    <DialogDescription>
                        {editingBankId ? "Rename your question bank." : "Create a new bank to store a separate set of questions and track progress."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input id="bank-name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="e.g., Biology Midterm" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowBankDialog(false); setNewBankName(""); setEditingBankId(null); }}>Cancel</Button>
                    <Button onClick={handleBankFormSubmit}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      <header className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">Profile & Settings</h1>
      </header>
      
        <div className="space-y-6">
            <Accordion type="single" collapsible defaultValue="profile">
                <AccordionItem value="profile">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5" />
                            <span className="font-semibold">Edit Profile</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-primary">
                                <AvatarImage src={profile.avatarUrl} alt={profile.name} data-ai-hint="profile picture" />
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
                                    <h2 className="text-xl font-bold font-headline">{profile.name}</h2>
                                    <Button size="icon" variant="ghost" onClick={() => setEditingName(true)}>
                                    <Edit className="h-5 w-5" />
                                    </Button>
                                </div>
                                )}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="questions">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <BookCopy className="h-5 w-5" />
                            <span className="font-semibold">Question Banks</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                       <p className="text-sm text-muted-foreground">Each bank has its own questions, stats, and progress. Select a bank to make it active across the app or manage its questions.</p>
                       <Card>
                         <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">Your Banks</CardTitle>
                                <Button size="sm" onClick={() => { setEditingBankId(null); setNewBankName(""); setShowBankDialog(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Bank
                                </Button>
                            </div>
                         </CardHeader>
                         <CardContent className="space-y-2">
                            {profile.banks.map(bank => (
                                <div key={bank.id} className={cn("flex items-center gap-2 p-3 rounded-md", profile.activeBankId === bank.id ? "bg-primary/10 border border-primary" : "bg-muted/50")}>
                                    <div className="flex-1">
                                        <p className="font-semibold">{bank.name}</p>
                                        <p className="text-xs text-muted-foreground">{bank.questions.length} questions</p>
                                    </div>
                                    {profile.activeBankId === bank.id ? (
                                        <Badge>Active</Badge>
                                    ) : (
                                        <Button variant="secondary" size="sm" onClick={() => handleSwitchBank(bank.id)}>
                                            Select
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={`/profile/questions?bankId=${bank.id}`}>Manage</Link>
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingBankId(bank.id); setNewBankName(bank.name); setShowBankDialog(true); }}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="destructive" className="h-8 w-8" disabled={profile.banks.length <= 1}>
                                                <Trash className="h-4 w-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete "{bank.name}"?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete this bank and all of its questions and progress? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteBank(bank.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                         </CardContent>
                       </Card>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="settings">
                    <AccordionTrigger>
                         <div className="flex items-center gap-3">
                            <Settings className="h-5 w-5" />
                            <span className="font-semibold">Bank Settings for "{activeBank.name}"</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="exam-date">Exam Date</Label>
                            <p className="text-xs text-muted-foreground">Set a countdown timer for this specific bank.</p>
                            <DatePicker date={examDate} setDate={setExamDate} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passing-score">Challenge Passing Score: <span className="font-bold text-primary">{passingScore}%</span></Label>
                            <p className="text-xs text-muted-foreground">The score required to pass daily challenges for this bank.</p>
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
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="appearance">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <Brush className="h-5 w-5" />
                            <span className="font-semibold">Appearance</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Theme Mode</CardTitle>
                                <CardDescription>This setting affects all your question banks.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <Label htmlFor="dark-mode" className="text-base">Dark Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Toggle between light and dark themes.
                                    </p>
                                  </div>
                                   <div className="flex items-center gap-2">
                                        <Sun className="h-5 w-5"/>
                                        <Switch
                                            id="dark-mode"
                                            checked={profile.themeMode === 'dark'}
                                            onCheckedChange={handleThemeModeToggle}
                                        />
                                        <Moon className="h-5 w-5"/>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Color Themes for "{activeBank.name}"</CardTitle>
                                <CardDescription>Customize the accent colors. Unlocks and points are specific to this bank. Your points: {activeBank.points}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {themes.map(theme => {
                                    const isUnlocked = activeBank.unlockedThemes.includes(theme.value);
                                    const isActive = activeBank.activeTheme === theme.value;
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Pet Store for "{activeBank.name}"</CardTitle>
                                <CardDescription>Purchase rare pets with points from this bank.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {rarePets.map(pet => {
                                    const isUnlocked = activeBank.unlockedPets.includes(pet.name);
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
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="danger">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-semibold">Danger Zone</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                       <Card className="border-destructive">
                            <CardHeader>
                                <CardTitle className="text-destructive">Reset Bank Stats</CardTitle>
                                <CardDescription>
                                    This will reset all progress (points, streaks, pets, etc.) for the currently active bank, <span className="font-bold">"{activeBank.name}"</span>. Your questions and other banks will not be affected. This action is irreversible.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">Reset "{activeBank.name}" Bank</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently reset all stats for the bank named "{activeBank.name}".
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetBank}>Confirm Reset</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                       </Card>

                       <Card>
                            <CardHeader>
                                <CardTitle>Sign Out</CardTitle>
                                <CardDescription>
                                    This action will sign you out of your Qwiz account on this device. Your data will be saved for your next login.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                               <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sign Out
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You can always sign back in later.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                       </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </div>
  );
}
