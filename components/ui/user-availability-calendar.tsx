//frontend/components/ui/user-availability-calendar.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Monitor, Loader2 } from "lucide-react"
import { api, ApiLead, ApiUser, ApiMeeting, ApiDemo } from "@/lib/api"
import { format } from "date-fns"

interface UserEvent {
  id: string
  type: "meeting" | "demo"
  title: string
  start_time: string
  end_time: string
  assigned_to: string
  assigned_to_usernumber?: string
  phase?: string // Add phase to the interface
}

interface UserAvailabilityCalendarProps {
  className?: string
  showAllUsers?: boolean
  selectedDate?: Date
  selectedUser?: string
}

export function UserAvailabilityCalendar({
  className = "",
  showAllUsers = false,
  selectedDate = new Date(),
  selectedUser,
}: UserAvailabilityCalendarProps) {
  const [events, setEvents] = useState<UserEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [leads, setLeads] = useState<ApiLead[]>([])

  useEffect(() => {
    const fetchUserAvailability = async () => {
      try {
        setLoading(true)

        // --- START OF FIX: Use API functions that fetch only SCHEDULED events ---
        // Changed from getAllMeetings/getAllDemos to getScheduledMeetings/getScheduledDemos.
        // This ensures that completed, canceled, etc., events are not included.
        const [meetingsData, demosData, usersData, leadsData] = await Promise.all([
          api.getScheduledMeetings(),
          api.getScheduledDemos(),
          api.getUsers(),
          api.getAllLeads(),
        ]);
        // --- END OF FIX ---

        setUsers(usersData);
        setLeads(leadsData);

        const getLeadName = (leadId: number): string => {
          const lead = leadsData.find((l: ApiLead) => l.id === leadId);
          return lead ? lead.company_name : `Lead #${leadId}`;
        };

        const allEvents: UserEvent[] = [
          ...meetingsData.map((meeting: ApiMeeting) => ({
            id: String(meeting.id),
            type: "meeting" as const,
            title: `Meeting - ${getLeadName(meeting.lead_id)}`,
            start_time: meeting.event_time,
            end_time: meeting.event_end_time || meeting.event_time,
            assigned_to: meeting.assigned_to,
            phase: meeting.phase,
          })),
          ...demosData.map((demo: ApiDemo) => {
            const assignedUser = usersData.find(u => u.usernumber === demo.assigned_to);
            return {
              id: String(demo.id),
              type: "demo" as const,
              title: `Demo - ${getLeadName(demo.lead_id)}`,
              start_time: demo.start_time,
              end_time: demo.event_end_time || demo.start_time,
              assigned_to: assignedUser ? assignedUser.username : demo.assigned_to,
              assigned_to_usernumber: demo.assigned_to,
              phase: demo.phase,
            }
          }),
        ];

        setEvents(allEvents)
      } catch (error) {
        console.error("[v0] Error fetching user availability:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAvailability()
  }, [])

  const getEventsForDate = (date: Date) => {
    const dateString = date.toDateString();

    // Improved logic: Match by username OR usernumber (ID)
    const targetUser = users.find(u => u.username === selectedUser || u.usernumber === selectedUser);

    let filteredEvents = events.filter((event) => new Date(event.start_time).toDateString() === dateString);

    if (targetUser) {
      filteredEvents = filteredEvents.filter((event) =>
        // Check against both username and usernumber to be safe
        event.assigned_to === targetUser.username ||
        event.assigned_to_usernumber === targetUser.usernumber ||
        event.assigned_to === targetUser.usernumber // Handle case where assigned_to IS the ID
      );
    } else if (selectedUser) {
      // Fallback: If no user object found but selectedUser exists, try strict match
      filteredEvents = filteredEvents.filter(event => event.assigned_to === selectedUser || event.assigned_to_usernumber === selectedUser);
    }

    return filteredEvents;
  }

  const busyUsersMap = useMemo(() => {
    const eventsForDay = getEventsForDate(selectedDate);
    const map = new Map<string, UserEvent[]>();

    eventsForDay.forEach((event) => {
      if (!map.has(event.assigned_to)) {
        map.set(event.assigned_to, []);
      }
      map.get(event.assigned_to)!.push(event);
    });
    return map;
  }, [events, selectedDate, users, selectedUser]);

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "p");
  }

  const busyUsers = showAllUsers ? busyUsersMap : (selectedUser && busyUsersMap.has(selectedUser)) ? new Map([[selectedUser, busyUsersMap.get(selectedUser)!]]) : new Map();


  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">User Availability</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="ml-2 text-sm text-muted-foreground">Loading Schedule...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {selectedUser
            ? `${selectedUser}'s Schedule - ${selectedDate.toLocaleDateString()}`
            : `User Availability - ${selectedDate.toLocaleDateString()}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {busyUsers.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            {selectedUser ? `${selectedUser} is free today.` : "All users are free today."}
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from(busyUsers.entries()).map(([username, userEvents]) => (
              <div key={username} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-medium">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{username}</span>
                  <Badge variant="destructive" className="text-xs">
                    Busy
                  </Badge>
                </div>
                <div className="space-y-1">
                  {userEvents.map((event: UserEvent) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 text-xs p-2 rounded"
                      style={{ backgroundColor: event.type === "meeting" ? "#dbeafe" : "#dcfce7" }}
                    >
                      {event.type === "meeting" ? (
                        <Users className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Monitor className="h-3 w-3 text-green-600" />
                      )}
                      <span className="flex-1 font-medium truncate" title={event.title}>{event.title}</span>
                      <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}