//frontend/app/dashboard/events/page.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Users, Calendar, Search, AlertCircle, Loader2, Check, LayoutGrid, List, User, Clock, FileText, MoreHorizontal, Edit, Calendar as CalendarIcon, XCircle, FileEdit, Timer, MapPin, Play, Phone } from "lucide-react"
import { api, leadApi, type SalesPerson, type ApiLead, type ApiMeeting, type ApiDemo, type ApiUser, type ApiEventReschedulePayload } from "@/lib/api"
import { formatDateTime, parseAsUTCDate } from "@/lib/date-format"
import { useToast } from "@/hooks/use-toast"

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


const getStatusBadgeVariant = (status: EnhancedEvent['status']) => {
  switch (status) {
    case 'Completed': return 'default';
    case 'Pending': return 'secondary';
    case 'Overdue': return 'destructive';
    case 'Canceled': return 'outline';
    case 'Rescheduled': return 'outline';
    case 'Scheduled': return 'default';
    default: return 'outline';
  }
}
interface EnhancedEvent {
  id: string;
  numericId: number;
  type: 'meeting' | 'demo';
  meeting_type?: string;
  lead_id: string;
  company_name: string;
  contact_name: string; // Actually stores phone number from LedgerMaster.MobileNo
  assigned_to: string;
  start_time: string;
  end_time: string;
  status: 'Pending' | 'Completed' | 'Overdue' | 'Canceled' | 'Rescheduled' | 'Scheduled';
  createdAt: string;
  createdBy: string;
  remark?: string;
  attendees: string[];
  duration_minutes?: number;
  latitude?: number;
  longitude?: number;
  location_text?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  end_latitude?: number;
  end_longitude?: number;
  end_location_text?: string;
}

type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'canceled' | 'rescheduled';
type ViewMode = 'grid' | 'list';

const getEventStatus = (event: { start_time: string; phase?: string }): 'Pending' | 'Completed' | 'Overdue' | 'Canceled' | 'Rescheduled' => {
  if (event.phase === 'Completed' || event.phase === 'Done') return 'Completed';
  if (event.phase === 'Canceled') return 'Canceled';
  if (event.phase === 'Rescheduled') return 'Rescheduled';

  const eventDate = parseAsUTCDate(event.start_time);
  if (!eventDate) return 'Pending';

  if (eventDate < new Date()) return 'Overdue';

  return 'Pending';
}


// --- MODAL COMPONENTS ---

