//frontend/app/dashboard/activity/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PastActivitiesModal } from "@/components/activity/past-activities-modal";
import { ApiUser, ApiActivity, ApiReminder, api, ApiMeeting, ApiDemo, ApiLead } from "@/lib/api";
import { Loader2, PlusCircle, CalendarPlus, LayoutGrid, List, Search, Filter, Eye, Phone, CheckCircle, MessageSquare } from "lucide-react";
import { ActivityCard } from "@/components/activity/activity-card";
import { ActivityTable } from "@/components/activity/activity-table";
import { MarkAsDoneModal } from "@/components/activity/mark-as-done-modal";
import { LogActivityModal } from "@/components/activity/log-activity-modal";
import { ScheduleActivityModal } from "@/components/activity/schedule-activity-modal";
import { ActivityDetailModal } from "@/components/activity/activity-detail-modal";
import { formatDateTime, parseAsUTCDate } from "@/lib/date-format";


export interface UnifiedActivity {
    id: string;
    type: 'log' | 'reminder' | 'meeting' | 'demo';
    lead_id: number;
    company_name: string;
    activity_type: string;
    details: string;
    logged_or_scheduled: 'Logged' | 'Scheduled';
    status: string;
    date: string;
    creation_date: string;
    isActionable: boolean;
    raw_activity: ApiActivity | ApiReminder | ApiMeeting | ApiDemo;
    duration_minutes?: number;
}

