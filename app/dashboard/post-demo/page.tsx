"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Autocomplete } from "@/components/ui/autocomplete"
import { api, type ApiDemo, type ApiLead } from "@/lib/api"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input" // Import Input component

export default function PostDemoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [allLeads, setAllLeads] = useState<ApiLead[]>([])
  const [scheduledDemos, setScheduledDemos] = useState<ApiDemo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false)

  const [formData, setFormData] = useState({
    demo_id: "",
    lead_id: "",
    remark: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const [leadsData, demosData] = await Promise.all([
          api.getAllLeads(),
          api.getScheduledDemos()
        ]);

        // Normalize leads data to ensure company_name is available
        const normalizedLeads = leadsData.map(lead => ({
          ...lead,
          id: lead.LedgerID || lead.id,
          company_name: lead.LedgerName || lead.company_name || 'Unknown'
        }));

        setAllLeads(normalizedLeads);
        setScheduledDemos(demosData);

        const leadIdFromUrl = searchParams.get('leadId');
        const demoIdFromUrl = searchParams.get('demoId');

        if (leadIdFromUrl && demoIdFromUrl) {
          setFormData(prev => ({
            ...prev,
            lead_id: leadIdFromUrl,
            demo_id: demoIdFromUrl,
          }));
        }

      } catch (error) {
        toast({ title: "Error", description: "Failed to load scheduled demos and leads.", variant: "destructive" });
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchData()
  }, [toast, searchParams])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "lead_id") {
      const demosForLead = scheduledDemos.filter((d) => String(d.lead_id) === value);
      if (demosForLead.length > 0) {
        const latestDemo = demosForLead.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
        setFormData((prev) => ({ ...prev, demo_id: String(latestDemo.id) }))
      } else {
        setFormData((prev) => ({ ...prev, demo_id: "" }))
        toast({ title: "Info", description: "This lead has no currently scheduled demos to complete." });
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const demoData = {
        DemoId: Number.parseInt(formData.demo_id),
        Remark: formData.remark,
      }

      await api.completeDemo(demoData);
      setShowConfirmation(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to save demo notes: ${errorMessage}`, variant: "destructive" });
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
    : allLeads.filter(lead => scheduledDemos.some(demo => String(demo.lead_id) === String(lead.id)));

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
          <h1 className="text-3xl font-bold tracking-tight">Post Demo</h1>
          <p className="text-muted-foreground">Record demo outcome and notes</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Demo Outcome</CardTitle>
          <CardDescription>Select the lead and enter the notes from your demo.</CardDescription>
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
              <Label htmlFor="remark">Demo Notes *</Label>
              <Textarea id="remark" placeholder="Enter demo notes and client feedback..." value={formData.remark} onChange={(e) => handleInputChange("remark", e.target.value)} rows={5} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !formData.demo_id}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Notes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <ConfirmationDialog open={showConfirmation} onOpenChange={setShowConfirmation} title="Success" message="Demo has been marked as done." onConfirm={handleConfirmation} />
    </div>
  )
}