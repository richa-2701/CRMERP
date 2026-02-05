"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, type ApiActivity } from "@/lib/api";
// --- START OF CHANGE: Import Timer icon ---
import { Loader2, Calendar, Timer } from "lucide-react";
// --- END OF CHANGE ---
import { formatDateTime } from "@/lib/date-format";
import { Badge } from "@/components/ui/badge";

interface PastActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number | null;
  leadName: string | null;
}

export function PastActivitiesModal({ isOpen, onClose, leadId, leadName }: PastActivitiesModalProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      setIsLoading(true);
      api.getActivitiesByLead(leadId)
        .then((data) => {
          setActivities(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        })
        .catch((error) => {
          console.error("Failed to fetch past activities:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, leadId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Activity History for {leadName}</DialogTitle>
          <DialogDescription>
            A complete history of all logged activities for this lead, showing the most recent first.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-semibold text-sm capitalize">{activity.activity_type || activity.phase}</Badge>
                      {/* --- START OF CHANGE: Conditionally display duration --- */}
                      {activity.duration_minutes && activity.duration_minutes > 0 && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5" />
                            <span>{activity.duration_minutes} min</span>
                          </div>
                      )}
                      {/* --- END OF CHANGE --- */}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateTime(activity.created_at)} by {activity.created_by}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-300">{activity.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              No past activities have been logged for this lead yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}