//frontend/components/activity/activity-table.tsx
"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-format";
import { Phone, Mail, MessageSquare, CheckCircle, LucideIcon, Eye, MoreHorizontal, Edit, Trash2, Timer } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UnifiedActivity } from "@/app/dashboard/activity/page";

interface ActivityTableProps {
    activities: UnifiedActivity[];
    onMarkAsDone: (activity: UnifiedActivity) => void;
    onViewDetails: (activity: UnifiedActivity) => void;
    onViewPastActivities: (leadId: number, leadName: string) => void;
    onEdit: (activity: UnifiedActivity) => void;
    onCancel: (activity: UnifiedActivity) => void;
}

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    pending: "secondary",
    scheduled: "secondary",
    completed: "default",
    'activity logged': "default",
    qualified: "secondary",
    unqualified: "destructive",
    canceled: "destructive",
    overdue: "destructive",
    "meeting done": "outline",
    "demo done": "outline",
};

const activityTypeIcons: { [key: string]: LucideIcon } = {
    Call: Phone,
    Email: Mail,
    WhatsApp: MessageSquare,
    'Follow-up': Phone,
};

const ActivityTypeIcon = ({ type }: { type: string }) => {
    const Icon = activityTypeIcons[type] || CheckCircle;
    return <Icon className="h-4 w-4" />;
};

export function ActivityTable({ activities, onMarkAsDone, onViewDetails, onViewPastActivities, onEdit, onCancel }: ActivityTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Logged/Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {/* --- START OF CHANGE: Add Time Taken column --- */}
                    <TableHead>Time Taken</TableHead>
                    {/* --- END OF CHANGE --- */}
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {activities.map((activity) => {
                    const isActionable = activity.isActionable;

                    return (
                        <TableRow
                            key={activity.id}
                            onDoubleClick={() => onViewDetails(activity)}
                            className="cursor-pointer hover:bg-muted/50"
                        >
                            <TableCell className="font-medium">{activity.company_name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <ActivityTypeIcon type={activity.activity_type} />
                                    <span>{activity.activity_type}</span>
                                </div>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">{activity.details}</TableCell>
                            <TableCell>
                                <Badge variant={activity.logged_or_scheduled === 'Scheduled' ? "outline" : "secondary"}>
                                    {activity.logged_or_scheduled}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={statusVariantMap[activity.status.toLowerCase()] || "default"} className="capitalize">
                                    {activity.status.replace(/_/g, ' ')}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {formatDateTime(activity.date)}
                            </TableCell>
                            {/* --- START OF CHANGE: Add Time Taken cell content --- */}
                            <TableCell>
                                {activity.type === 'log' && activity.duration_minutes && activity.duration_minutes > 0 ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Timer className="h-4 w-4 text-muted-foreground" />
                                        <span>{activity.duration_minutes} min</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground ml-4">—</span>
                                )}
                            </TableCell>
                            {/* --- END OF CHANGE --- */}
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {isActionable && (
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMarkAsDone(activity);
                                            }}
                                        >
                                            Mark as Done
                                        </Button>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-8 w-8"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">More actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onClick={() => onViewDetails(activity)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                <span>View Details</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onViewPastActivities(activity.lead_id, activity.company_name)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                <span>View History</span>
                                            </DropdownMenuItem>
                                            {/* {activity.type === 'log' && (
                                                <DropdownMenuItem onClick={() => onEdit(activity)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                            )} */}
                                            <DropdownMenuItem onClick={() => onCancel(activity)} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>{activity.logged_or_scheduled === 'Scheduled' ? 'Cancel' : 'Delete'}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}