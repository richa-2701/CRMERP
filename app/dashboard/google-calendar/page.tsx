"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api, type ApiUser } from "@/lib/api"
import { Loader2, Copy, Info, ExternalLink } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { format } from "date-fns"

export default function GoogleCalendarPage() {
    const { toast } = useToast();
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
    const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subscriptionUrl, setSubscriptionUrl] = useState("");
    const [userLegend, setUserLegend] = useState<Record<string, string>>({});
    const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

    const stringToColor = (str: string) => {
        if (!str) return '#808080';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    const fetchCalendarData = useCallback(async () => {
        setIsLoading(true);
        try {
            const eventData = await api.getAllCalendarEvents();
            const usersData = await api.getUsers();

            setAllUsers(usersData);
            const legend: Record<string, string> = {};
            const formattedEvents = eventData.map(event => {
                const assignee = event.extendedProps.assignee;
                if (assignee) {
                    const eventColor = stringToColor(assignee);
                    if (!legend[assignee]) {
                        legend[assignee] = eventColor;
                    }
                    return { ...event, backgroundColor: eventColor, borderColor: eventColor };
                }
                return event;
            });
            setAllEvents(formattedEvents);
            setUserLegend(legend);
        } catch (err: any) {
            console.error("Failed to fetch calendar data:", err);
            toast({
                title: "Error Loading Calendar",
                description: `Could not load data. The server might be busy. Please try again in a moment. (${err.message})`,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const userJson = localStorage.getItem("user");
        if(userJson) {
            const user = JSON.parse(userJson);
            setCurrentUser(user);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:57214";
            const subPath = `/web/calendar/subscribe/${user.id}`;
            const finalUrl = (apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl) + subPath;
            setSubscriptionUrl(finalUrl);
        }
        fetchCalendarData();
    }, [fetchCalendarData]);
    
    const filteredEvents = useMemo(() => {
        if (selectedUserFilter === "all") {
            return allEvents;
        }
        return allEvents.filter((event: any) => event.extendedProps.assignee === selectedUserFilter);
    }, [allEvents, selectedUserFilter]);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(subscriptionUrl);
        toast({ title: "Success", description: "Subscription URL copied to clipboard!" });
    };

    const handleAddToGoogleCalendar = () => {
        const googleCalendarUrl = `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(subscriptionUrl)}`;
        window.open(googleCalendarUrl, '_blank');
    };
    
    const renderEventContent = (eventInfo: any) => {
        const { event } = eventInfo;
        const { extendedProps } = event;
        const isDone = extendedProps.status === 'Done' || extendedProps.status === 'Completed';

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`fc-event-main-frame w-full overflow-hidden whitespace-nowrap flex items-center gap-1.5 p-0.5 ${isDone ? 'opacity-60' : ''}`}>
                        <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.backgroundColor }}
                        />
                        <div className="flex-1 overflow-hidden">
                            <span className="fc-event-time">{eventInfo.timeText}</span>
                            <span className={`fc-event-title fc-sticky ml-1 ${isDone ? 'line-through' : ''}`}>{event.title}</span>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-bold">{event.title}</p>
                    <p><strong>Status:</strong> {extendedProps.status}</p>
                    <p><strong>Assignee:</strong> {extendedProps.assignee}</p>
                    {event.start && event.end &&
                        <p>
                            <strong>Time: </strong>
                            {format(new Date(event.start), "p")} - {format(new Date(event.end), "p")}
                        </p>
                    }
                </TooltipContent>
            </Tooltip>
        );
    };

    if (isLoading && allEvents.length === 0) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div>
                    {/* <h1 className="text-3xl font-bold tracking-tight">Team Calendar</h1>
                    <p className="text-muted-foreground">View all scheduled meetings and demos for your team.</p> */}
                </div>
                
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <CardTitle className="text-base mb-2">User Legend</CardTitle>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {Object.entries(userLegend).map(([username, color]) => (
                                            <div key={username} className="flex items-center gap-2 text-sm">
                                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                                <span>{username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full md:w-48">
                                    <Label>Filter by User</Label>
                                     <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            {Object.keys(userLegend).sort().map(username => (
                                                <SelectItem key={username} value={username}>{username}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <details className="text-sm border rounded-lg p-3 md:max-w-md">
                                <summary className="cursor-pointer font-medium text-primary flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    <span>Sync Your Personal CRM Schedule to Google Calendar</span>
                                </summary>
                                <div className="mt-3 space-y-3">
                                    {/* --- START OF FIX: Improved user instructions about sync delay --- */}
                                    <AlertDescription className="text-gray-700">
                                        This will create a one-way sync from the CRM to your personal calendar. Any meetings or demos assigned to you in the CRM will automatically appear in your Google Calendar.
                                        <br/><br/>
                                        <div className="p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800">
                                            <p className="font-bold">Important Note on Sync Speed:</p>
                                            <p>Google Calendar controls how often it checks for updates. While new events will sync automatically, it may take <span className="font-semibold">several hours</span> for changes to appear. This delay is controlled by Google, not the CRM.</p>
                                        </div>
                                        <br/>
                                        **How to add to Google Calendar:**
                                        <ol className="list-decimal list-inside pl-4 mt-2 space-y-1">
                                            <li>Copy your unique calendar URL below.</li>
                                            <li>Open Google Calendar on your computer.</li>
                                            <li>On the left side, next to "Other calendars," click the <span className="font-bold">+</span> (Add other calendars) button.</li>
                                            <li>Select "From URL" from the menu.</li>
                                            <li>Paste your copied URL into the field and click "Add calendar."</li>
                                            <li>If events seem out of date, you may need to **remove and re-add** the calendar in Google's settings to force an immediate refresh.</li>
                                        </ol>
                                      </AlertDescription>
                                    {/* --- END OF FIX --- */}
                                    <div className="flex items-center gap-2">
                                        <Input value={subscriptionUrl} readOnly className="h-8" />
                                        <Button onClick={handleCopyUrl} size="icon" variant="outline" className="h-8 w-8 flex-shrink-0">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button onClick={handleAddToGoogleCalendar} variant="secondary" className="w-full">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Add to Google Calendar
                                    </Button>
                                </div>
                            </details>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 md:p-4">
                        {isLoading ? (
                           <div className="flex justify-center items-center h-96">
                               <Loader2 className="h-6 w-6 animate-spin" />
                           </div>
                        ) : (
                           <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                }}
                                events={filteredEvents}
                                eventContent={renderEventContent}
                                eventTimeFormat={{
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    meridiem: 'short'
                                }}
                                height="auto"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}