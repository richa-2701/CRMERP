//frontend/components/tasks/attach-activity-modal.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { api, ApiTask, ApiActivity } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ListTodo, Calendar as CalendarIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatDateTime } from "@/lib/date-format"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

interface AttachActivityModalProps {
    task: ApiTask | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AttachActivityModal({ task, isOpen, onClose, onSuccess }: AttachActivityModalProps) {
    const [activitiesByLead, setActivitiesByLead] = useState<Record<string, ApiActivity[]>>({});
    const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const linkedLeads = useMemo(() => {
        if (!task || !task.lead_ids || !task.company_names) return [];
        const ids = task.lead_ids.split(',');
        const names = task.company_names.split(', ');
        return ids.map((id, index) => ({ id: parseInt(id), name: names[index] })).filter(lead => lead.id && lead.name);
    }, [task]);

    const fetchActivities = useCallback(async () => {
        if (!task || linkedLeads.length === 0) return;
        setIsLoading(true);
        try {
            const activityPromises = linkedLeads.map(lead => 
                api.getFilteredActivitiesForLead({
                    lead_id: lead.id,
                    start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                    end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
                })
            );
            const results = await Promise.all(activityPromises);
            const groupedActivities: Record<string, ApiActivity[]> = {};
            results.forEach((activities, index) => {
                const companyName = linkedLeads[index].name;
                if (activities.length > 0) {
                    groupedActivities[companyName] = activities;
                }
            });
            setActivitiesByLead(groupedActivities);
        } catch (error) {
            toast.error("Failed to fetch activities.");
        } finally {
            setIsLoading(false);
        }
    }, [task, linkedLeads, dateRange]);

    useEffect(() => {
        if (isOpen) {
            fetchActivities();
            setSelectedActivityIds(new Set());
        } else {
            setDateRange(undefined);
        }
    }, [isOpen, fetchActivities]);

    const handleAttach = async () => {
        if (!task || selectedActivityIds.size === 0) {
            toast.warning("Please select at least one activity to attach.");
            return;
        }
        setIsLoading(true);
        try {
            await api.linkActivitiesToTask(task.id, Array.from(selectedActivityIds));
            toast.success("Activities attached successfully!");
            onSuccess();
        } catch (error: any) {
            toast.error("Failed to attach activities.", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivitySelection = (activityId: number, isSelected: boolean) => {
        setSelectedActivityIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) newSet.add(activityId);
            else newSet.delete(activityId);
            return newSet;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Attach Activities to Task: {task?.title}</DialogTitle>
                    <DialogDescription>Select existing activities to link to this in-progress task.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                        </Popover>
                        <Button onClick={fetchActivities}>Filter</Button>
                    </div>

                    {isLoading ? (<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>) : 
                    Object.keys(activitiesByLead).length > 0 ? (
                        <ScrollArea className="max-h-80 pr-4">
                            {Object.entries(activitiesByLead).map(([companyName, activities]) => (
                                <Collapsible key={companyName} className="space-y-2 mb-2" defaultOpen={true}>
                                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm font-semibold">
                                        {companyName}
                                        <span className="text-xs">({activities.length} activities)</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 pt-2">
                                        {activities.map(activity => (
                                            <div key={activity.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                                <Checkbox id={`attach-act-${activity.id}`} onCheckedChange={(checked) => handleActivitySelection(activity.id, !!checked)} checked={selectedActivityIds.has(activity.id)} />
                                                <label htmlFor={`attach-act-${activity.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                                                    <p>{activity.details}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDateTime(activity.created_at)}</p>
                                                </label>
                                            </div>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </ScrollArea>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            <ListTodo className="mx-auto h-8 w-8 mb-2" />
                            No activities found for the linked leads in the selected date range.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAttach} disabled={isLoading || selectedActivityIds.size === 0}>
                        {isLoading ? "Attaching..." : `Attach ${selectedActivityIds.size} Activities`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}