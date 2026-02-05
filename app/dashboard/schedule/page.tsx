//frontend/app/dashboard/schedule/page.tsx
"use client"

import type React from "react"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { UserAvailabilityCalendar } from "@/components/ui/user-availability-calendar"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Calendar, Monitor, Loader2, Check, ChevronsUpDown, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, ApiUser, ApiMeeting, ApiDemo, type ApiLeadSearchResult, type SalesPerson, clientApi } from "@/lib/api"
import { format } from 'date-fns';
import { debounce } from "lodash";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"


interface User extends ApiUser { }
interface SalesPersonUser extends SalesPerson {
  id?: number;
}
interface Meeting extends Omit<ApiMeeting, 'type' | 'lead_id'> {
  type: "meeting" | "demo";
  lead_id: string | null;
  start_time: string;
  end_time: string;
  phase: string;
  attendees?: string[];
}

const convertLocalStringToUtcIso = (localString: string): string => {
  if (!localString) return "";

  const [datePart, timePart] = localString.split('T');
  if (!datePart || !timePart) {
    console.warn("Invalid datetime-local string format:", localString);
    return new Date(localString).toISOString();
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const localDate = new Date(year, month - 1, day, hour, minute);

  return localDate.toISOString();
};


export default function SchedulePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allLeads, setAllLeads] = useState<ApiLeadSearchResult[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<ApiLeadSearchResult[]>([]);
  const [hasFetchedInitialLeads, setHasFetchedInitialLeads] = useState(false);
  const [users, setUsers] = useState<User[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPersonUser[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLeads, setIsFetchingLeads] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [busySlots, setBusySlots] = useState<{ start: string; end: string }[]>([])
  // --- START OF FIX: Removed confirmation dialog state ---
  // const [showConfirmation, setShowConfirmation] = useState(false)
  // const [confirmationMessage, setConfirmationMessage] = useState("")
  // --- END OF FIX ---
  const [scheduleType, setScheduleType] = useState<"meeting" | "demo">("meeting")
  const [meetingTypeOptions, setMeetingTypeOptions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    lead_id: "",
    assigned_to: "",
    start_time: "",
    duration: "60",
    meeting_type: "Discussion",
    attendees: [] as string[],
    meeting_agenda: "",
    meeting_link: "",
  })
  const [minDateTime, setMinDateTime] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    // Format: YYYY-MM-DDTHH:mm
    const formatted = format(now, "yyyy-MM-dd'T'HH:mm");
    setMinDateTime(formatted);
  }, []);

  const calculatedEndTime = (() => {
    if (formData.start_time && formData.duration) {
      const durationInMinutes = parseInt(formData.duration, 10);
      if (!isNaN(durationInMinutes) && durationInMinutes > 0) {
        const start = new Date(formData.start_time);
        const end = new Date(start.getTime() + durationInMinutes * 60 * 1000);
        return format(end, "yyyy-MM-dd'T'HH:mm");
      }
    }
    return "";
  })();

  useEffect(() => {
    const storedUserData = localStorage.getItem("user");
    if (storedUserData) {
      setCurrentUser(JSON.parse(storedUserData));
    } else {
      router.push("/login");
    }
  }, [router]);

  // --- START OF FIX: Split data fetching for faster perceived load time ---
  useEffect(() => {
    if (!currentUser) return;

    // Fetch essential data for form rendering first
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [salesPersonsData, meetingTypesData] = await Promise.all([
          api.getSalesPersons(),
          api.getByCategory("meeting_type"),
        ]);

        // Sort sales persons alphabetically before setting state
        const sortedSalesPersons = salesPersonsData.sort((a, b) =>
          a.employee_name.localeCompare(b.employee_name)
        );
        setSalesPersons(sortedSalesPersons);

        const meetingTypes = meetingTypesData.map(item => item.value);
        setMeetingTypeOptions(meetingTypes);
        if (meetingTypes.length > 0) {
          setFormData(prev => ({ ...prev, meeting_type: meetingTypes[0] }));
        }

      } catch (error) {
        console.error("Failed to fetch initial page data:", error);
        toast({ title: "Error", description: "Failed to load essential page data. Please refresh." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUser, toast]);

  // Fetch non-essential availability data in the background
  useEffect(() => {
    if (!currentUser) return;

    const fetchAvailabilityData = async () => {
      try {
        const [meetingsData, demosData] = await Promise.all([
          api.getAllMeetings(),
          api.getAllDemos(),
        ]);

        const allEvents = [
          ...meetingsData.map(m => ({
            ...m,
            start_time: m.event_time,
            end_time: m.event_end_time,
            type: 'meeting' as const
          })),
          ...demosData.map(d => ({
            ...d,
            start_time: d.start_time,
            end_time: d.event_end_time,
            type: 'demo' as const,
            // Polyfill missing fields required by Meeting interface (extends ApiMeeting)
            event_type: 'Demo',
            event_time: d.start_time,
            created_by: d.scheduled_by
          }))
        ];

        setMeetings(allEvents.map(e => ({
          ...e,
          id: e.id.toString(),
          lead_id: e.lead_id ? e.lead_id.toString() : null,
          phase: e.phase,
        } as unknown as Meeting)));
      } catch (error) {
        console.error("Failed to fetch availability data in background:", error);
        // Optionally show a non-blocking toast
        toast({ title: "Warning", description: "Could not load user availability data.", variant: "default" });
      }
    };

    fetchAvailabilityData();
  }, [currentUser, toast]);
  // --- END OF FIX ---

  const handleLeadDropdownOpen = async (open: boolean) => {
    if (open && !hasFetchedInitialLeads) {
      setIsFetchingLeads(true);
      try {
        const [leadsResults, clientsResults] = await Promise.all([
          api.getAllLeads(),
          clientApi.getAllClients()
        ]);

        // Map leads to ApiLeadSearchResult format
        const leads = leadsResults.map((lead: any) => ({
          id: lead.LedgerID || lead.id,
          company_name: lead.CompanyName || lead.company_name || "",
          ledger_name: lead.LedgerName || lead.ledger_name || ""
        }));

        // Map clients to ApiLeadSearchResult format
        const clients = clientsResults.map((client: any) => ({
          id: client.id || client.LedgerID,
          company_name: client.company_name || client.LedgerName || "",
          ledger_name: client.LedgerName || client.company_name || ""
        }));

        // Merge and deduplicate
        const allItems = [...leads, ...clients].filter(item => item.id); // Filter invalid IDs
        // Use String(item.id) to ensure consistency between number/string IDs
        const uniqueItems = Array.from(new Map(allItems.map(item => [String(item.id), item])).values());

        setAllLeads(uniqueItems);
        setFilteredLeads(uniqueItems);
        setHasFetchedInitialLeads(true);
      } catch (error) {
        console.error("Error fetching leads/clients:", error);
        toast({ title: "Error", description: "Could not fetch the list of leads and clients." });
      } finally {
        setIsFetchingLeads(false);
      }
    }
  };

  const searchLeads = useCallback(
    debounce((searchTerm: string) => {
      if (!searchTerm) {
        setFilteredLeads(allLeads);
        return;
      }
      const filtered = allLeads.filter(lead =>
        (lead.ledger_name || lead.company_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLeads(filtered);
    }, 200),
    [allLeads]
  );

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setAvailabilityError(null)
    setShowCalendar(false)
  }

  const checkAvailability = (assignedToId: string, startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return true;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const assignedPerson = salesPersons.find(s => (s.employee_i_d || s.employee_id)?.toString() === assignedToId);
    if (!assignedPerson) {
      console.warn("Could not find sales person to check availability.");
      return true;
    }

    const conflicts = meetings.filter((meeting) => {
      const isActive = meeting.phase === 'Scheduled' || meeting.phase === 'Rescheduled';
      if (!isActive) {
        return false;
      }
      const isAssigned = meeting.assigned_to === assignedPerson.employee_name;
      if (!isAssigned) return false;

      const meetingStart = new Date(meeting.start_time);
      const meetingEnd = new Date(meeting.end_time);
      return start < meetingEnd && end > meetingStart;
    });

    if (conflicts.length > 0) {
      setBusySlots(conflicts.map(m => ({ start: m.start_time, end: m.end_time })));
      return false;
    }
    return true;
  }

  // --- START OF FIX: Reworked handleSubmit for immediate navigation ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Show loader on button immediately

    if (!calculatedEndTime) {
      toast({ title: "Error", description: "Invalid start time or duration.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const selectedDate = new Date(formData.start_time);
    const now = new Date();
    // Allow a small grace period (e.g., 2 minutes) for the time taken between opening the form and submitting
    const gracePeriod = 2 * 60 * 1000;

    if (selectedDate.getTime() < (now.getTime() - gracePeriod)) {
      toast({ title: "Invalid Time", description: "You cannot schedule an event in the past.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    setAvailabilityError(null);

    const assignedUser = salesPersons.find((s) => (s.employee_i_d || s.employee_id)?.toString() === formData.assigned_to);
    if (!assignedUser || !currentUser || !formData.lead_id) {
      toast({ title: "Error", description: "Missing required form data.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!checkAvailability(formData.assigned_to, formData.start_time, calculatedEndTime)) {
      setAvailabilityError(`${assignedUser.employee_name} is unavailable at the selected time.`);
      setShowCalendar(true);
      setIsSubmitting(false);
      return;
    }

    // Navigate immediately
    router.push("/dashboard/events");
    toast({ title: "Scheduling...", description: `Your ${scheduleType} is being scheduled in the background.` });

    // Perform API call in the background
    const scheduleInBackground = async () => {
      try {
        const utcStartTime = convertLocalStringToUtcIso(formData.start_time);
        const utcEndTime = convertLocalStringToUtcIso(calculatedEndTime);

        const allAttendees = Array.from(new Set([assignedUser.employee_name, ...formData.attendees]));

        const companyAuthName = null;

        const payload = {
          lead_id: Number.parseInt(formData.lead_id),
          assigned_to: assignedUser.employee_name,
          event_time: utcStartTime,
          event_end_time: utcEndTime,
          created_by: currentUser.username,
          attendees: allAttendees,
          company_auth_name: companyAuthName,
          meeting_agenda: formData.meeting_agenda || undefined,
          meeting_link: formData.meeting_link || undefined,
        };

        if (scheduleType === "meeting") {
          await api.scheduleMeeting({ ...payload, meeting_type: formData.meeting_type });
        } else {
          await api.scheduleDemo({
            lead_id: payload.lead_id,
            assigned_to: payload.assigned_to,
            start_time: payload.event_time,
            event_end_time: payload.event_end_time,
            scheduled_by: payload.created_by,
            attendees: allAttendees,
            company_auth_name: companyAuthName,
            meeting_agenda: formData.meeting_agenda || undefined,
            meeting_link: formData.meeting_link || undefined,
          });
        }

        // Send Email Invitation
        const lead = allLeads.find(l => String(l.id) === formData.lead_id);
        const companyName = lead?.company_name || lead?.ledger_name || "Unknown Company";

        await api.sendEventInvitation({
          event_type: scheduleType === "meeting" ? "Meeting" : "Demo",
          company_name: companyName,
          start_time_utc: utcStartTime,
          end_time_utc: utcEndTime,
          organizer_email: currentUser.email, // Assuming currentUser has email
          description: formData.meeting_agenda || `${scheduleType} with ${companyName}`,
          attendee_ledger_ids: [payload.lead_id], // Lead's LedgerID
          attendee_usernames: allAttendees // Assigned user and other attendees
        });

        toast({ title: "Success!", description: `The ${scheduleType} has been scheduled and invitation sent.` });

        // Navigate to events page and force refresh to show new event
        window.location.href = '/dashboard/events';

      } catch (error) {
        console.error(`Failed to schedule ${scheduleType} in background:`, error);
        const errorMessage = error instanceof Error ? error.message : `An unknown error occurred.`;
        toast({ title: "Scheduling Failed", description: `The ${scheduleType} could not be scheduled. ${errorMessage}`, variant: "destructive" });
      }
    };

    scheduleInBackground();
  }
  // --- END OF FIX ---


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="px-1">
        {/* <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Schedule Meeting/Demo</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Schedule a meeting or demo with a lead</p> */}
      </div>

      <Card className="border-0 sm:border shadow-none sm:shadow-sm">
        <CardContent className="px-3 sm:px-6 pt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={scheduleType === "meeting" ? "default" : "outline"}
              onClick={() => setScheduleType("meeting")}
              className={cn(
                "flex-1 h-9 text-sm",
                scheduleType === "meeting" && "bg-blue-100 text-foreground hover:bg-blue-200 font-bold dark:bg-blue-900/30 dark:hover:bg-blue-900/40"
              )}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
            <Button
              type="button"
              variant={scheduleType === "demo" ? "default" : "outline"}
              onClick={() => setScheduleType("demo")}
              className={cn(
                "flex-1 h-9 text-sm",
                scheduleType === "demo" && "bg-blue-100 text-foreground hover:bg-blue-200 font-bold dark:bg-blue-900/30 dark:hover:bg-blue-900/40"
              )}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Schedule Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-0 sm:border shadow-none sm:shadow-sm">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">
                {scheduleType === "meeting" ? "Meeting" : "Demo"} Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="lead_id" className="text-xs sm:text-sm">Lead / Ledger *</Label>
                    <Select
                      value={formData.lead_id}
                      onValueChange={(value) => handleInputChange("lead_id", value)}
                      onOpenChange={handleLeadDropdownOpen}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full min-w-0 overflow-hidden">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[90vw] w-[400px] max-h-[400px] p-0" position="popper" sideOffset={5}>
                        <div className="p-2">
                          <Input
                            placeholder="Search by ledger/company name..."
                            onChange={(e) => searchLeads(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            autoFocus
                            className="h-8"
                          />
                        </div>
                        <ScrollArea className="h-[200px] overflow-x-auto">
                          {isFetchingLeads ? (
                            <div className="flex items-center justify-center p-2"><Loader2 className="h-3 w-3 animate-spin" /></div>
                          ) : filteredLeads.length > 0 ? (
                            filteredLeads.map(lead => <SelectItem key={String(lead.id)} value={String(lead.id)} className="truncate">{lead.ledger_name || lead.company_name}</SelectItem>)
                          ) : (
                            <div className="p-2 text-center text-xs text-muted-foreground">No leads found.</div>
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="assigned_to" className="text-xs sm:text-sm">Assigned To *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-8 sm:h-9 text-xs sm:text-sm"
                        >
                          {formData.assigned_to
                            ? salesPersons.find((person) => (person.employee_i_d || person.employee_id)?.toString() === formData.assigned_to)?.employee_name
                            : "Select..."}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[90vw] p-0" sideOffset={5}>
                        <Command>
                          <CommandInput placeholder="Search sales person..." />
                          <CommandEmpty>No sales person found.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-[200px] overflow-x-auto">
                              {salesPersons.map((person) => {
                                const employeeId = (person.employee_i_d || person.employee_id)?.toString() || '';
                                return (
                                  <CommandItem
                                    key={employeeId}
                                    value={person.employee_name}
                                    onSelect={() => {
                                      handleInputChange("assigned_to", employeeId);
                                    }}
                                    className="truncate"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 flex-shrink-0",
                                        formData.assigned_to === employeeId ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {person.employee_name}
                                  </CommandItem>
                                );
                              })}
                            </ScrollArea>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {scheduleType === "meeting" && (
                    <div className="space-y-1">
                      <Label htmlFor="meeting_type" className="text-xs sm:text-sm">Meeting Type *</Label>
                      <Select value={formData.meeting_type} onValueChange={(value) => handleInputChange("meeting_type", value)}>
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full min-w-0 [&>span]:truncate">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[90vw]" position="popper" sideOffset={5}>
                          {meetingTypeOptions.map(opt => (<SelectItem key={opt} value={opt} className="truncate">{opt}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm">Other Attendees (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-auto min-h-[2rem] text-xs sm:text-sm"
                      >
                        <div className="flex flex-wrap gap-1 flex-1">
                          {formData.attendees.length > 0 ? (
                            formData.attendees.map((attendee) => (
                              <Badge key={attendee} variant="secondary" className="text-xs">
                                {attendee}
                                <X
                                  className="ml-1 h-3 w-3 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInputChange(
                                      "attendees",
                                      formData.attendees.filter((a) => a !== attendee)
                                    );
                                  }}
                                />
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Select additional attendees...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[90vw] p-0" sideOffset={5}>
                      <Command>
                        <CommandInput placeholder="Search attendees..." />
                        <CommandEmpty>No sales person found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px] overflow-x-auto">
                            {salesPersons
                              .filter((person) => (person.employee_i_d || person.employee_id)?.toString() !== formData.assigned_to)
                              .map((person) => {
                                const employeeName = person.employee_name;
                                const isSelected = formData.attendees.includes(employeeName);
                                return (
                                  <CommandItem
                                    key={person.employee_i_d || person.employee_id}
                                    value={employeeName}
                                    onSelect={() => {
                                      const newAttendees = isSelected
                                        ? formData.attendees.filter((a) => a !== employeeName)
                                        : [...formData.attendees, employeeName];
                                      handleInputChange("attendees", newAttendees);
                                    }}
                                    className="truncate"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 flex-shrink-0",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {employeeName}
                                  </CommandItem>
                                );
                              })}
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="start_time" className="text-xs sm:text-sm">Start Date & Time *</Label>
                    <Input id="start_time" type="datetime-local" value={formData.start_time} min={minDateTime} onChange={(e) => handleInputChange("start_time", e.target.value)} required className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="duration" className="text-xs sm:text-sm">Duration (min) *</Label>
                    <Input id="duration" type="number" value={formData.duration} onChange={(e) => handleInputChange("duration", e.target.value)} required min="1" className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                </div>

                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="meeting_agenda" className="text-xs sm:text-sm">Agenda</Label>
                    <textarea
                      id="meeting_agenda"
                      value={formData.meeting_agenda}
                      onChange={(e) => handleInputChange("meeting_agenda", e.target.value)}
                      placeholder="Enter agenda (optional)"
                      className="w-full h-14 px-2 py-1.5 text-xs sm:text-sm border rounded-md border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="meeting_link" className="text-xs sm:text-sm">Meeting Link</Label>
                    <Input
                      id="meeting_link"
                      type="url"
                      value={formData.meeting_link}
                      onChange={(e) => handleInputChange("meeting_link", e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {calculatedEndTime && (<div className="text-xs sm:text-sm text-muted-foreground mt-1">End: {new Date(calculatedEndTime).toLocaleString()}</div>)}

                {availabilityError && (<Alert variant="destructive" className="py-1.5 mt-1"><AlertTriangle className="h-3 w-3" /><AlertDescription className="text-xs">{availabilityError}</AlertDescription></Alert>)}

                {showCalendar && busySlots.length > 0 && (
                  <Card className="border-0 sm:border mt-2">
                    <CardHeader className="pb-1 sm:pb-2"><CardTitle className="text-xs sm:text-sm">
                      {salesPersons.find(s => (s.employee_i_d || s.employee_id)?.toString() === formData.assigned_to)?.employee_name || formData.assigned_to}'s Schedule
                    </CardTitle></CardHeader>
                    <CardContent className="px-2 sm:px-4 py-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Busy times:</p>
                        {busySlots.map((slot, index) => (<div key={index} className="text-xs p-1 bg-muted rounded"><span>{new Date(slot.start).toLocaleString()}</span></div>))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2 pt-2 mt-2">
                  <Button type="submit" disabled={isSubmitting || !formData.lead_id || !formData.assigned_to || !formData.start_time} className="flex-1 h-9 text-sm">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Schedule ${scheduleType === "meeting" ? "Meeting" : "Demo"}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 text-sm px-4">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <UserAvailabilityCalendar
            selectedDate={formData.start_time ? new Date(formData.start_time) : new Date()}
            // Pass the ID as selectedUser (component now handles resolving to name via internal user list lookup or passing name if we wanted)
            // But wait, the component's internal list might not have all 'salesPersons'.
            // However, UserAvailabilityCalendar fetches api.getUsers().
            // Ideally we should pass the NAME if the component expects a name for display title.
            // Let's check UserAvailabilityCalendar Line 157: {selectedUser} is displayed.
            // So we MUST pass the NAME here if we want the Name to be displayed in the header title of the component.
            // But selectedUser can also be used for filtering.
            // In my previous edit to UserAvailabilityCalendar, I made it look up targetUser by ID matching `selectedUser`.
            // BUT the display at line 157 simply renders `{selectedUser}` string.
            // So if I pass ID, it displays ID.
            // I should modify UserAvailabilityCalendar to display `targetUser.username` instead of `selectedUser` if found.
            // Or I can modify this call to pass the name, but then ID filtering might fail if I didn't update logic to find by Name.
            // Wait, I updated logic to `users.find(u => u.username === selectedUser || u.usernumber === selectedUser)`.
            // So passing Name is SAFE!
            selectedUser={salesPersons.find(s => (s.employee_i_d || s.employee_id)?.toString() === formData.assigned_to)?.employee_name || formData.assigned_to}
            className="h-fit"
          />
        </div>
      </div>

    </div>
  )
}