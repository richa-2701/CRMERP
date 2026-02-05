"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Autocomplete } from "@/components/ui/autocomplete"
import { api, ApiLead, ApiMeeting, ApiDemo } from "@/lib/api"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { FileText, ClipboardList, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input" // Import Input component

interface Event extends ApiMeeting, ApiDemo {
  type: "meeting" | "demo";
}

export default function PostEventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [leads, setLeads] = useState<ApiLead[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState("")

  const [eventType, setEventType] = useState<"meeting" | "demo">("meeting")

  const [formData, setFormData] = useState({
    event_id: "",
    lead_id: "",
    remark: "",
    // --- START OF CHANGE: Add duration_minutes to form state ---
    duration_minutes: "",
    // --- END OF CHANGE ---
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const [leadsData, meetingsData, demosData] = await Promise.all([
            api.getAllLeads(),
            api.getScheduledMeetings(),
            api.getScheduledDemos(),
        ]);

        // Normalize leads data to ensure company_name is available
        const normalizedLeads = leadsData.map(lead => ({
          ...lead,
          id: lead.LedgerID || lead.id,
          company_name: lead.LedgerName || lead.company_name || 'Unknown'
        }));

        setLeads(normalizedLeads);

        const allEvents = [
            ...meetingsData.map(m => ({ ...m, type: 'meeting' as const })),
            ...demosData.map(d => ({ ...d, type: 'demo' as const })),
        ];
        setEvents(allEvents);

      } catch (error) {
        console.error("[v0] Failed to fetch data:", error)
        toast({ title: "Error", description: "Failed to load page data. Please refresh." })
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchData()
  }, [toast])
  
  const handleInputChange = (field: string, value: string) => {
    // --- START OF CHANGE: Modified to handle duration_minutes ---
    if (field === "lead_id") {
      setFormData((prev) => ({ ...prev, lead_id: value, event_id: "", duration_minutes: prev.duration_minutes, remark: prev.remark }));
      const eventsForLead = events.filter(e => e.lead_id.toString() === value && e.type === eventType);
      if (eventsForLead.length > 0) {
        const latestEvent = eventsForLead.sort((a,b) => new Date(b.event_time || b.start_time).getTime() - new Date(a.event_time || a.start_time).getTime())[0];
        setFormData((prev) => ({ ...prev, lead_id: value, event_id: latestEvent.id.toString() }));
      }
    } else {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }
    // --- END OF CHANGE ---
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
        if (!formData.event_id || !formData.remark || !formData.duration_minutes) {
            throw new Error(`Please select a lead, provide notes, and enter the duration.`);
        }
        
        const duration = Number.parseInt(formData.duration_minutes, 10);
        if (isNaN(duration) || duration <= 0) {
            throw new Error("Please enter a valid, positive number for the duration.");
        }

        if (eventType === "meeting") {
            await api.completeMeeting({
                MeetingId: Number.parseInt(formData.event_id),
                Remark: formData.remark,
                DurationMinutes: duration, // Pass duration
            });
        } else {
            await api.completeDemo({
                DemoId: Number.parseInt(formData.event_id),
                Remark: formData.remark,
                DurationMinutes: duration, // Pass duration
            });
        }

      setConfirmationMessage(`${eventType === "meeting" ? "Meeting" : "Demo"} has been marked as done.`)
      setShowConfirmation(true)
    } catch (error) {
      console.error(`[v0] Failed to complete ${eventType}:`, error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to save notes: ${errorMessage}`, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmation = () => {
    setShowConfirmation(false)
    router.push("/dashboard")
  }

  const leadsWithEvents = leads.filter((lead) => events.some((event) => event.lead_id.toString() === lead.id.toString() && event.type === eventType));
  const leadOptions = leadsWithEvents.map((lead) => {
    // Support both company_name and LedgerName for compatibility
    const leadName = lead.company_name || (lead as any).LedgerName || 'Unknown';
    const contactInfo = lead.contacts && lead.contacts[0] ? `(${lead.contacts[0].contact_name})` : '';
    return {
      value: lead.id.toString(),
      label: `${leadName} ${contactInfo}`,
    };
  });
  
  if (isDataLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="px-1">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Post Meeting/Demo</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Record meeting or demo outcome and notes</p>
      </div>

      <Card className="border-0 sm:border shadow-none sm:shadow-sm">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Event Type</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={eventType === "meeting" ? "default" : "outline"}
              onClick={() => setEventType("meeting")}
              className="flex-1 h-9 text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Post Meeting
            </Button>
            <Button
              type="button"
              variant={eventType === "demo" ? "default" : "outline"}
              onClick={() => setEventType("demo")}
              className="flex-1 h-9 text-sm"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Post Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 sm:border shadow-none sm:shadow-sm">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">{eventType === "meeting" ? "Meeting" : "Demo"} Outcome</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            <div className="space-y-1">
              <Label htmlFor="lead_id" className="text-xs sm:text-sm">
                Lead Name *
              </Label>
              <Autocomplete
                options={leadOptions}
                value={formData.lead_id}
                onValueChange={(value) => handleInputChange("lead_id", value)}
                placeholder="Search for a lead with a scheduled event..."
                searchPlaceholder="Type to search leads..."
                emptyMessage={`No leads with scheduled ${eventType}s found.`}
                className="h-8 sm:h-10 text-sm w-full"
              />
            </div>

            {/* --- START OF CHANGE: Add duration input field --- */}
            <div className="space-y-1">
              <Label htmlFor="duration_minutes" className="text-xs sm:text-sm">
                Actual Duration (minutes) *
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                placeholder="e.g., 45"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange("duration_minutes", e.target.value)}
                required
                min="1"
                className="text-sm"
              />
            </div>
            {/* --- END OF CHANGE --- */}

            <div className="space-y-1">
              <Label htmlFor="remark" className="text-xs sm:text-sm">
                {eventType === "meeting" ? "Meeting" : "Demo"} Notes *
              </Label>
              <Textarea
                id="remark"
                placeholder={`Enter ${eventType} notes and ${eventType === "demo" ? "client feedback" : "outcomes"}...`}
                value={formData.remark}
                onChange={(e) => handleInputChange("remark", e.target.value)}
                rows={3}
                required
                className="text-sm resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading || !formData.event_id} className="flex-1 h-9 text-sm">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Notes
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 text-sm px-4">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Success"
        message={confirmationMessage}
        onConfirm={handleConfirmation}
      />
    </div>
  )
}