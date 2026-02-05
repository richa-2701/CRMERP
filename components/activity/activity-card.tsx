//frontend/components/activity/activity-card.tsx
"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-format";
import { Clock, CheckCircle, Phone, Mail, MessageSquare, Eye, LucideIcon, MoreHorizontal, Edit, Trash2, Timer } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UnifiedActivity } from "@/app/dashboard/activity/page";

interface ActivityCardProps {
    activity: UnifiedActivity;
    onMarkAsDone: (activity: UnifiedActivity) => void;
    onViewDetails: (activity: UnifiedActivity) => void;
    onViewPastActivities: (leadId: number, leadName: string) => void;
    onEdit: (activity: UnifiedActivity) => void;
    onCancel: (activity: UnifiedActivity) => void;
}

const activityTypeIcons: { [key: string]: LucideIcon } = {
    Call: Phone,
    Email: Mail,
    WhatsApp: MessageSquare,
    'Follow-up': Phone,
    default: CheckCircle
};

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    pending: "secondary",
    sent: "secondary",
    completed: "default",
    new: "default",
    qualified: "secondary",
    unqualified: "destructive",
    Canceled: "destructive",
    not_our_segment: "destructive",
    Overdue: "destructive",
    "Meeting Done": "outline",
    "Demo Done": "outline",
    "Discussion Done": "outline",
};

export function ActivityCard({ activity, onMarkAsDone, onViewDetails, onViewPastActivities, onEdit, onCancel }: ActivityCardProps) {
    const isActionable = activity.isActionable;
    const Icon = activityTypeIcons[activity.activity_type as keyof typeof activityTypeIcons] || activityTypeIcons.default;

    return (
        <Card className="flex flex-col justify-between shadow-sm hover:shadow-lg transition-shadow duration-200 border rounded-lg overflow-hidden h-full">
            <div className="flex-grow">
                <CardHeader className="p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-shrink-0 bg-primary/10 text-primary p-1.5 rounded-full">
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-grow min-w-0 mr-1">
                            <CardTitle
                                className="text-sm font-semibold cursor-pointer hover:underline break-words leading-tight line-clamp-2"
                                onClick={() => onViewDetails(activity)}
                                title={activity.company_name}
                            >
                                {activity.company_name}
                            </CardTitle>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                            <Badge variant={statusVariantMap[activity.status] || "default"} className="capitalize text-[10px] px-1.5 py-0 font-medium whitespace-nowrap">
                                {activity.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground capitalize font-medium">
                                {activity.activity_type}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent
                    className="px-3 pb-3 cursor-pointer"
                    onClick={() => onViewDetails(activity)}
                >
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {activity.details}
                    </p>
                </CardContent>
            </div>

            <CardFooter className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 py-2 px-3 border-t">
                {/* --- START OF FIX: Updated footer to include duration --- */}
                <div className="text-[10px] text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1">
                        {activity.logged_or_scheduled === 'Scheduled' ? (
                            <Clock className="h-3 w-3" />
                        ) : (
                            <CheckCircle className="h-3 w-3" />
                        )}
                        <span>{formatDateTime(activity.date)}</span>
                    </div>

                    {activity.duration_minutes && activity.duration_minutes > 0 && (
                        <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            <span>{activity.duration_minutes}m</span>
                        </div>
                    )}
                </div>
                {/* --- END OF FIX --- */}

                <div className="flex items-center gap-0.5 ml-1">
                    {isActionable ? (
                        <Button size="icon" variant="ghost" onClick={() => onMarkAsDone(activity)} className="h-6 w-6">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onViewPastActivities(activity.lead_id, activity.company_name)}
                            aria-label="View past activities"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View History</span>
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
            </CardFooter>
        </Card>
    );
} 