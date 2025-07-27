import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Flame, Gem, Star, Award, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import { pets } from "@/lib/data";

export default function ProfilePage() {
  const user = {
    name: "LET Aspirant",
    email: "aspirant@example.com",
    avatarUrl: "https://placehold.co/100x100",
    points: 125,
    streak: 6,
    completedSessions: 4,
    petsUnlocked: 2,
  };

  const unlockedPets = pets.slice(0, user.petsUnlocked);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex flex-col items-center gap-4 mb-6">
        <Avatar className="h-24 w-24 border-4 border-primary">
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
          <AvatarFallback>
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-2xl font-bold font-headline">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button>
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.83 0-6.95-3.12-6.95-6.95s3.12-6.95 6.95-6.95c2.21 0 3.63 1.05 4.43 1.82l2.49-2.49C18.02 2.89 15.65 2 12.48 2c-5.63 0-10.23 4.6-10.23 10.23s4.6 10.23 10.23 10.23c2.89 0 5.25-1.02 7-3.18 1.93-2.16 2.58-5.04 2.58-7.78v-.76h-9.56Z" fill="currentColor"/></svg>
          Sign in with Google
        </Button>
      </header>
      
      <Separator className="my-6" />

      <section>
        <h2 className="text-xl font-bold font-headline mb-4">Study Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Gem className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.points}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.streak} days</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pets Unlocked</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.petsUnlocked}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pomodoro Sessions</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.completedSessions}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold font-headline mb-4">Pet Collection</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {unlockedPets.length > 0 ? unlockedPets.map((pet) => (
            <div key={pet.name} className="flex flex-col items-center text-center">
              <Image 
                src={pet.image} 
                alt={pet.name} 
                width={80} 
                height={80} 
                className="rounded-full bg-muted p-2"
                data-ai-hint={pet.hint}
              />
              <p className="text-sm font-medium mt-1">{pet.name}</p>
            </div>
          )) : <p className="col-span-full text-muted-foreground">No pets unlocked yet. Keep up your streak!</p>}
        </div>
      </section>

      <Separator className="my-6" />

      <section className="space-y-2">
         <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
         </Button>
         <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
         </Button>
      </section>
    </div>
  );
}