function RescheduleModal({ isOpen, onClose, event, onSuccess, currentUser }: { isOpen: boolean, onClose: () => void, event: EnhancedEvent | null, onSuccess: () => void, currentUser: ApiUser | null }) {
  const { toast } = useToast();
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (event?.start_time) {
      const date = parseAsUTCDate(event.start_time);
      if (date) {
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setStartTime(date.toISOString().slice(0, 16));
      }
    }
  }, [event]);

  if (!isOpen || !event || !currentUser) return null;

  const handleSubmit = async () => {
    if (!startTime || !duration) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const startUtc = convertLocalStringToUtcIso(startTime);

    const end = new Date(startTime);
    end.setMinutes(end.getMinutes() + parseInt(duration, 10));
    const endUtc = end.toISOString();

    try {
      await api.rescheduleEvent(event.type, event.numericId, {
        start_time: startUtc,
        end_time: endUtc,
        updated_by: currentUser.username,
      });

      toast({ title: "Success", description: "Event has been rescheduled." });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule {event.type}</DialogTitle>
          <DialogDescription>
            Choose a new date and time for this {event.type}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start_time">New Start Date & Time</Label>
            <Input id="start_time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input id="duration" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ReassignModal({ isOpen, onClose, event, onSuccess, currentUser, salesPersons }: { isOpen: boolean, onClose: () => void, event: EnhancedEvent | null, onSuccess: () => void, currentUser: ApiUser | null, salesPersons: SalesPerson[] }) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const availableUsers = useMemo(() => {
    if (!event) return [];
    // Deduplicate and filter
    const unique = new Map<string, SalesPerson>();
    salesPersons.forEach(sp => {
      const id = (sp.employee_id || sp.employee_i_d || "").toString();
      if (id && !unique.has(id)) {
        unique.set(id, sp);
      }
    });
    return Array.from(unique.values()).filter(sp => sp.employee_name !== event.assigned_to);
  }, [salesPersons, event]);

  if (!isOpen || !event || !currentUser) return null;

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast({ title: "Error", description: "Please select a user to reassign to.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await api.reassignEvent(event.type, event.numericId, {
        assigned_to: selectedUser,
        updated_by: currentUser.username
      });
      toast({ title: "Success", description: "Event has been reassigned." });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign {event.type}</DialogTitle>
          <DialogDescription>
            Select a new team member to assign this {event.type} to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="assign-to">New Assignee</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger>
            <SelectContent>
              {availableUsers.map(sp => {
                const id = sp.employee_id || sp.employee_i_d;
                return (
                  <SelectItem key={id} value={sp.employee_name}>{sp.employee_name}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelEventModal({ isOpen, onClose, event, onSuccess, currentUser }: { isOpen: boolean, onClose: () => void, event: EnhancedEvent | null, onSuccess: () => void, currentUser: ApiUser | null }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !event || !currentUser) return null;

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Error", description: "Please provide a reason for cancellation.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    // --- FIX: Inject Lead Metadata into Reason for Frontend Recovery ---
    // The backend ignores LeadId param during cancellation (deletes the meeting record), 
    // so we stash the data in the Reason text to recover it later in the Activity Log.
    const metadataTag = `[LEAD:${event.lead_id}:${event.company_name}]`;
    const enhancedReason = `${metadataTag} ${reason}`;


    try {
      await api.cancelEvent(event.type, event.numericId, {
        reason: enhancedReason,
        updated_by: currentUser.username,
        lead_id: parseInt(event.lead_id) // Sending it anyway, though backend likely ignores it
      });
      toast({ title: "Success", description: "Event has been canceled." });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {event.type}</DialogTitle>
          <DialogDescription>
            Please provide a reason for canceling this {event.type}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Reason for Cancellation</Label>
          <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Client is unavailable..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNotesModal({ isOpen, onClose, event, onSuccess, currentUser }: { isOpen: boolean, onClose: () => void, event: EnhancedEvent | null, onSuccess: () => void, currentUser: ApiUser | null }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setNotes(event?.remark || "");
  }, [event]);

  if (!isOpen || !event || !currentUser) return null;

  const handleSubmit = async () => {
    if (!notes) {
      toast({ title: "Error", description: "Notes cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await api.updateEventNotes(event.type, event.numericId, { notes, updated_by: currentUser.username });
      toast({ title: "Success", description: "Event notes have been updated." });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Notes for Completed {event.type}</DialogTitle>
          <DialogDescription>
            Update the notes or remarks for this completed {event.type}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
          <Label htmlFor="notes">Post-Event Notes</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={10} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function EventsPage() {
  const { toast } = useToast();
  const [allEvents, setAllEvents] = useState<EnhancedEvent[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

  const [eventToEdit, setEventToEdit] = useState<EnhancedEvent | null>(null);
  const [modalType, setModalType] = useState<'reschedule' | 'reassign' | 'cancel' | 'editNotes' | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EnhancedEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [startingEvents, setStartingEvents] = useState<Set<string>>(new Set());

  // Manual Location Fallback State
  const [isManualLocationOpen, setIsManualLocationOpen] = useState(false);
  const [fallbackLocationData, setFallbackLocationData] = useState<any>(null);
  const [eventForManualLocation, setEventForManualLocation] = useState<EnhancedEvent | null>(null);

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch auxiliary data in parallel (lightweight)
      const [usersData, salesPersonData] = await Promise.all([
        api.getUsers(),
        leadApi.getSalesPersons()
      ]);
      setUsers(usersData);
      setSalesPersons(salesPersonData || []);

      // Fetch Paginated Events
      const response = await api.getEventsPaginated(currentPage, pageSize, debouncedSearchTerm, statusFilter);

      const mappedEvents: EnhancedEvent[] = response.data.map((ev: any) => ({
        id: `${ev.Type}-${ev.Id}`,
        numericId: ev.Id,
        type: ev.Type, // 'meeting' or 'demo'
        lead_id: String(ev.LeadId),
        company_name: ev.CompanyName || 'Unknown Lead',
        contact_name: ev.ContactName || '',
        assigned_to: ev.AssignedTo,
        start_time: ev.StartTime,
        end_time: ev.EndTime,
        status: ev.Phase, // 'Pending', 'Completed', etc. mapped from Phase
        createdAt: ev.CreatedAt,
        createdBy: ev.CreatedBy,
        remark: ev.Remark,
        attendees: [], // Not returned in list view for performance, fetched on detail if needed or added to query if critical
        latitude: ev.Latitude,
        longitude: ev.Longitude,
        location_text: ev.LocationText,
        actual_start_time: ev.ActualStartTime,
        actual_end_time: ev.ActualEndTime,
        end_latitude: ev.EndLatitude,
        end_longitude: ev.EndLongitude,
        end_location_text: ev.EndLocationText
      }));

      setAllEvents(mappedEvents);
      setTotalCount(response.total);

    } catch (err) {
      console.error("Failed to load events:", err);
      setError("Failed to load events. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    loadEvents();

    // Focus listener removed to prevent awkward auto-refresh
    // const onFocus = () => {
    //   console.log("Window focused, reloading events...");
    //   loadEvents();
    // };
    // window.addEventListener("focus", onFocus);
    // return () => {
    //   window.removeEventListener("focus", onFocus);
    // };
  }, [loadEvents]); // Dependencies handled by useCallback

  const handleAction = (event: EnhancedEvent, action: 'reschedule' | 'reassign' | 'cancel' | 'editNotes') => {
    setEventToEdit(event);
    setModalType(action);
  };

  const handleSuccess = () => {
    setEventToEdit(null);
    setModalType(null);
    loadEvents();
  }


  const handleCaptureLocation = async (event: EnhancedEvent) => {
    // 1. Helper: Browser GPS with IMPROVED accuracy settings
    const getCurrentLocation = (
      onSuccess: (coords: { latitude: number; longitude: number; accuracy: number; source: string }) => void,
      onError: (message: string) => void
    ) => {
      if (!navigator.geolocation) {
        onError("Geolocation not supported");
        return;
      }
      
      // IMPROVED: Higher accuracy and longer timeout for better GPS lock
      // enableHighAccuracy: true forces device to use GPS (not WiFi/cellular)
      // timeout: 30000 gives 30 seconds to get accurate location
      // maximumAge: 0 ensures fresh reading (not cached)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Validate accuracy - if accuracy is too poor (>100m), reject GPS
          if (pos.coords.accuracy > 100) {
            console.warn(`GPS accuracy poor (${pos.coords.accuracy}m), attempting other methods...`);
            onError(`GPS accuracy too poor (${pos.coords.accuracy}m)`);
            return;
          }
          onSuccess({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: "BROWSER_GPS",
          });
        },
        (err) => onError(err.message),
        { 
          enableHighAccuracy: true,      // Force GPS, not WiFi
          timeout: 30000,                // Wait up to 30 seconds
          maximumAge: 0                  // No cached data
        }
      );
    };

    // 2. Helper: Reverse Geocode GPS to get PRECISE address with area/locality name
    const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch("/api/location/reverse-geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const results = data.results || [];
        
        if (results.length === 0) return null;

        // Extract precise location components from the most specific result
        const firstResult = results[0];
        const addressComponents = firstResult.address_components || [];

        // Build precise address: [Street/Building], [Area/Locality], [District], [State]
        let areaName = "";
        let localityName = "";
        let districtName = "";
        let stateName = "";

        // Extract different address component types for maximum precision
        for (const component of addressComponents) {
          const types = component.types || [];
          
          // Locality is the most important - area/neighborhood name
          if (types.includes("locality") || types.includes("administrative_area_level_3")) {
            if (!localityName) localityName = component.long_name;
          }
          
          // Route/Street for more precision
          if (types.includes("route") && !areaName) {
            areaName = component.long_name;
          }
          
          // Point of interest/Building
          if (types.includes("point_of_interest") && !areaName) {
            areaName = component.long_name;
          }
          
          // District/City
          if (types.includes("administrative_area_level_2")) {
            if (!districtName) districtName = component.long_name;
          }
          
          // State
          if (types.includes("administrative_area_level_1")) {
            if (!stateName) stateName = component.long_name;
          }
        }

        // Build precise address string prioritizing area > locality > district
        let preciseAddress = "";
        
        if (areaName && localityName) {
          preciseAddress = `${areaName}, ${localityName}, ${districtName || ""}`.replace(/,\s*$/, "");
        } else if (localityName && districtName) {
          preciseAddress = `${localityName}, ${districtName}, ${stateName || ""}`.replace(/,\s*$/, "");
        } else if (firstResult.formatted_address) {
          preciseAddress = firstResult.formatted_address;
        }

        console.log("Precise Address Components:", {
          areaName,
          localityName,
          districtName,
          stateName,
          final: preciseAddress
        });

        return preciseAddress || firstResult.formatted_address || null;
      } catch (error) {
        console.warn("Reverse geocoding failed:", error);
        return null;
      }
    };

    // 3. Helper: Backend Google Fallback (IP-based, less accurate)
    const fetchLocationViaBackend = async () => {
      const res = await api.getLocationFromGoogle();
      if (res && res.location) {
        return {
          latitude: res.location.lat,
          longitude: res.location.lng,
          accuracy: res.accuracy || 2000,  // 2km typical for IP geolocation
          source: "IP_GEOLOCATION"  // Be honest about accuracy
        };
      }
      throw new Error("Invalid response from Google Geolocation API");
    };

    // 4. Main Execution Logic
    const attemptLocationCapture = async () => {
      return new Promise<{ latitude: number; longitude: number; accuracy: number; source: string; locationText?: string }>((resolve, reject) => {
        getCurrentLocation(
          async (coords) => {
            // Got good GPS data, try reverse geocoding
            const address = await reverseGeocodeLocation(coords.latitude, coords.longitude);
            resolve({ ...coords, locationText: address || undefined });
          },
          async (gpsError) => {
            console.warn("Browser GPS failed:", gpsError);
            toast({ 
              title: "GPS Unavailable", 
              description: "Please enable high-accuracy location or use manual location entry. System will attempt IP-based geolocation (may be 5km+ off).",
              variant: "default" 
            });
            
            try {
              const googleCoords = await fetchLocationViaBackend();
              resolve(googleCoords);
            } catch (backendError: any) {
              console.error("IP Geolocation failed:", backendError);
              reject(new Error("Location services unavailable. Please enable location access or enter location manually."));
            }
          }
        );
      });
    };

    // 5. Main Flow
    setStartingEvents(prev => new Set(prev).add(event.id)); // UI Loading State

    try {
      console.log("Requesting location with HIGH ACCURACY GPS...");
      const coords = await attemptLocationCapture();
      console.log(`Location captured via ${coords.source}:`, coords);

      const locationText = coords.locationText || "";
      
      if (event.type === 'meeting') {
        await api.saveMeetingLocation(event.numericId, { 
          Latitude: coords.latitude, 
          Longitude: coords.longitude, 
          LocationText: locationText 
        });
      } else {
        await api.saveDemoLocation(event.numericId, { 
          Latitude: coords.latitude, 
          Longitude: coords.longitude, 
          LocationText: locationText 
        });
      }

      const accuracyText = coords.accuracy <= 20 ? "Very High Accuracy (GPS)" : 
                          coords.accuracy <= 100 ? "High Accuracy (GPS)" : 
                          "Network Based";

      toast({
        title: "Location Saved",
        description: `${accuracyText} - Accuracy: ${Math.round(coords.accuracy)}m`,
        variant: "default"
      });

      loadEvents();
    } catch (error: any) {
      if (error.message && error.message.includes("409")) {
        toast({ title: "Event Started", description: "Event has already been marked as started.", variant: "default" });
        loadEvents();
      } else {
        console.error("Failed to save location:", error);
        // Show manual location option instead of just error
        setEventForManualLocation(event);
        setIsManualLocationOpen(true);
        toast({ 
          title: "GPS Failed", 
          description: "Please enter your location manually.", 
          variant: "default" 
        });
      }
    } finally {
      setStartingEvents(prev => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  };



  const handleEndEvent = async (event: EnhancedEvent) => {
    if (event.actual_end_time) {
      toast({ title: "Already Ended", description: "This event is already marked as completed.", variant: "default" });
      return;
    }
    setStartingEvents(prev => new Set(prev).add(event.id));

    // Reusing the robust capture logic pattern
    const getCurrentLocation = (
      onSuccess: (coords: { latitude: number; longitude: number; accuracy: number; source: string }) => void,
      onError: (message: string) => void
    ) => {
      if (!navigator.geolocation) {
        onError("Geolocation not supported");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => onSuccess({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "BROWSER_GPS",
        }),
        (err) => onError(err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    const fetchLocationViaBackend = async () => {
      const res = await api.getLocationFromGoogle();
      if (res && res.location) {
        return {
          latitude: res.location.lat,
          longitude: res.location.lng,
          accuracy: res.accuracy || 2000,
          source: "BACKEND_GOOGLE"
        };
      }
      throw new Error("Invalid response from Google Geolocation API");
    };

    const attemptLocationCapture = async () => {
      return new Promise<{ latitude: number; longitude: number; accuracy: number; source: string }>((resolve, reject) => {
        getCurrentLocation(
          (coords) => resolve(coords),
          async (gpsError) => {
            console.warn("Browser GPS failed:", gpsError);
            try {
              const googleCoords = await fetchLocationViaBackend();
              resolve(googleCoords);
            } catch (backendError: any) {
              console.error("Google Fallback failed:", backendError);
              reject(new Error("All location attempts failed."));
            }
          }
        );
      });
    };

    try {
      const coords = await attemptLocationCapture();
      const payload = {
        Latitude: coords.latitude,
        Longitude: coords.longitude,
        LocationText: ""
      };

      if (event.type === 'meeting') {
        await api.endMeeting(event.numericId, payload);
      } else {
        await api.endDemo(event.numericId, payload);
      }

      toast({ title: "Event Ended", description: `Duration recorded. Location via ${coords.source === 'BROWSER_GPS' ? 'GPS' : 'Google Network'}` });
      loadEvents();

    } catch (error: any) {
      toast({ title: "Error Ending Event", description: error.message || "Failed to end event.", variant: "destructive" });
    } finally {
      setStartingEvents(prev => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  };

  // Removed client-side filtering logic as it's now handled by the backend
  const filteredEvents = allEvents; // They are already filtered by the server

  // No client-side pagination calculation needed `pageCount` comes from totalCount
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleEventDoubleClick = (event: EnhancedEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };




  const renderActionMenu = (event: EnhancedEvent) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => handleAction(event, 'reschedule')}>
            <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction(event, 'reassign')}>
            <User className="mr-2 h-4 w-4" /> Reassign
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction(event, 'cancel')} className="text-destructive focus:text-destructive">
            <XCircle className="mr-2 h-4 w-4" /> Cancel Event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 px-3 sm:px-4 md:px-0">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        {/* <h1 className="text-2xl font-bold tracking-tight">Meeting & Demo Summary</h1>
        <p className="text-muted-foreground">View, filter, and manage all scheduled events. Double-click an event for more details.</p> */}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, phone, or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <RadioGroup
                defaultValue="all"
                value={statusFilter}
                onValueChange={(value: StatusFilter) => setStatusFilter(value)}
                className="flex items-center gap-2 sm:gap-4 flex-wrap"
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">All</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="pending" id="pending" /><Label htmlFor="pending">Pending</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="completed" id="completed" /><Label htmlFor="completed">Completed</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="overdue" id="overdue" /><Label htmlFor="overdue">Overdue</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="rescheduled" id="rescheduled" /><Label htmlFor="rescheduled">Rescheduled</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="canceled" id="canceled" /><Label htmlFor="canceled">Canceled</Label></div>
              </RadioGroup>

              <div className="flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allEvents.length > 0 ? (
            <>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allEvents.map(event => {
                    const linkHref = event.type === 'meeting'
                      ? `/dashboard/post-meeting?leadId=${event.lead_id}&meetingId=${event.numericId}`
                      : `/dashboard/post-demo?leadId=${event.lead_id}&demoId=${event.numericId}`;
                    const isActionable = ['Pending', 'Rescheduled', 'Overdue', 'Scheduled'].includes(event.status);

                    return (
                      <Card key={event.id} onDoubleClick={() => handleEventDoubleClick(event)} className="flex flex-col justify-between h-full cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex-grow">
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                {event.type === 'meeting' ? event.meeting_type || 'Meeting' : 'Demo'}
                              </p>
                              <CardTitle className="text-lg pt-1">{event.company_name}</CardTitle>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-1">
                                <Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge>
                                {!!event.actual_start_time && !event.actual_end_time && <Badge variant="secondary" className="animate-pulse bg-orange-100 text-orange-800">In Progress</Badge>}
                                {/* Removed premature "Completed" badge based on timestamp */}
                              </div>
                              {(isActionable || event.status === 'Completed') && renderActionMenu(event)}
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>{event.assigned_to}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{formatDateTime(event.start_time)}</span>
                            </div>
                            {event.contact_name && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{event.contact_name}</span>
                              </div>
                            )}
                            {!!event.actual_start_time && <div className="text-xs text-orange-600 flex items-center gap-1"><Play className="w-3 h-3" /> Started: {formatDateTime(event.actual_start_time)}</div>}
                            {!!event.actual_end_time && <div className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Ended: {formatDateTime(event.actual_end_time)}</div>}

                            {event.location_text && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="text-xs" title={event.location_text}>
                                  {event.location_text}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </div>
                        <CardFooter className="pt-2 flex gap-2">
                          {isActionable && !event.actual_start_time && (
                            <Button
                              className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleCaptureLocation(event); }}
                              disabled={startingEvents.has(event.id)}
                            >
                              {startingEvents.has(event.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                              Start
                            </Button>
                          )}

                          {!!event.actual_start_time && (
                            <Button
                              className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleEndEvent(event); }}
                              disabled={startingEvents.has(event.id) || !!event.actual_end_time}
                            >
                              {startingEvents.has(event.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                              End
                            </Button>
                          )}

                          {(event.status !== 'Completed' || (!!event.actual_end_time && !event.remark)) && (
                            <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-none" variant="outline" onClick={e => e.stopPropagation()}>
                              <Link href={linkHref}><Check className="mr-2 h-4 w-4" /> Done</Link>
                            </Button>
                          )}

                          <Button variant="outline" className="flex-1" onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }}>
                            Details
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Time Taken</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allEvents.map(event => {
                        const linkHref = event.type === 'meeting'
                          ? `/dashboard/post-meeting?leadId=${event.lead_id}&meetingId=${event.numericId}`
                          : `/dashboard/post-demo?leadId=${event.lead_id}&demoId=${event.numericId}`;
                        const isActionable = ['Pending', 'Rescheduled', 'Overdue', 'Scheduled'].includes(event.status);
                        return (
                          <TableRow key={event.id} onDoubleClick={() => handleEventDoubleClick(event)} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <div className="font-medium">{event.company_name}</div>
                              <div className="text-sm text-muted-foreground">{event.contact_name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="capitalize">{event.type === 'meeting' ? event.meeting_type || 'Meeting' : 'Demo'}</div>
                            </TableCell>
                            <TableCell>{event.assigned_to}</TableCell>
                            <TableCell>{formatDateTime(event.start_time)}</TableCell>
                            <TableCell>
                              {event.status === 'Completed' && event.duration_minutes && event.duration_minutes > 0 ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Timer className="h-4 w-4 text-muted-foreground" />
                                  <span>{event.duration_minutes} min</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-center block">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {event.location_text ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="max-w-[200px] truncate" title={event.location_text}>
                                    {event.location_text}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">Location not available</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                {isActionable && !event.actual_start_time && (
                                  <Button
                                    size="sm"
                                    className="bg-background border-green-600 text-green-600 hover:bg-green-50"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); handleCaptureLocation(event); }}
                                    disabled={startingEvents.has(event.id)}
                                  >
                                    {startingEvents.has(event.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start"}
                                  </Button>
                                )}

                                {!!event.actual_start_time && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-background border-red-600 text-red-600 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleEndEvent(event); }}
                                    disabled={startingEvents.has(event.id) || !!event.actual_end_time}
                                  >
                                    {startingEvents.has(event.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : "End"}
                                  </Button>
                                )}

                                {(event.status !== 'Completed' || (!!event.actual_end_time && !event.remark)) && (
                                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none" variant="ghost" onClick={e => e.stopPropagation()}>
                                    <Link href={linkHref}><Check className="h-4 w-4" /> Done</Link>
                                  </Button>
                                )}

                                {(isActionable || event.status === 'Completed') && renderActionMenu(event)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No events match your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {
        totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm text-muted-foreground">Items per page</Label>
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
                  {[10, 25, 50, 100].map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} (Total {totalCount})</div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
            </div>
          </div>
        )
      }

      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        event={selectedEvent}
      />

      <RescheduleModal
        isOpen={modalType === 'reschedule'}
        onClose={() => setModalType(null)}
        event={eventToEdit}
        onSuccess={handleSuccess}
        currentUser={currentUser}
      />
      <ReassignModal
        isOpen={modalType === 'reassign'}
        onClose={() => setModalType(null)}
        event={eventToEdit}
        onSuccess={handleSuccess}
        currentUser={currentUser}
        salesPersons={salesPersons}
      />
      <CancelEventModal
        isOpen={modalType === 'cancel'}
        onClose={() => setModalType(null)}
        event={eventToEdit}
        onSuccess={handleSuccess}
        currentUser={currentUser}
      />
      <EditNotesModal
        isOpen={modalType === 'editNotes'}
        onClose={() => setModalType(null)}
        event={eventToEdit}
        onSuccess={handleSuccess}
        currentUser={currentUser}
      />

      <ManualLocationModal
        isOpen={isManualLocationOpen}
        onClose={() => setIsManualLocationOpen(false)}
        event={eventForManualLocation}
        onSuccess={() => {
          setIsManualLocationOpen(false);
          loadEvents();
        }}
      />
    </div >
  )

}

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EnhancedEvent | null;
}

const EventDetailModal = ({ isOpen, onClose, event }: EventDetailModalProps) => {
  if (!event) return null;

  const allParticipants = Array.from(new Set([event.assigned_to, ...event.attendees]));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl capitalize">{event.type} Details</DialogTitle>
          <DialogDescription>
            For {event.company_name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="status" className="text-right font-semibold flex items-center justify-end gap-2">
              Status
            </Label>
            <div id="status" className="col-span-2">
              <Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge>
            </div>
          </div>
          {event.type === 'meeting' && event.meeting_type && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="meeting-type" className="text-right font-semibold flex items-center justify-end gap-2">
                Meeting Type
              </Label>
              <p id="meeting-type" className="col-span-2">{event.meeting_type}</p>
            </div>
          )}

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="scheduled-by" className="text-right font-semibold flex items-center justify-end gap-2">
              <User className="h-4 w-4" /> Scheduled By
            </Label>
            <p id="scheduled-by" className="col-span-2">{event.createdBy}</p>
          </div>

          <div className="grid grid-cols-3 items-start gap-4">
            <Label htmlFor="attendees" className="text-right font-semibold flex items-start justify-end gap-2 pt-1">
              <Users className="h-4 w-4" /> Attendees
            </Label>
            <div id="attendees" className="col-span-2 flex flex-wrap gap-1">
              {allParticipants.map(attendee => (
                <Badge key={attendee} variant="secondary" className="font-normal">{attendee}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="created-at" className="text-right font-semibold flex items-center justify-end gap-2">
              <Clock className="h-4 w-4" /> Scheduled On
            </Label>
            <p id="created-at" className="col-span-2">{formatDateTime(event.createdAt)}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="event-time" className="text-right font-semibold flex items-center justify-end gap-2">
              <Calendar className="h-4 w-4" /> Event Time
            </Label>
            <p id="event-time" className="col-span-2">{formatDateTime(event.start_time)}</p>
          </div>

          {event.location_text && (
            <div className="grid grid-cols-3 items-start gap-4">
              <Label htmlFor="location" className="text-right font-semibold flex items-start justify-end gap-2 pt-1">
                <MapPin className="h-4 w-4" /> Start Location
              </Label>
              <p id="location" className="col-span-2 text-sm">{event.location_text}</p>
            </div>
          )}

          {event.end_location_text && (
            <div className="grid grid-cols-3 items-start gap-4">
              <Label htmlFor="end_location" className="text-right font-semibold flex items-start justify-end gap-2 pt-1">
                <MapPin className="h-4 w-4 text-red-500" /> End Location
              </Label>
              <p id="end_location" className="col-span-2 text-sm">{event.end_location_text}</p>
            </div>
          )}

          {event.status === 'Completed' && event.duration_minutes && event.duration_minutes > 0 && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="duration" className="text-right font-semibold flex items-center justify-end gap-2">
                <Timer className="h-4 w-4" /> Time Taken
              </Label>
              <p id="duration" className="col-span-2">{event.duration_minutes} minutes</p>
            </div>
          )}

          {event.status === 'Completed' && event.remark && (
            <div className="grid grid-cols-3 items-start gap-4 pt-4 border-t">
              <Label htmlFor="notes" className="text-right font-semibold flex items-start justify-end gap-2 pt-1">
                <FileText className="h-4 w-4" /> Post-Event Notes
              </Label>
              <p id="notes" className="col-span-2 text-sm bg-muted/70 p-3 rounded-md whitespace-pre-wrap">{event.remark}</p>
            </div>
          )}

          {event.status === 'Canceled' && event.remark && (
            <div className="grid grid-cols-3 items-start gap-4 pt-4 border-t">
              <Label htmlFor="cancellation-reason" className="text-right font-semibold flex items-start justify-end gap-2 pt-1 text-destructive">
                <XCircle className="h-4 w-4" /> Cancellation Reason
              </Label>
              <p id="cancellation-reason" className="col-span-2 text-sm bg-muted/70 p-3 rounded-md whitespace-pre-wrap">{event.remark}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ManualLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EnhancedEvent | null;
  onSuccess: () => void;
}

const ManualLocationModal = ({ isOpen, onClose, event, onSuccess }: ManualLocationModalProps) => {
  const { toast } = useToast();
  const [manualLocation, setManualLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!event) return null;

  const handleSaveManualLocation = async () => {
    if (!manualLocation.trim()) {
      toast({ title: "Error", description: "Please enter a location.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save with empty coordinates and location text
      if (event.type === 'meeting') {
        await api.saveMeetingLocation(event.numericId, {
          Latitude: 0,
          Longitude: 0,
          LocationText: manualLocation.trim()
        });
      } else {
        await api.saveDemoLocation(event.numericId, {
          Latitude: 0,
          Longitude: 0,
          LocationText: manualLocation.trim()
        });
      }

      toast({
        title: "Location Saved",
        description: `Manual location recorded: ${manualLocation.trim()}`,
        variant: "default"
      });

      setManualLocation("");
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to save manual location:", error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Location Manually</DialogTitle>
          <DialogDescription>
            GPS is unavailable. Please enter your current location for {event.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manual-location" className="text-sm font-medium">
              Exact Location <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="manual-location"
              placeholder="e.g., C21 Mall, Approved Area, Indore OR Building Name, Street Name, Area"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Include specific landmarks, mall names, street names, or area names for accuracy
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveManualLocation} disabled={isSubmitting || !manualLocation.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