function EditActivityModal({
    isOpen,
    onClose,
    activity,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    activity: UnifiedActivity | null;
    onSuccess: () => void;
}) {
    const [details, setDetails] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (activity) {
            setDetails(activity.details);
        }
    }, [activity]);

    const handleSubmit = async () => {
        if (!activity || !details.trim()) {
            toast({ title: "Error", description: "Details cannot be empty.", variant: "destructive" });
            return;
        }

        if (activity.type !== 'log') {
            toast({ title: "Action Not Supported", description: "Only logged activities can be edited." });
            return;
        }

        setIsLoading(true);
        try {
            await api.updateLoggedActivity((activity.raw_activity as ApiActivity).id, { details });
            toast({ title: "Success", description: "Activity has been updated." });
            onSuccess();
        } catch (error) {
            console.error("Failed to update activity:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not update the activity.";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !activity) return null;

    const canBeEdited = activity.type === 'log';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Activity</DialogTitle>
                    <DialogDescription>
                        {canBeEdited
                            ? `Update the details for the activity with ${activity.company_name}.`
                            : `This activity type (${activity.type}) cannot be edited directly.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="activity-details">Activity Details</Label>
                        <Textarea
                            id="activity-details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={5}
                            placeholder="Enter the updated activity notes..."
                            disabled={!canBeEdited}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !canBeEdited}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CancelActivityModal({
    isOpen,
    onClose,
    activity,
    onSuccess,
    currentUser,
}: {
    isOpen: boolean;
    onClose: () => void;
    activity: UnifiedActivity | null;
    onSuccess: () => void;
    currentUser: ApiUser | null;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [reason, setReason] = useState("");

    if (!isOpen || !activity) return null;

    const isScheduled = activity.type === 'reminder' || activity.type === 'meeting' || activity.type === 'demo';
    const title = isScheduled ? "Cancel Scheduled Activity" : "Delete Logged Activity";
    const description = `Are you sure you want to ${isScheduled ? 'cancel this activity' : 'delete this activity log'} for ${activity.company_name}? This action cannot be undone.`;

    const handleConfirm = async () => {
        setIsLoading(true);

        try {
            if (activity.type === 'reminder' && typeof activity.raw_activity.id === 'number') {
                await api.cancelReminder(activity.raw_activity.id);
            } else if (activity.type === 'log' && typeof activity.raw_activity.id === 'number') {
                await api.deleteLoggedActivity(activity.raw_activity.id, reason || "No reason provided");
            } else if ((activity.type === 'meeting' || activity.type === 'demo') && typeof activity.raw_activity.id === 'number') {
                // Keep frontend recover logic tag
                const metadataTag = `[LEAD:${activity.lead_id}:${activity.company_name}]`;
                const enhancedReason = `${metadataTag} ${reason || "No reason provided"}`;

                await api.cancelEvent(activity.type, activity.raw_activity.id, {
                    reason: enhancedReason,
                    updated_by: currentUser?.username || "System",
                    lead_id: activity.lead_id
                });
            } else {
                toast({ title: "Not Implemented", description: "Canceling this activity type is not yet supported." });
            }
            toast({ title: "Success", description: "Activity has been updated/removed." });
            onSuccess();
        } catch (error) {
            console.error("Failed to remove activity:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not remove the activity.";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setReason("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {/* Show reason input for all types now, as cancelEvent requires a reason */}
                <div className="py-4">
                    <Label htmlFor="delete-reason">Reason for {isScheduled ? 'Cancellation' : 'Deletion'} (Optional)</Label>
                    <Textarea id="delete-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Client unavailable." />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>No, keep it</Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, {isScheduled ? 'Cancel It' : 'Delete It'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function ActivityPage() {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [allActivities, setAllActivities] = useState<UnifiedActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activityToComplete, setActivityToComplete] = useState<ApiReminder | null>(null);
    const [isLogModalOpen, setLogModalOpen] = useState(false);
    const [activityToView, setActivityToView] = useState<UnifiedActivity | null>(null);
    const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [isDoneModalOpen, setDoneModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

    // Server-Side State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "today" | "scheduled" | "completed" | "overdue" | "canceled">('all');

    const router = useRouter();
    const { toast } = useToast();
    const [isPastActivitiesModalOpen, setPastActivitiesModalOpen] = useState(false);
    const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<{ id: number; name: string } | null>(null);
    const [activityToEdit, setActivityToEdit] = useState<UnifiedActivity | null>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [activityToCancel, setActivityToCancel] = useState<UnifiedActivity | null>(null);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);

    // Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset page 1 on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Load Data
    const loadActivities = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.getActivitiesPaginated(
                currentPage,
                pageSize,
                debouncedSearchTerm,
                activeFilter
            );

            // Mapper NOT needed if backend returns UnifiedActivity compatible shape, 
            // but we must ensure `raw_activity` and types are correct for Modals to work.
            // Backend returns: numericId, id(string), type, lead_id, company_name, activity_type, details, status, date...

            const mappedData: UnifiedActivity[] = response.data.map((item: any, index: number) => {
                if (index === 0) console.log("Raw Activity Item from API:", item);
                // Construct a raw_activity object so modals don't crash
                // This is a minimal reconstruction. If modals need more specific fields (like meeting end_time), 
                // we might need to fetch details or trust what we have.
                const rawBase = {
                    id: item.numericId,
                    lead_id: item.lead_id,
                    created_at: item.creation_date,
                    remind_time: item.remind_time,
                    start_time: item.event_time,
                    end_time: item.event_end_time,
                    agenda: item.remark, // Map remark to agenda if needed
                    remark: item.remark,
                    message: item.message,
                    status: item.status, // or item.phase 
                    phase: item.phase,
                    activity_type: item.activity_type,
                    company_name: item.company_name,
                    assigned_to: item.assigned_to,
                    meeting_type: item.meeting_type,
                    created_by: item.created_by,
                    scheduled_by: item.scheduled_by
                };

                // Helper to determine actionability
                let isActionable = false;
                const lowerStatus = (item.status || "").toLowerCase();
                const isScheduledType = ['meeting', 'demo', 'reminder'].includes(item.type);
                if (isScheduledType && (lowerStatus === 'pending' || lowerStatus === 'scheduled')) {
                    // Check if overdue? 
                    // For now, rely on backend status or simplifed check
                    isActionable = true;
                }
                if (lowerStatus === 'overdue') isActionable = true;


                return {
                    id: item.id || item.numericId || item.NumericId || item.numeric_id,
                    type: item.type, // 'log' | 'reminder' | 'meeting' | 'demo'
                    lead_id: item.lead_id,
                    company_name: item.company_name,
                    activity_type: item.activity_type,
                    details: item.details,
                    logged_or_scheduled: item.logged_or_scheduled,
                    status: item.status,
                    date: item.date,
                    creation_date: item.date,
                    isActionable: isActionable,
                    raw_activity: rawBase as any, // Cast to satisfy type, modals should be careful
                    duration_minutes: item.duration_minutes
                };
            });

            setAllActivities(mappedData);
            setTotalCount(response.total);
        } catch (error) {
            console.error("Failed to load activities:", error);
            // toast({ title: "Error", description: "Failed to load activities.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, debouncedSearchTerm, activeFilter, toast]);

    useEffect(() => {
        const userDataString = localStorage.getItem("user");
        if (!userDataString) {
            router.push("/login");
            return;
        }
        const loggedInUser = JSON.parse(userDataString);
        setUser(loggedInUser);
    }, [router]);

    useEffect(() => {
        if (user) {
            loadActivities();
        }
    }, [user, loadActivities]);


    const handleMarkAsDoneClick = (activity: UnifiedActivity) => {
        if (activity.type === 'reminder') {
            // Need cast, raw_activity was reconstructed
            setActivityToComplete(activity.raw_activity as ApiReminder);
            setDoneModalOpen(true);
        } else {
            toast({ title: "Action Not Applicable", description: "This type of activity cannot be marked as done from here." });
        }
    };

    const handleViewDetailsClick = (activity: UnifiedActivity) => {
        setActivityToView(activity);
        setDetailModalOpen(true);
    };

    const handleViewPastActivitiesClick = (leadId: number, leadName: string) => {
        setSelectedLeadForHistory({ id: leadId, name: leadName });
        setPastActivitiesModalOpen(true);
    };

    const handleEditClick = (activity: UnifiedActivity) => {
        if (activity.type !== 'log') {
            toast({
                title: "Action Not Available",
                description: "Only logged activities can be edited. Scheduled activities must be rescheduled or canceled.",
                variant: "default"
            });
            return;
        }
        setActivityToEdit(activity);
        setEditModalOpen(true);
    };

    const handleCancelClick = (activity: UnifiedActivity) => {
        setActivityToCancel(activity);
        setCancelModalOpen(true);
    };


    const handleSuccess = () => {
        setLogModalOpen(false);
        setScheduleModalOpen(false);
        setDoneModalOpen(false);
        setEditModalOpen(false);
        setCancelModalOpen(false);
        loadActivities(); // Reload server data
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    if (isLoading && !allActivities.length) { // Only show skeleton on first load or empty
        return (
            <div className="space-y-4 md:space-y-6 px-3 sm:px-4 md:px-0">
                {/* Page header skeleton */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                        <div className="h-4 w-80 bg-muted rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="h-96 w-full bg-muted rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        {/* <h1 className="text-3xl font-bold tracking-tight">Activity Management</h1> */}
                        <p className="text-muted-foreground">Log, schedule, and complete activities with your leads.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setLogModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Log an Activity</Button>
                        <Button onClick={() => setScheduleModalOpen(true)}><CalendarPlus className="mr-2 h-4 w-4" />Schedule a Reminder</Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-4">
                            <div className="flex flex-row items-center gap-2 w-full md:w-auto md:flex-1 md:max-w-sm">
                                <div className="relative flex-1 min-w-0">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search activities..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 w-full"
                                    />
                                </div>
                                <div className="md:hidden flex items-center justify-end gap-1 flex-shrink-0">
                                    {/* Mobile Actions could go here */}
                                    {/* Reusing existing filter structure for mobile but adapted */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="h-4 w-4" /></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-4" align="end">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">Status</h4>
                                                    <RadioGroup value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="flex flex-col space-y-2">
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all-mobile" /><Label htmlFor="all-mobile">All</Label></div>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="today" id="today-mobile" /><Label htmlFor="today-mobile">Today</Label></div>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="scheduled" id="scheduled-mobile" /><Label htmlFor="scheduled-mobile">Scheduled</Label></div>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="completed" id="completed-mobile" /><Label htmlFor="completed-mobile">Completed</Label></div>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="overdue" id="overdue-mobile" /><Label htmlFor="overdue-mobile">Overdue</Label></div>
                                                    </RadioGroup>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
                                <RadioGroup value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all-desktop" /><Label htmlFor="all-desktop">All</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="today" id="today-desktop" /><Label htmlFor="today-desktop">Today</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="scheduled" id="scheduled-desktop" /><Label htmlFor="scheduled-desktop">Scheduled</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="completed" id="completed-desktop" /><Label htmlFor="completed-desktop">Completed</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="overdue" id="overdue-desktop" /><Label htmlFor="overdue-desktop">Overdue</Label></div>
                                </RadioGroup>
                                <div className="flex items-center gap-2">
                                    <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('card')}><LayoutGrid className="h-4 w-4" /></Button>
                                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {allActivities.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">No activities match your current filters.</div>
                        ) : viewMode === 'list' ? (
                            <div className="overflow-x-auto">
                                <ActivityTable
                                    activities={allActivities}
                                    onMarkAsDone={handleMarkAsDoneClick}
                                    onViewDetails={handleViewDetailsClick}
                                    onViewPastActivities={handleViewPastActivitiesClick}
                                    onEdit={handleEditClick}
                                    onCancel={handleCancelClick}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {allActivities.map(activity => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onMarkAsDone={handleMarkAsDoneClick}
                                        onViewDetails={handleViewDetailsClick}
                                        onViewPastActivities={handleViewPastActivitiesClick}
                                        onEdit={handleEditClick}
                                        onCancel={handleCancelClick}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Server-Side Pagination Controls */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="page-size" className="text-sm text-muted-foreground">Rows per page</Label>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(value) => {
                                        setPageSize(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger id="page-size" className="w-20 h-9">
                                        <SelectValue placeholder={pageSize} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 30, 100, 200].map(size => (
                                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages || 1} ({totalCount} items)
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage >= totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {user && (
                <>
                    <LogActivityModal currentUser={user} isOpen={isLogModalOpen} onClose={() => setLogModalOpen(false)} onSuccess={handleSuccess} />
                    <ScheduleActivityModal currentUser={user} isOpen={isScheduleModalOpen} onClose={() => setScheduleModalOpen(false)} onSuccess={handleSuccess} />
                    <MarkAsDoneModal activity={activityToComplete} currentUser={user} isOpen={isDoneModalOpen} onClose={() => setDoneModalOpen(false)} onSuccess={handleSuccess} />
                    <ActivityDetailModal
                        activity={activityToView}
                        isOpen={isDetailModalOpen}
                        onClose={() => setDetailModalOpen(false)}
                    />
                    <PastActivitiesModal
                        isOpen={isPastActivitiesModalOpen}
                        onClose={() => setPastActivitiesModalOpen(false)}
                        leadId={selectedLeadForHistory?.id ?? null}
                        leadName={selectedLeadForHistory?.name ?? null}
                    />
                    <EditActivityModal
                        isOpen={isEditModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        activity={activityToEdit}
                        onSuccess={handleSuccess}
                    />
                    <CancelActivityModal
                        isOpen={isCancelModalOpen}
                        onClose={() => setCancelModalOpen(false)}
                        activity={activityToCancel}
                        onSuccess={handleSuccess}
                        currentUser={user}
                    />
                </>
            )}
        </>
    );
}