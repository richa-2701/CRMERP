"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2, Clock, PlusCircle, Timer } from "lucide-react"
import { toast } from "sonner"

import { api, ApiTask, ApiActivity } from "@/lib/api"
import { formatDateTime } from "@/lib/date-format"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ManageActivitiesModal } from "./manage-activities-modal"

interface TaskDetailModalProps {
    task: ApiTask | null;
    isOpen: boolean;
    onClose: () => void;
    onActivityAdded: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onActivityAdded }: TaskDetailModalProps) {
    const [linkedActivities, setLinkedActivities] = useState<ApiActivity[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [isManageActivitiesModalOpen, setManageActivitiesModalOpen] = useState(false);
    const router = useRouter();

    const fetchLinkedActivities = useCallback(() => {
        if (task && (task.status === 'Completed' || task.status === 'In Progress')) {
            setIsLoadingActivities(true);
            setLinkedActivities([]);
            api.getActivitiesForTask(task.id)
                .then(setLinkedActivities)
                .catch(() => toast.error("Failed to load linked activities for this task."))
                .finally(() => setIsLoadingActivities(false));
        }
    }, [task]);

    useEffect(() => {
        if (isOpen) {
            fetchLinkedActivities();
        }
    }, [isOpen, fetchLinkedActivities]);

    const linkedLeads = useMemo(() => {
        if (!task || !task.lead_ids || !task.company_names) return [];
        const ids = task.lead_ids.split(',');
        const names = task.company_names.split(', ');
        return ids.map((id, index) => ({ id: parseInt(id), name: names[index] })).filter(lead => lead.id && lead.name);
    }, [task]);

    if (!task) {
        return null;
    }

    const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
        switch (status.toLowerCase()) {
            case 'completed': return 'default';
            case 'in progress': return 'outline';
            case 'pending': return 'secondary';
            default: return 'secondary';
        }
    };

    const statusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle className="h-4 w-4 mr-2 text-green-500" />;
            case 'in progress': return <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />;
            case 'pending': return <Clock className="h-4 w-4 mr-2 text-gray-500" />;
            default: return null;
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">Task: {task.title}</DialogTitle>
                        <DialogDescription>Full details for the assigned task.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="grid grid-cols-[120px_1fr] gap-y-4 py-4 text-sm pr-6">
                            <span className="font-semibold text-right pr-4">Status</span>
                            <Badge variant={getStatusVariant(task.status)} className="capitalize w-fit">{statusIcon(task.status)} {task.status}</Badge>

                            <span className="font-semibold text-right pr-4">Due Date</span>
                            <span>{formatDateTime(task.due_date)}</span>

                            <span className="font-semibold text-right pr-4">Assigned To</span>
                            <span>{task.assigned_to_username}</span>

                            <span className="font-semibold text-right pr-4">Assigned By</span>
                            <span>{task.created_by_username}</span>

                            <span className="font-semibold text-right pr-4">Created On</span>
                            <span>{formatDateTime(task.created_at)}</span>

                            {/* --- START OF CHANGE: Display Started At and Time Taken --- */}
                            {task.started_at && (
                                <><span className="font-semibold text-right pr-4">Started At</span><span>{formatDateTime(task.started_at)}</span></>
                            )}

                            {task.completed_at && (
                                <><span className="font-semibold text-right pr-4">Completed On</span><span>{formatDateTime(task.completed_at)}</span></>
                            )}

                            {task.status === 'Completed' && task.duration_minutes != null && task.duration_minutes >= 0 && (
                                <><span className="font-semibold text-right pr-4 flex items-center justify-end gap-2">
                                    <Timer className="h-4 w-4 text-muted-foreground" />
                                    Time Taken
                                </span><span>{task.duration_minutes} minutes</span></>
                            )}

                            {task.remark && (
                                <><span className="font-semibold text-right pr-4">Completion Remark</span>
                                    <span className="whitespace-pre-wrap">{task.remark}</span></>
                            )}
                            {/* --- END OF CHANGE --- */}

                            <span className="font-semibold text-right pr-4 self-start">Linked Leads</span>
                            <div className="flex flex-wrap gap-2">
                                {linkedLeads.length > 0 ? (
                                    linkedLeads.map(lead => (
                                        <Button key={lead.id} variant="link" className="p-0 h-auto" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>{lead.name}</Button>
                                    ))
                                ) : <span>N/A</span>}
                            </div>

                            <span className="font-semibold text-right pr-4 self-start">Details</span>
                            <p className="bg-muted/50 p-3 rounded-md col-span-1 whitespace-pre-wrap">{task.details || "No additional details provided."}</p>

                            {(task.status === 'Completed' || task.status === 'In Progress') && (
                                <>
                                    <span className="font-semibold text-right pr-4 self-start mt-2">Linked Activities</span>
                                    <div className="col-span-1 space-y-2 mt-2">
                                        <ScrollArea className="max-h-48 pr-2">
                                            <div className="space-y-2">
                                                {isLoadingActivities && <Loader2 className="h-4 w-4 animate-spin" />}
                                                {!isLoadingActivities && linkedActivities.length === 0 && <span className="text-xs text-muted-foreground">No activities linked to this task yet.</span>}
                                                {linkedActivities.map(activity => (
                                                    <div key={activity.id} className="p-2 border rounded-md text-xs">
                                                        <p className="font-medium">{activity.details}</p>
                                                        <p className="text-muted-foreground">{formatDateTime(activity.created_at)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        {task.status === 'In Progress' && (
                            <Button onClick={() => setManageActivitiesModalOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Manage Activities
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ManageActivitiesModal
                isOpen={isManageActivitiesModalOpen}
                isCompleting={false}
                onClose={() => setManageActivitiesModalOpen(false)}
                onSuccess={() => {
                    setManageActivitiesModalOpen(false);
                    fetchLinkedActivities();
                    onActivityAdded();
                }}
                task={task}
            />
        </>
    );
}