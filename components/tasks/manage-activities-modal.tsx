"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { api, ApiTask, ApiActivity } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
// --- START OF CHANGE: Import Timer icon ---
import { Loader2, ListTodo, Calendar as CalendarIcon, Search, Timer } from "lucide-react"
// --- END OF CHANGE ---
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatDateTime } from "@/lib/date-format"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ManageActivitiesModalProps {
    task: ApiTask | null;
    isOpen: boolean;
    isCompleting: boolean; // Differentiates between "Attach" and "Complete" mode
    onClose: () => void;
    onSuccess: () => void;
}

export function ManageActivitiesModal({ task, isOpen, isCompleting, onClose, onSuccess }: ManageActivitiesModalProps) {
    const [allActivities, setAllActivities] = useState<Record<string, ApiActivity[]>>({});
    const [filteredActivities, setFilteredActivities] = useState<Record<string, ApiActivity[]>>({});
    const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());
    const [remark, setRemark] = useState(""); // State for remark
    const [isLoading, setIsLoading] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [searchTerm, setSearchTerm] = useState("");

    const linkedLeads = useMemo(() => {
        if (!task) return [];
        // Handle single lead_id
        if (task.lead_id && task.company_names) {
            return [{ id: task.lead_id, name: task.company_names }];
        }
        // Legacy: Handle multiple lead_ids (backward compatibility)
        if (task.lead_ids && task.company_names) {
            const ids = task.lead_ids.split(',');
            const names = task.company_names.split(', ');
            return ids.map((id, index) => ({ id: parseInt(id), name: names[index] })).filter(lead => lead.id && lead.name);
        }
        return [];
    }, [task]);

    const fetchAllData = useCallback(async () => {
        if (!task || linkedLeads.length === 0) return;
        setIsLoading(true);
        try {
            const activityPromises = linkedLeads.map(lead => api.getActivitiesByLead(lead.id));
            const activityResults = await Promise.all(activityPromises);
            const groupedActivities: Record<string, ApiActivity[]> = {};
            activityResults.forEach((activities, index) => {
                const companyName = linkedLeads[index].name;
                if (activities.length > 0) groupedActivities[companyName] = activities;
            });
            setAllActivities(groupedActivities);
            setFilteredActivities(groupedActivities);

            const alreadyLinked = await api.getActivitiesForTask(task.id);
            setSelectedActivityIds(new Set(alreadyLinked.map(act => act.id)));

        } catch (error) {
            toast.error("Failed to fetch activities.");
        } finally {
            setIsLoading(false);
        }
    }, [task, linkedLeads]);

    useEffect(() => {
        if (isOpen) {
            fetchAllData();
            setRemark(""); // Reset remark
        } else {
            setDateRange(undefined);
            setSearchTerm("");
            setRemark("");
        }
    }, [isOpen, fetchAllData]);

    useEffect(() => {
        let newFiltered: Record<string, ApiActivity[]> = {};
        for (const companyName in allActivities) {
            let activities = allActivities[companyName];

            if (dateRange?.from) {
                activities = activities.filter(act => {
                    const actDate = new Date(act.created_at);
                    const from = new Date(dateRange.from!); from.setHours(0, 0, 0, 0);
                    const to = dateRange.to ? new Date(dateRange.to) : from; to.setHours(23, 59, 59, 999);
                    return actDate >= from && actDate <= to;
                });
            }

            if (searchTerm) {
                activities = activities.filter(act =>
                    act.details.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            if (activities.length > 0) {
                newFiltered[companyName] = activities;
            }
        }
        setFilteredActivities(newFiltered);
    }, [searchTerm, dateRange, allActivities]);


    const handleSubmit = async () => {
        if (!task) return;
        setIsLoading(true);
        try {
            if (isCompleting) {
                // Pass remark here
                await api.completeTask({
                    task_id: task.id,
                    activity_ids: Array.from(selectedActivityIds),
                    remark: remark
                });
                toast.success("Task successfully marked as complete!");
            } else {
                await api.syncTaskActivities(task.id, Array.from(selectedActivityIds));
                toast.success("Activities attached to task!");
            }
            onSuccess();
        } catch (error: any) {
            toast.error("Operation failed.", { description: error.message });
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
            <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isCompleting ? "Complete Task" : "Manage Attached Activities"}: {task?.title}</DialogTitle>
                    <DialogDescription>
                        {isCompleting
                            ? "Select the final activities performed and add a remark to complete this task."
                            : "Select activities to link to this in-progress task."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-shrink-0 flex flex-wrap items-center gap-2 py-4 border-b">
                    <div className="relative flex-grow min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Filter by date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                    </Popover>
                </div>

                <div className="flex-grow overflow-y-auto min-h-0">
                    {isLoading ? (<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>) :
                        Object.keys(filteredActivities).length > 0 ? (
                            <ScrollArea className="h-full pr-4 py-4">
                                {Object.entries(filteredActivities).map(([companyName, activities]) => (
                                    <Collapsible key={companyName} className="space-y-2 mb-2" defaultOpen={true}>
                                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm font-semibold sticky top-0 z-10">
                                            {companyName}
                                            <span className="text-xs">({activities.length} found)</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 pt-2">
                                            {activities.map(activity => (
                                                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-md">
                                                    <Checkbox id={`attach-act-${activity.id}`} className="mt-1" onCheckedChange={(checked) => handleActivitySelection(activity.id, !!checked)} checked={selectedActivityIds.has(activity.id)} />
                                                    <label htmlFor={`attach-act-${activity.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                                                        <p className="break-words">{activity.details}</p>
                                                        {/* --- START OF FIX: Display timestamp and duration --- */}
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                                            <span>{formatDateTime(activity.created_at)}</span>
                                                            {activity.duration_minutes && activity.duration_minutes > 0 && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Timer className="h-3.5 w-3.5" />
                                                                    <span>{activity.duration_minutes} min</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* --- END OF FIX --- */}
                                                    </label>
                                                </div>
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </ScrollArea>
                        ) : (
                            <div className="flex flex-col justify-center items-center h-full text-center text-sm text-muted-foreground">
                                <ListTodo className="mx-auto h-8 w-8 mb-2" />
                                <p>No activities found for the linked leads</p>
                                <p>matching your filters.</p>
                            </div>
                        )}
                </div>

                {isCompleting && (
                    <div className="p-4 border-t bg-muted/20">
                        <Label htmlFor="task-remark" className="mb-2 block font-semibold">Completion Remark (Optional)</Label>
                        <Textarea
                            id="task-remark"
                            placeholder="Add a remark about this task completion..."
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>
                )}

                <DialogFooter className="flex-shrink-0 p-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Saving..." : isCompleting ? "Confirm Completion" : `Save Links`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}