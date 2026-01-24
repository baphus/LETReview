
'use client';

import { useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/datepicker';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { user, updateUser } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState<'name' | 'date'>('name');
  const [name, setName] = useState(user?.name || '');
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Please enter a name with at least 2 characters.' });
      return;
    }
    setStep('date');
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateUser({
        name: name.trim(),
        examDate: examDate ? examDate.toISOString() : null,
        hasCompletedOnboarding: true,
      });
      toast({ title: "Welcome!", description: "Your profile has been set up.", className: "bg-green-100 border-green-300" });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSkip = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateUser({ hasCompletedOnboarding: true });
      onOpenChange(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not update your profile.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Don't render if there's no user
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-md">
        {step === 'name' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Welcome to LETReview!</DialogTitle>
              <DialogDescription>Let's start by setting up your name.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={handleSkip}>I'll do this later</Button>
              <Button onClick={handleNameSubmit}>Next</Button>
            </DialogFooter>
          </>
        )}
        {step === 'date' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Set Your Exam Date</DialogTitle>
              <DialogDescription>This will add a countdown to your homepage. You can skip this for now.</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center">
              <DatePicker date={examDate} setDate={setExamDate} />
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('name')}>Back</Button>
              <Button onClick={handleFinish} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finish Setup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
