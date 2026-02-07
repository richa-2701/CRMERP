"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-format";
import { Phone, Mail, MessageSquare, CheckCircle, Download, FileText, Timer, Loader2 } from "lucide-react";
import type { UnifiedActivity } from "@/app/dashboard/activity/page";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ActivityDetailModalProps {
    activity: UnifiedActivity | null;
    isOpen: boolean;
    onClose: () => void;
}

const activityTypeIcons: { [key: string]: React.ElementType } = {
    Call: Phone,
    Email: Mail,
    WhatsApp: MessageSquare,
    'Follow-up': Phone,
    default: CheckCircle
};

const isBrowserPreviewable = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'txt'].includes(extension);
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.split('/api')[0] || "http://localhost:57214";

export function ActivityDetailModal({ activity, isOpen, onClose }: ActivityDetailModalProps) {
    const [fetchedAttachmentPath, setFetchedAttachmentPath] = useState<string | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Reset state when modal opens/changes activity
    useEffect(() => {
        if (!isOpen || !activity) {
            setFetchedAttachmentPath(null);
            setIsLoadingDetails(false);
            return;
        }

        // Check if we need to fetch details (e.g. if attachment path is missing but expected)
        // Since we know the listing API omits attachment_path, we should fetch if it's a LOG.
        const raw = activity.raw_activity as any;
        const currentPath = raw.attachment_path || raw.AttachmentPath;

        if (activity.type === 'log' && !currentPath) {
            fetchFullDetails(activity.lead_id, activity.id);
        } else {
            setFetchedAttachmentPath(currentPath);
        }
    }, [isOpen, activity]);

    const fetchFullDetails = async (leadId: number, activityId: number | string) => {
        setIsLoadingDetails(true);
        try {
            // Fetch ALL activities for this lead to find the one with the attachment
            const activities = await api.getActivitiesByLead(leadId);

            // Normalize ID: The main list might use 'log-79' string ID, while GetByLead returns numeric 79.
            // We extract just the numbers to be safe.
            const targetNumericId = String(activityId).replace(/\D/g, '');

            // Look for matching ID
            const match = activities.find((a: any) => {
                const currentId = String(a.id);
                return currentId === targetNumericId;
            });

            if (match && match.attachment_path) {
                setFetchedAttachmentPath(match.attachment_path);
            } else {
                // No match found or no attachment path. Match object:
            }
        } catch (err) {
            console.error("Failed to fetch activity details", err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    if (!activity) return null;

    const Icon = activityTypeIcons[activity.activity_type] || activityTypeIcons.default;
    const isScheduled = activity.logged_or_scheduled === 'Scheduled';
    const attachmentPath = fetchedAttachmentPath;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        Activity Details for {activity.company_name}
                    </DialogTitle>
                    <DialogDescription>
                        {isScheduled ? "Details of the scheduled activity." : "Details of the logged activity."}
                    </DialogDescription>
                </DialogHeader>
                {/* --- START OF FIX: Removed max-h and overflow classes from the main grid container --- */}
                <div className="grid grid-cols-[120px_1fr] gap-y-4 py-4 text-sm pr-4">
                    <span className="font-semibold text-right pr-4">Status</span>
                    <Badge variant={activity.status.toLowerCase() === 'pending' || activity.status.toLowerCase() === 'scheduled' ? 'secondary' : 'default'} className="capitalize w-fit">
                        {activity.status.replace(/_/g, ' ')}
                    </Badge>

                    <span className="font-semibold text-right pr-4">Activity Type</span>
                    <span>{activity.activity_type}</span>

                    {/* --- START OF CHANGE: Handle Merged (Completed Scheduled Activity) View --- */}
                    {activity.original_scheduled_date ? (
                        <>
                            <span className="font-semibold text-right pr-4">Scheduled For</span>
                            <span>{formatDateTime(activity.original_scheduled_date)}</span>

                            {activity.original_created_at && (
                                <>
                                    <span className="font-semibold text-right pr-4">Created On</span>
                                    <span>{formatDateTime(activity.original_created_at)}</span>
                                </>
                            )}

                            {activity.original_created_by && (
                                <>
                                    <span className="font-semibold text-right pr-4">Created By</span>
                                    <span>{activity.original_created_by}</span>
                                </>
                            )}

                            <span className="font-semibold text-right pr-4">Completed On</span>
                            <span>{formatDateTime(activity.date)}</span>

                            {activity.type === 'log' && activity.duration_minutes && activity.duration_minutes > 0 && (
                                <>
                                    <span className="font-semibold text-right pr-4 flex items-center justify-end gap-2">
                                        <Timer className="h-4 w-4 text-muted-foreground" />
                                        Time Taken
                                    </span>
                                    <span>{activity.duration_minutes} minutes</span>
                                </>
                            )}

                            <span className="font-semibold text-right pr-4 self-start">Details</span>
                            <div className="bg-muted/50 p-2 rounded-md col-span-1 max-h-32 overflow-y-auto">
                                <p className="whitespace-pre-wrap break-words text-muted-foreground">
                                    {activity.original_details || "No details provided."}
                                </p>
                            </div>

                            <span className="font-semibold text-right pr-4 self-start">Outcome</span>
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-md col-span-1 max-h-48 overflow-y-auto border border-green-100 dark:border-green-800">
                                <p className="whitespace-pre-wrap break-words">
                                    {activity.details}
                                </p>
                            </div>
                        </>
                    ) : (
                        /* --- Standard View for Single Activities --- */
                        <>
                            <span className="font-semibold text-right pr-4">
                                {isScheduled ? "Scheduled For" : "Logged On"}
                            </span>
                            <span>{formatDateTime(activity.date)}</span>

                            {isScheduled && activity.raw_activity.created_at && (
                                <>
                                    <span className="font-semibold text-right pr-4">Created On</span>
                                    <span>{formatDateTime(activity.raw_activity.created_at)}</span>
                                </>
                            )}

                            {((activity.raw_activity as any).created_by || (activity.raw_activity as any).scheduled_by) && (
                                <>
                                    <span className="font-semibold text-right pr-4">Created By</span>
                                    <span>{(activity.raw_activity as any).created_by || (activity.raw_activity as any).scheduled_by}</span>
                                </>
                            )}

                            {activity.type === 'log' && activity.duration_minutes && activity.duration_minutes > 0 && (
                                <>
                                    <span className="font-semibold text-right pr-4 flex items-center justify-end gap-2">
                                        <Timer className="h-4 w-4 text-muted-foreground" />
                                        Time Taken
                                    </span>
                                    <span>{activity.duration_minutes} minutes</span>
                                </>
                            )}

                            <span className="font-semibold text-right pr-4 self-start">Details</span>
                            <div className="bg-muted/50 p-2 rounded-md col-span-1 max-h-48 overflow-y-auto">
                                <p className="whitespace-pre-wrap break-words">
                                    {activity.details}
                                </p>
                            </div>
                        </>
                    )}
                    {/* --- END OF CHANGE --- */}

                    {isLoadingDetails && (
                        <div className="col-span-2 flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                            <span className="text-xs text-muted-foreground">Checking for attachments...</span>
                        </div>
                    )}
                    {attachmentPath && (
                        <>
                            <span className="font-semibold text-right pr-4 self-start">Attachment</span>
                            <div className="col-span-1 space-y-2">
                                {isBrowserPreviewable(attachmentPath) ? (
                                    <iframe
                                        src={`${BASE_URL}${attachmentPath}`}
                                        title="Attachment Preview"
                                        className="w-full h-48 rounded-md border bg-white"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                                        <FileText className="h-5 w-5 flex-shrink-0" />
                                        <span className="text-sm truncate">{attachmentPath.split('/').pop()}</span>
                                    </div>
                                )}
                                <Button asChild variant="secondary" size="sm">
                                    <a href={`${BASE_URL}${attachmentPath}`} download target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}