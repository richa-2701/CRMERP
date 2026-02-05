"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, ApiLead, ApiUser, clientApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input"; // Import Input

interface ModalProps {
    currentUser: ApiUser;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ActivityModal({ currentUser, isOpen, onClose, onSuccess }: ModalProps) {
    const { toast } = useToast();
    const [leads, setLeads] = useState<ApiLead[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ leadId: "", details: "", duration_minutes: "" });

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                api.getAllLeads(),
                clientApi.getAllClients()
            ]).then(([leadsData, clientsData]) => {
                // Map clients to match ApiLead structure (or close enough for this modal)
                const mappedClients = clientsData.map((c: any) => ({
                    id: c.id || c.LedgerID,
                    company_name: c.company_name || c.LedgerName || "",
                    // Add other fields if necessary, but id and company_name are main ones used here
                }));

                // Merge and deduplicate
                const allItems = [...leadsData, ...mappedClients];
                const uniqueItems = Array.from(new Map(allItems.map((item: any) => [item.id, item])).values());

                setLeads(uniqueItems as ApiLead[]);
            }).catch((err) => {
                console.error("Failed to fetch leads/clients", err);
                toast({ title: "Error", description: "Failed to fetch leads and clients." });
            });
        }
    }, [isOpen, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // --- START OF CHANGE: Add duration to validation ---
        const isLogAction = !formData.details.toLowerCase().includes(" on ") && !formData.details.toLowerCase().includes(" at ");
        if (!formData.leadId || !formData.details.trim() || (isLogAction && !formData.duration_minutes)) {
            toast({ title: "Error", description: "Please provide all required fields, including duration for logged activities.", variant: "destructive" });
            return;
        }
        // --- END OF CHANGE ---
        setIsLoading(true);

        const selectedLead = leads.find(lead => String(lead.id) === formData.leadId);
        if (!selectedLead) { setIsLoading(false); return; }

        let message = "";
        if (!isLogAction) {
            // It's a SCHEDULE command
            const detailsParts = formData.details.split(/( on | at )/i);
            const action = detailsParts[0].trim();
            const timeInfo = formData.details.substring(action.length).trim();
            message = `Remind me to ${action} for ${selectedLead.company_name} ${timeInfo}`;
        } else {
            // It's a LOG command - append the duration
            // NOTE: Your Python backend must be updated to parse this!
            message = `add activity for ${selectedLead.company_name}, ${formData.details}, took ${formData.duration_minutes} minutes`;
        }

        try {
            const response = await (api as any).sendMessage(message, currentUser.usernumber);
            if (response.reply.startsWith("✅") || response.reply.startsWith("👍")) {
                toast({ title: "Success", description: response.reply });
                setFormData({ leadId: "", details: "", duration_minutes: "" });
                onSuccess();
                onClose();
            } else {
                toast({ title: "Error from Bot", description: response.reply, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const isLogAction = !formData.details.toLowerCase().includes(" on ") && !formData.details.toLowerCase().includes(" at ");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log or Schedule Activity</DialogTitle>
                    <DialogDescription>Log a past event or schedule a future one. Include a date/time with "on" or "at" to schedule.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label>Lead Name *</Label>
                        <Select required value={formData.leadId} onValueChange={(value) => setFormData({ ...formData, leadId: value })}>
                            <SelectTrigger><SelectValue placeholder="Select a lead..." /></SelectTrigger>
                            <SelectContent>{leads.map(lead => <SelectItem key={lead.id} value={String(lead.id)}>{lead.company_name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {isLogAction && (
                        <div className="space-y-2">
                            <Label>Time Taken (minutes) *</Label>
                            <Input
                                type="number"
                                placeholder="e.g., 30"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Activity Details *</Label>
                        <Textarea placeholder="e.g., Called the client... OR Follow up on tomorrow at 3pm." rows={4} required value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Activity
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}