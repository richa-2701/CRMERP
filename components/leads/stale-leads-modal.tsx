
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { masterDataApi, type ApiMasterData } from "@/lib/api"

interface StaleLead {
    LedgerID: number
    LedgerName: string
    CreatedDate: string
    ContactPersonName: string
    MobileNo: string
    LeadStatus: string
}

interface StaleLeadsModalProps {
    isOpen: boolean
    onClose: () => void
    leads: StaleLead[]
    onMarkLost: (leadId: number, reason: string) => Promise<void>
}

export function StaleLeadsModal({ isOpen, onClose, leads, onMarkLost }: StaleLeadsModalProps) {
    const [reasons, setReasons] = useState<Record<number, string>>({})
    const [processingId, setProcessingId] = useState<number | null>(null)
    const [lostReasons, setLostReasons] = useState<ApiMasterData[]>([])

    // Fetch lost reasons on mount (or when modal opens)
    useEffect(() => {
        if (isOpen) {
            masterDataApi.getByCategory("reason").then(setLostReasons).catch(err => console.error(err));
        }
    }, [isOpen]);

    const handleReasonChange = (leadId: number, value: string) => {
        setReasons(prev => ({ ...prev, [leadId]: value }))
    }

    const handleSubmit = async (leadId: number) => {
        const reason = reasons[leadId]
        if (!reason || !reason.trim()) return

        try {
            setProcessingId(leadId)
            await onMarkLost(leadId, reason)
            // Reason and processing state will be cleaned up by parent removing the lead or unmounting
            setReasons(prev => {
                const newReasons = { ...prev };
                delete newReasons[leadId];
                return newReasons;
            })
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Pending Leads Review</DialogTitle>
                    <DialogDescription>
                        The following leads have been active for more than 30 days without conversion.
                        Please specificy a reason for the delay or mark them as lost.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 py-4">
                        {leads.length === 0 ? (
                            <p className="text-center text-muted-foreground">No pending leads to review.</p>
                        ) : (
                            leads.map((lead) => (
                                <Card key={lead.LedgerID}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-sm">{lead.LedgerName}</h4>
                                                <p className="text-xs text-muted-foreground">Created: {new Date(lead.CreatedDate).toLocaleDateString()}</p>
                                                <p className="text-xs text-muted-foreground">Status: {lead.LeadStatus}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`reason-${lead.LedgerID}`} className="text-xs">Reason for non-conversion / Loss</Label>
                                            <div className="flex gap-2 items-start">
                                                <div className="flex-1">
                                                    <Select
                                                        value={reasons[lead.LedgerID] || ""}
                                                        onValueChange={(value) => handleReasonChange(lead.LedgerID, value)}
                                                    >
                                                        <SelectTrigger id={`reason-${lead.LedgerID}`} className="h-9 w-full">
                                                            <SelectValue placeholder="Select a reason..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lostReasons.map((reason) => (
                                                                <SelectItem key={reason.id} value={reason.value}>{reason.value}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={!reasons[lead.LedgerID] || processingId === lead.LedgerID}
                                                    onClick={() => handleSubmit(lead.LedgerID)}
                                                    className="shrink-0 mt-1"
                                                >
                                                    {processingId === lead.LedgerID ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Mark Lost"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close / Review Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
