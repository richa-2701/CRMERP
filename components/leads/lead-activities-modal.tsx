// frontend/components/leads/lead-activities-modal.tsx
"use client"

import { useEffect, useState, type ComponentType } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Activity,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Video,
  CheckCircle,
  Bell,
  Trash2
} from "lucide-react"
import {
  api,
  meetingsApi,
  demosApi,
  type ApiLead,
  type ApiActivity,
  type ApiMeeting,
  type ApiDemo,
  type ApiReminder
} from "@/lib/api"
import { formatDateTime } from "@/lib/date-format";

interface LeadActivitiesModalProps {
  lead: ApiLead | null
  isOpen: boolean
  onClose: () => void
}

// Define a unified structure for all timeline items
interface UnifiedTimelineItem {
  id: string;
  type: 'activity' | 'meeting' | 'demo' | 'reminder';
  date: Date;
  title: string;
  details: string | null;
  createdBy: string;
  Icon: ComponentType<{ className: string }>;
  color: string;
}

export function LeadActivitiesModal({ lead, isOpen, onClose }: LeadActivitiesModalProps) {
  // State will now hold the unified timeline items
  const [timeline, setTimeline] = useState<UnifiedTimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && lead) {
      const fetchTimelineData = async () => {
        try {
          setIsLoading(true)
          setError(null)

          const leadId = Number((lead as any).LedgerID || (lead as any).ledger_id || lead.id);
          console.log("LeadActivitiesModal fetching for ID:", leadId);

          if (!leadId || isNaN(leadId)) {
            console.error("Invalid lead ID detected:", lead);
            setError("Invalid Lead ID");
            setIsLoading(false);
            return;
          }

          const [activitiesRes, meetingsRes, demosRes, remindersRes] = await Promise.all([
            api.getActivitiesByLead(leadId).catch(err => { console.error("Activities fetch error:", err); return []; }),
            meetingsApi.getAllMeetings({ leadId }).catch(err => { console.error("Meetings fetch error:", err); return []; }),
            demosApi.getAllDemos({ leadId }).catch(err => { console.error("Demos fetch error:", err); return []; }),
            api.getAllReminders({ leadId }).catch(err => { console.error("Reminders fetch error:", err); return []; })
          ]);

          console.log("Activites response:", activitiesRes);
          console.log("Meetings response:", meetingsRes);
          console.log("Demos response:", demosRes);
          console.log("Reminders response:", remindersRes);

          const mappedActivities: UnifiedTimelineItem[] = (Array.isArray(activitiesRes) ? activitiesRes : []).map((a: ApiActivity) => {
            const isDeleteLog = a.activity_type === 'system-delete';
            const lowerPhase = a.phase?.toLowerCase() || '';
            let Icon = Activity;
            let color = "bg-gray-100 text-gray-800";
            if (isDeleteLog) {
              Icon = Trash2;
              color = "bg-red-100 text-red-800";
            } else if (lowerPhase.includes("call")) {
              Icon = Phone; color = "bg-blue-100 text-blue-800";
            } else if (lowerPhase.includes("email")) {
              Icon = Mail; color = "bg-green-100 text-green-800";
            } else if (lowerPhase.includes("message")) {
              Icon = MessageSquare; color = "bg-orange-100 text-orange-800";
            }
            return {
              id: `activity-${a.id}`,
              type: 'activity',
              date: new Date(a.created_at),
              title: isDeleteLog ? "Activity Deleted" : `Logged: ${a.phase || 'Activity'}`,
              details: a.details,
              createdBy: a.created_by,
              Icon,
              color,
            }
          });

          const mappedMeetings: UnifiedTimelineItem[] = (Array.isArray(meetingsRes) ? meetingsRes : []).map((m: ApiMeeting) => ({
            id: `meeting-${m.id}`,
            type: 'meeting',
            date: new Date(m.event_time),
            title: m.phase === 'Completed' ? 'Meeting Completed' : 'Meeting Scheduled',
            details: m.remark || 'No details provided.',
            createdBy: m.created_by,
            Icon: m.phase === 'Completed' ? CheckCircle : Calendar,
            color: m.phase === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800',
          }));

          const mappedDemos: UnifiedTimelineItem[] = (Array.isArray(demosRes) ? demosRes : []).map((d: ApiDemo) => ({
            id: `demo-${d.id}`,
            type: 'demo',
            date: new Date(d.start_time),
            title: d.phase === 'Completed' ? 'Demo Completed' : 'Demo Scheduled',
            details: d.remark || 'No details provided.',
            createdBy: d.scheduled_by,
            Icon: d.phase === 'Completed' ? CheckCircle : Video,
            color: d.phase === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800',
          }));

          // --- START OF FIX: Filter out hidden reminders before mapping them ---
          const mappedReminders: UnifiedTimelineItem[] = (Array.isArray(remindersRes) ? remindersRes : [])
            .filter(r => !r.is_hidden_from_activity_log)
            .map((r: ApiReminder) => ({
              id: `reminder-${r.id}`,
              type: 'reminder',
              date: new Date(r.remind_time),
              title: `Reminder: ${r.status}`,
              details: r.message,
              createdBy: r.assigned_to,
              Icon: Bell,
              color: r.status === 'Completed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800',
            }));
          // --- END OF FIX ---

          const combined = [...mappedActivities, ...mappedMeetings, ...mappedDemos, ...mappedReminders];
          combined.sort((a, b) => b.date.getTime() - a.date.getTime());

          setTimeline(combined);

        } catch (err) {
          console.error("Failed to fetch timeline:", err)
          setError("Failed to load a complete timeline for this lead.")
        } finally {
          setIsLoading(false)
        }
      }
      fetchTimelineData()
    }
  }, [isOpen, lead])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Full Timeline - {(lead as any)?.LedgerName || lead?.company_name}
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              (Debug ID: {Number((lead as any)?.LedgerID || (lead as any)?.ledger_id || lead?.id)})
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading timeline...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No activities found for this lead.</div>
              ) : (
                timeline.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={item.color}>
                          <item.Icon className="h-4 w-4" />
                          <span className="ml-1 capitalize">{item.title}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">by {item.createdBy}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDateTime(item.date.toISOString())}</span>
                    </div>
                    {item.details && <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.details}</p>}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}