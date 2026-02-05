//frontend/app/dashboard/pipeline/page.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { simplePipelineApi, PipelineStage } from "@/lib/simple-pipeline-api"
import { Loader2, MoreVertical } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { leadApi, masterDataApi, ApiMasterData } from "@/lib/api"

export default function PipelinePage() {
    const { toast } = useToast()
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Lead Lost Dialog State
    const [showLeadLostDialog, setShowLeadLostDialog] = useState(false);
    const [leadToMarkAsLost, setLeadToMarkAsLost] = useState<{ id: number, name: string, stageId: number } | null>(null);
    const [lostReason, setLostReason] = useState("");
    const [lostReasons, setLostReasons] = useState<ApiMasterData[]>([]);

    useEffect(() => {
        loadPipeline()
        // Fetch lost reasons
        masterDataApi.getByCategory("reason").then(setLostReasons).catch(err => console.error("Failed to fetch lost reasons", err));
    }, [])

    const loadPipeline = async () => {
        try {
            setLoading(true)
            const data = await simplePipelineApi.getPipeline()
            setStages(data.stages)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleMoveLead = async (leadId: number, newStageId: number, leadName: string) => {
        const targetStage = stages.find(s => s.id === newStageId);

        // If moving to "Lost" stage (check by name or if you have a constant for Lost stage ID)
        // Since stage names are dynamic but "Lost" is standard, we check name
        console.log(`Checking if stage "${targetStage?.name}" is Lost`);
        if (targetStage?.name?.trim().toLowerCase() === "lost") {
            setLeadToMarkAsLost({ id: leadId, name: leadName, stageId: newStageId });
            setLostReason("");
            setShowLeadLostDialog(true);
            return;
        }

        try {
            await simplePipelineApi.moveLead(leadId, newStageId)
            await loadPipeline() // Reload to show updated data

            // Show success message
            toast({
                title: "Success",
                description: `✅ Moved "${leadName}" to ${targetStage?.name}`,
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: "Error moving lead: " + err.message,
                variant: "destructive"
            });
        }
    }

    const confirmMarkAsLost = async () => {
        if (!leadToMarkAsLost) return;

        if (!lostReason.trim()) {
            toast({
                title: "Validation Error",
                description: "Please provide a reason for marking the lead as lost",
                variant: "destructive"
            });
            return;
        }

        try {
            // 1. Mark as lost (updates status and reason)
            await leadApi.markLeadAsLost(leadToMarkAsLost.id, lostReason);

            // 2. Move to Lost stage (updates pipeline_stage_id)
            await simplePipelineApi.moveLead(leadToMarkAsLost.id, leadToMarkAsLost.stageId);

            await loadPipeline();

            toast({
                title: "Success",
                description: `${leadToMarkAsLost.name} has been marked as lost`
            });

            setShowLeadLostDialog(false);
            setLeadToMarkAsLost(null);
            setLostReason("");
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to mark lead as lost: " + error.message,
                variant: "destructive"
            });
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <Card className="border-red-500">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error Loading Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Sales Pipeline</h1>
                <p className="text-muted-foreground">Track your leads through the sales process</p>
            </div>

            {/* Pipeline Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {stages.map((stage) => (
                    <Card key={stage.id} className="border-t-4 flex flex-col" style={{ borderTopColor: stage.color }}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>{stage.name}</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                    {stage.count}
                                </span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                ₹{stage.value.toLocaleString()}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                            {stage.leads.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No leads
                                </p>
                            ) : (
                                stage.leads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{lead.name}</p>
                                                {lead.revenue && (
                                                    <p className="text-xs text-green-600">
                                                        ₹{lead.revenue.toLocaleString()}
                                                    </p>
                                                )}
                                                {lead.contact && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {lead.contact}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Move to Stage Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                        Move to:
                                                    </div>
                                                    {stages.map((targetStage) => {
                                                        if (targetStage.id === stage.id) return null
                                                        return (
                                                            <DropdownMenuItem
                                                                key={targetStage.id}
                                                                onClick={() => handleMoveLead(lead.id, targetStage.id, lead.name)}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{ backgroundColor: targetStage.color }}
                                                                    />
                                                                    <span>{targetStage.name}</span>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        )
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Pipeline Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Leads</p>
                            <p className="text-2xl font-bold">
                                {stages.reduce((sum, s) => sum + s.count, 0)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Expected Value</p>
                            <p className="text-2xl font-bold">
                                ₹{stages.reduce((sum, s) => (s.name !== 'Lost' ? sum + s.value : sum), 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Won</p>
                            <p className="text-2xl font-bold text-green-600">
                                {stages.find(s => s.name === 'Won')?.count || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Lost</p>
                            <p className="text-2xl font-bold text-red-600">
                                {stages.find(s => s.name === 'Lost')?.count || 0}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showLeadLostDialog} onOpenChange={setShowLeadLostDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark {leadToMarkAsLost?.name} as Lost</DialogTitle>
                        <DialogDescription>
                            Please provide a reason why this lead is being marked as lost.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="lost-reason">Reason for Loss</Label>
                            <Select
                                value={lostReason}
                                onValueChange={setLostReason}
                            >
                                <SelectTrigger id="lost-reason">
                                    <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {lostReasons.map((reason) => (
                                        <SelectItem key={reason.id} value={reason.value}>
                                            {reason.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowLeadLostDialog(false);
                                setLeadToMarkAsLost(null);
                                setLostReason("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={confirmMarkAsLost} variant="destructive">
                            Mark as Lost
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
