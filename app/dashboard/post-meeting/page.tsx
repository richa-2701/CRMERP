"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Autocomplete } from "@/components/ui/autocomplete"
import { api, type ApiMeeting, type ApiLead } from "@/lib/api"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input" // Import Input component

export default function PostMeetingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [allLeads, setAllLeads] = useState<ApiLead[]>([])
  const [scheduledMeetings, setScheduledMeetings] = useState<ApiMeeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [meetingType, setMeetingType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    meeting_id: "",
    lead_id: "",
    remark: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const [leadsData, meetingsData] = await Promise.all([
          api.getAllLeads(),
          api.getAllMeetings()
        ]);

        // Normalize leads data to ensure company_name is available
        const normalizedLeads = leadsData.map(lead => ({
          ...lead,
          id: lead.LedgerID || lead.id,
          company_name: lead.LedgerName || lead.company_name || 'Unknown'
        }));

        setAllLeads(normalizedLeads);
        setScheduledMeetings(meetingsData.filter(m => m.phase === 'Scheduled' || m.phase === 'Rescheduled'));

        const leadIdFromUrl = searchParams.get('leadId');
        const meetingIdFromUrl = searchParams.get('meetingId');

        if (leadIdFromUrl && meetingIdFromUrl) {
          setFormData(prev => ({
            ...prev,
            lead_id: leadIdFromUrl,
            meeting_id: meetingIdFromUrl,
          }));

          const currentMeeting = meetingsData.find(m => m.id.toString() === meetingIdFromUrl);
          if (currentMeeting && currentMeeting.meeting_type) {
            setMeetingType(currentMeeting.meeting_type);
          }
        }

      } catch (error) {
        toast({ title: "Error", description: "Failed to load scheduled meetings and leads.", variant: "destructive" });
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchData()
  }, [toast, searchParams])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "lead_id") {
      setMeetingType(null);
      const meetingsForLead = scheduledMeetings.filter((m) => String(m.lead_id) === value);
      if (meetingsForLead.length > 0) {
        const latestMeeting = meetingsForLead.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())[0];
        setFormData((prev) => ({ ...prev, meeting_id: String(latestMeeting.id) }))
        if (latestMeeting.meeting_type) {
          setMeetingType(latestMeeting.meeting_type);
        }
      } else {
        setFormData((prev) => ({ ...prev, meeting_id: "" }))
        toast({ title: "Info", description: "This lead has no currently scheduled meetings to complete." });
      }
    }
  }



  // ... (keeping useEffect as is, skipping it in this replacement to focus on handleSubmit)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const meetingData = {
        MeetingId: Number.parseInt(formData.meeting_id),
        Remark: formData.remark,
      }

      await api.completeMeeting(meetingData);
      setShowConfirmation(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to save meeting notes: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmation = () => {
    setShowConfirmation(false)
    router.push("/dashboard")
  }

  const isPrefilled = !!searchParams.get('leadId');

  const leadsWithOptions = isPrefilled
    ? allLeads.filter(l => l.id && l.id.toString() === formData.lead_id)
    : allLeads.filter(lead => lead.id && scheduledMeetings.some(meeting => String(meeting.lead_id) === String(lead.id)));

  const leadOptions = leadsWithOptions.map((lead) => ({
    value: String(lead.id),
    label: lead.company_name || 'Unknown'
  }));

  if (isDataLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Post Meeting</h1>
          <p className="text-muted-foreground">Record meeting outcome and notes</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Meeting Outcome</CardTitle>
              <CardDescription>Select the lead and enter the notes from your meeting.</CardDescription>
            </div>
            {meetingType && (
              <Badge variant="outline">{meetingType}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead Name *</Label>
              <Autocomplete
                options={leadOptions}
                value={formData.lead_id}
                onValueChange={(value) => handleInputChange("lead_id", value)}
                placeholder="Search and select a lead..."
                disabled={isPrefilled}
              />
            </div>



            <div className="space-y-2">
              <Label htmlFor="remark">Meeting Notes *</Label>
              <Textarea id="remark" placeholder="Enter meeting notes and outcomes..." value={formData.remark} onChange={(e) => handleInputChange("remark", e.target.value)} rows={5} required />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !formData.meeting_id}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Notes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmationDialog open={showConfirmation} onOpenChange={setShowConfirmation} title="Success" message="Meeting has been marked as done." onConfirm={handleConfirmation} />
    </div>
  )
}