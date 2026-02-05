"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, ApiReminder, ApiUser } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input"; // Import Input component

interface MarkAsDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activity: ApiReminder | null;
  currentUser: ApiUser | null;
}

export function MarkAsDoneModal({
  isOpen,
  onClose,
  onSuccess,
  activity,
  currentUser,
}: MarkAsDoneModalProps) {
  const [notes, setNotes] = useState("");
  // --- START OF CHANGE: Add duration state ---
  const [duration, setDuration] = useState("");
  // --- END OF CHANGE ---
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setNotes("");
      // --- START OF CHANGE: Reset duration on close ---
      setDuration("");
      // --- END OF CHANGE ---
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // --- START OF CHANGE: Add duration to validation ---
    if (!activity || !currentUser || !notes || !duration) {
      toast({
        title: "Missing Information",
        description: "Please provide outcome notes and the activity duration.",
        variant: "destructive",
      });
      return;
    }
    // --- END OF CHANGE ---

    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
        toast({ title: "Invalid Duration", description: "Please enter a valid, positive number for the duration.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
      // --- START OF CHANGE: Pass durationMinutes to the API call ---
      await api.completeAndLogReminder(activity.id, notes, currentUser.username, durationMinutes);
      // --- END OF CHANGE ---
      
      toast({
        title: "Success!",
        description: "The activity has been marked as complete and logged.",
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to mark activity as done:", error);
      toast({
        title: "Error",
        description: "Could not complete the activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !activity) {
    return null;
  }
  
  const companyName = (activity as any).company_name || "the lead";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Scheduled Activity</DialogTitle>
          <DialogDescription>
            Log the outcome for your scheduled activity with {companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="original-task">Original Task:</Label>
            <div
              id="original-task"
              className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border min-h-[60px]"
            >
              {activity.message}
            </div>
          </div>
          
          {/* --- START OF CHANGE: Add duration input field --- */}
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Time Taken (minutes) *</Label>
            <Input 
                id="duration_minutes"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 15"
                required
                min="1"
            />
          </div>
          {/* --- END OF CHANGE --- */}

          <div className="space-y-2">
            <Label htmlFor="outcome-notes">Outcome / Notes *</Label>
            <Textarea
              id="outcome-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Client agreed to the proposal and will send the PO by EOD."
              rows={4}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !notes || !duration}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Done & Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}