"use client";
import { useState, useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api, clientApi, ApiUser, ApiLeadSearchResult, SalesPerson } from "@/lib/api";
import { Loader2, Mic, MicOff } from "lucide-react";
import { debounce } from "lodash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
    currentUser: ApiUser;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const getDefaultDateTimeLocal = () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(12, 0, 0, 0);
    const timezoneOffset = targetDate.getTimezoneOffset();
    const adjustedDate = new Date(targetDate.getTime() - (timezoneOffset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
};

const convertLocalStringToUtcIso = (localString: string): string => {
    if (!localString) return "";
    const localDate = new Date(localString);
    return localDate.toISOString();
};

const getCurrentLocalISOString = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset();
    const adjustedDate = new Date(now.getTime() - (timezoneOffset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
};

export function ScheduleActivityModal({ currentUser, isOpen, onClose, onSuccess }: ModalProps) {
    const { toast } = useToast();
    const [allLeads, setAllLeads] = useState<ApiLeadSearchResult[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<ApiLeadSearchResult[]>([]);
    const [hasFetchedInitialLeads, setHasFetchedInitialLeads] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [isFetchingLeads, setIsFetchingLeads] = useState(false);

    // ======================================================
    // --- START OF CHANGE: Updated state for new fields ---
    // ======================================================
    const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
    const [formData, setFormData] = useState({
        leadId: "",
        details: "",
        activityType: "",
        remindDateTime: getDefaultDateTimeLocal(),
        createdBy: "",
        assignedTo: "",
    });

    const [otherActivityType, setOtherActivityType] = useState("");
    const [textBeforeListening, setTextBeforeListening] = useState("");
    const [activityTypeOptions, setActivityTypeOptions] = useState<string[]>([]);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    useEffect(() => {
        if (isOpen) {
            // Reset form initially
            setFormData({
                leadId: "",
                details: "",
                activityType: "",
                remindDateTime: getDefaultDateTimeLocal(),
                createdBy: currentUser.username,
                assignedTo: "",  // Will be updated after fetching sales persons
            });
            setOtherActivityType("");
            resetTranscript();
            setFilteredLeads([]);
            setHasFetchedInitialLeads(false);

            setIsFetchingData(true);
            Promise.all([
                api.getByCategory("activity_type"),
                api.getSalesPersons() // Fetch sales persons
            ]).then(([activityTypesData, salesPersonsData]) => {
                const types = activityTypesData.map(item => item.value);
                setActivityTypeOptions([...types, "Other"]);

                // Construct updates for formData
                const updates: any = {};

                if (types.length > 0) {
                    updates.activityType = types[0];
                }

                setSalesPersons(salesPersonsData || []);

                // Find current user's employee_id from freshly fetched salesPersonsData
                const currentUserPerson = (salesPersonsData || []).find(p => p.employee_name === currentUser.username);
                if (currentUserPerson) {
                    updates.assignedTo = (currentUserPerson.employee_i_d || currentUserPerson.employee_id)?.toString() || "";
                }

                setFormData(prev => ({ ...prev, ...updates }));

            }).catch(() => toast({ title: "Error", description: "Failed to fetch initial data." }))
                .finally(() => setIsFetchingData(false));
        }
    }, [isOpen, currentUser, toast, resetTranscript]); // removed salesPersons from dependency

    const handleLeadDropdownOpen = async (open: boolean) => {
        if (open && !hasFetchedInitialLeads) {
            setIsFetchingLeads(true);
            try {
                const [leadsResults, clientsResults] = await Promise.all([
                    api.getAllLeads(),
                    clientApi.getAllClients()
                ]);

                // Map leads to ApiLeadSearchResult format
                // api.getAllLeads returns PascalCase for new leads page
                const leads = leadsResults.map((lead: any) => ({
                    id: lead.LedgerID || lead.id,
                    company_name: lead.CompanyName || lead.company_name || "",
                    ledger_name: lead.LedgerName || lead.ledger_name || "",
                    sales_person_name: lead.SalesPersonName || lead.sales_person_name || "",
                    ref_sales_representative_id: lead.RefSalesRepresentativeID
                }));

                // Map clients to ApiLeadSearchResult format
                // clientApi.getAllClients usually returns snake_case
                const clients = clientsResults.map((client: any) => ({
                    id: client.id || client.LedgerID,
                    company_name: client.company_name || client.LedgerName || "",
                    ledger_name: client.LedgerName || client.company_name || "",
                    sales_person_name: client.SalesPersonName || client.sales_person_name || "",
                    ref_sales_representative_id: client.ref_sales_representative_id
                }));

                // Merge and remove duplicates if any (based on ID)
                const allItems = [...leads, ...clients];
                const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

                // Note: ApiLeadSearchResult needs to be extended or casted to include extended props
                setAllLeads(uniqueItems as any);
                setFilteredLeads(uniqueItems as any);
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

    useEffect(() => {
        if (listening) {
            const combinedText = [textBeforeListening, transcript].filter(Boolean).join(' ');
            setFormData(prev => ({ ...prev, details: combinedText }));

            // Auto-stop silence detection
            const timer = setTimeout(() => {
                SpeechRecognition.stopListening();
            }, 3000); // 3 seconds silence

            return () => clearTimeout(timer);
        }
    }, [transcript, listening, textBeforeListening]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.leadId || !formData.details.trim() || !formData.remindDateTime || !formData.createdBy || !formData.assignedTo) {
            toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
            return;
        }

        const selectedDate = new Date(formData.remindDateTime);
        const now = new Date();
        if (selectedDate < now) {
            toast({ title: "Error", description: "Cannot schedule for a past date/time.", variant: "destructive" });
            return;
        }

        const finalActivityType = formData.activityType === 'Other' ? otherActivityType.trim() : formData.activityType;
        if (!finalActivityType) {
            toast({ title: "Error", description: "Please specify the activity type.", variant: "destructive" });
            return;
        }

        // Convert employee_id back to employee_name for API
        const assignedPerson = salesPersons.find(p => (p.employee_i_d || p.employee_id)?.toString() === formData.assignedTo);
        if (!assignedPerson) {
            toast({ title: "Error", description: "Assigned person not found.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const utcIsoString = convertLocalStringToUtcIso(formData.remindDateTime);
            if (!utcIsoString) { throw new Error("Invalid date format"); }

            // ======================================================
            // --- START OF CHANGE: Updated payload for backend ---
            // ======================================================
            const payload = {
                lead_id: Number(formData.leadId),
                message: formData.details.trim(),
                activity_type: finalActivityType,
                created_by: formData.createdBy, // Send the name (current user's username)
                assigned_to: assignedPerson.employee_name, // Convert ID to name
                remind_time: utcIsoString,
                status: "Pending"
            };
            // ======================================================
            // --- END OF CHANGE ---
            // ======================================================

            await api.scheduleReminder(payload);
            toast({ title: "Success", description: "Reminder has been scheduled successfully." });
            onSuccess();
            onClose();

        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMicClick = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            setTextBeforeListening(formData.details);
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule a Future Activity</DialogTitle>
                    <DialogDescription>
                        This will create a pending reminder for you to complete later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2 ">
                        <Label>Ledger Name *</Label>
                        <Select
                            required
                            value={formData.leadId}
                            onValueChange={(value) => {
                                // Find the selected lead
                                const selectedLead = allLeads.find(l => String(l.id) === value);
                                let updates: any = { leadId: value };

                                if (selectedLead && (selectedLead as any).ref_sales_representative_id) {
                                    const spId = (selectedLead as any).ref_sales_representative_id.toString();
                                    // Check if this salesperson exists in our list
                                    const sp = salesPersons.find(p => (p.employee_i_d || p.employee_id)?.toString() === spId);
                                    if (sp) {
                                        updates.assignedTo = spId;
                                    }
                                }
                                setFormData(prev => ({ ...prev, ...updates }));
                            }}
                            onOpenChange={handleLeadDropdownOpen}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select or search for a ledger..." />
                            </SelectTrigger>
                            <SelectContent className="max-w-[90vw] w-[400px] max-h-[400px]" position="popper" sideOffset={5}>
                                <div className="p-2">
                                    <Input
                                        placeholder="Search by ledger/company name..."
                                        onChange={(e) => searchLeads(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                <ScrollArea className="h-[200px] overflow-x-auto">
                                    {isFetchingLeads ? (
                                        <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                    ) : filteredLeads.length > 0 ? (
                                        filteredLeads.map((lead, index) => <SelectItem key={`lead-${lead.id}-${index}`} value={String(lead.id)} className="truncate max-w-full">{lead.ledger_name || lead.company_name}</SelectItem>)
                                    ) : (
                                        <div className="p-2 text-center text-sm text-muted-foreground">No ledgers found.</div>
                                    )}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ====================================================== */}
                    {/* --- START OF CHANGE: New layout for fields --- */}
                    {/* ====================================================== */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Activity Type *</Label>
                            <Select value={formData.activityType} onValueChange={(value) => setFormData({ ...formData, activityType: value })}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-w-[90vw]" position="popper" sideOffset={5}>{activityTypeOptions.map(type => <SelectItem key={type} value={type} className="truncate">{type}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="remind-datetime">Date & Time *</Label>
                            <Input
                                id="remind-datetime"
                                type="datetime-local"
                                value={formData.remindDateTime}
                                onChange={(e) => setFormData({ ...formData, remindDateTime: e.target.value })}
                                required
                                min={isOpen ? getCurrentLocalISOString() : undefined}
                            />
                        </div>
                    </div>

                    {formData.activityType === 'Other' && (
                        <div className="space-y-2">
                            <Label>Custom Activity Type *</Label>
                            <Input value={otherActivityType} onChange={(e) => setOtherActivityType(e.target.value)} placeholder="e.g., Site Visit" required />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Assigned To *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {formData.assignedTo
                                        ? salesPersons.find((sp) => (sp.employee_i_d || sp.employee_id)?.toString() === formData.assignedTo)?.employee_name
                                        : "Select sales person..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[90vw] p-0" sideOffset={5}>
                                <Command>
                                    <CommandInput placeholder="Search sales person..." />
                                    <CommandEmpty>No sales person found.</CommandEmpty>
                                    <CommandGroup>
                                        <ScrollArea className="h-[200px] overflow-x-auto">
                                            {salesPersons.map((sp) => {
                                                const employeeId = (sp.employee_i_d || sp.employee_id)?.toString() || '';
                                                return (
                                                    <CommandItem
                                                        key={employeeId}
                                                        value={sp.employee_name}
                                                        onSelect={() => {
                                                            setFormData({ ...formData, assignedTo: employeeId });
                                                        }}
                                                        className="truncate"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 flex-shrink-0",
                                                                formData.assignedTo === employeeId ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {sp.employee_name}
                                                    </CommandItem>
                                                );
                                            })}
                                        </ScrollArea>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="details-schedule">Reminder Details *</Label>
                        <div className="relative">
                            <Textarea
                                id="details-schedule"
                                placeholder="e.g., Follow up on the proposal. Or click the mic to speak."
                                rows={4}
                                required
                                value={formData.details}
                                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                className="resize-y break-all pr-10 max-h-24"
                            />
                            {browserSupportsSpeechRecognition && (
                                <Button type="button" variant="ghost" size="icon" onClick={handleMicClick} className="absolute bottom-2 right-2 h-7 w-7">
                                    {listening ? <MicOff className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />}
                                    <span className="sr-only">Toggle microphone</span>
                                </Button>
                            )}
                        </div>
                        {listening && <p className="text-xs text-muted-foreground animate-pulse mt-1">Listening...</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || isFetchingData}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Schedule Reminder
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}