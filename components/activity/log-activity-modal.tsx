//frontend/components/activity/log-activity-modal.tsx 
"use client"
import { useState, useEffect, useCallback } from "react"
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mic, MicOff, Paperclip, XCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, ApiUser, ApiLeadSearchResult, SalesPerson, clientApi } from "@/lib/api"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { debounce } from "lodash";

interface ModalProps {
    currentUser: ApiUser;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function LogActivityModal({ currentUser, isOpen, onClose, onSuccess }: ModalProps) {
    const { toast } = useToast();
    const [allLeads, setAllLeads] = useState<ApiLeadSearchResult[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<ApiLeadSearchResult[]>([]);
    const [hasFetchedInitialLeads, setHasFetchedInitialLeads] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [isFetchingLeads, setIsFetchingLeads] = useState(false);
    const [formData, setFormData] = useState({ leadId: "", details: "", activityType: "", duration_minutes: "", createdBy: "" });
    const [otherActivityType, setOtherActivityType] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [textBeforeListening, setTextBeforeListening] = useState("");
    const [activityTypeOptions, setActivityTypeOptions] = useState<string[]>([]);
    const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    useEffect(() => {
        if (isOpen) {
            setFormData({ leadId: "", details: "", activityType: "", duration_minutes: "", createdBy: "" });
            setOtherActivityType("");
            setSelectedFile(null);
            resetTranscript();
            setFilteredLeads([]);
            setHasFetchedInitialLeads(false);

            const fetchData = async () => {
                setIsFetchingData(true);
                try {
                    const [activityTypesData, salesPersonsData] = await Promise.all([
                        api.getByCategory("activity_type"),
                        api.getSalesPersons()
                    ]);
                    const types = activityTypesData.map(item => item.value);
                    setActivityTypeOptions([...types, "Other"]);
                    setSalesPersons(salesPersonsData);
                    if (types.length > 0) {
                        setFormData(prev => ({ ...prev, activityType: types[0] }));
                    }
                } catch (error) {
                    toast({ title: "Error", description: "Failed to fetch data." });
                } finally {
                    setIsFetchingData(false);
                }
            };
            fetchData();
        }
    }, [isOpen, toast, resetTranscript]);

    const handleLeadDropdownOpen = async (open: boolean) => {
        if (open && !hasFetchedInitialLeads) {
            setIsFetchingLeads(true);
            try {
                const [leadsResults, clientsResults] = await Promise.all([
                    api.getAllLeads(),
                    clientApi.getAllClients()
                ]);

                // Map leads to ApiLeadSearchResult format
                // RefSalesRepresentativeID should be available from api.getAllLeads (PascalCase)
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

                // Filter out invalid IDs
                const validItems = uniqueItems.filter(item => item.id && item.id !== 0);

                setAllLeads(validItems as any);
                setFilteredLeads(validItems as any);
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
            const combinedText = [textBeforeListening, transcript]
                .filter(Boolean)
                .join(' ');
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
        if (!formData.leadId || !formData.details.trim() || !formData.duration_minutes || !formData.createdBy) {
            toast({ title: "Error", description: "Please complete all required fields.", variant: "destructive" });
            return;
        }
        setIsLoading(true);

        const finalActivityType = formData.activityType === 'Other' ? otherActivityType.trim() : formData.activityType;
        if (!finalActivityType) {
            toast({ title: "Error", description: "Please specify the activity type.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const duration = Number.parseInt(formData.duration_minutes, 10);
        if (isNaN(duration) || duration <= 0) {
            toast({ title: "Error", description: "Please enter a valid, positive number for the duration.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        // Convert employee_id back to employee_name for API
        const selectedPerson = salesPersons.find(p => (p.employee_i_d || p.employee_id)?.toString() === formData.createdBy);
        if (!selectedPerson) {
            toast({ title: "Error", description: "Selected person not found.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            let attachmentPath: string | null = null;
            if (selectedFile) {
                const uploadResponse = await api.uploadActivityAttachment(selectedFile);
                if (uploadResponse && uploadResponse.file_path) {
                    attachmentPath = uploadResponse.file_path;
                } else {
                    throw new Error("File upload failed to return a path.");
                }
            }

            const payload = {
                LeadId: Number(formData.leadId),
                Details: formData.details,
                Phase: "Activity Logged",
                ActivityType: finalActivityType,
                CreatedBy: selectedPerson.employee_name,
                AttachmentPath: attachmentPath,
                DurationMinutes: duration,
            };

            await api.logActivity(payload as any);
            toast({ title: "Success", description: "Activity logged successfully." });
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log a Past Activity</DialogTitle>
                    <DialogDescription>Record the details of a completed interaction with a lead.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
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
                                            updates.createdBy = spId;
                                        }
                                    }
                                    setFormData(prev => ({ ...prev, ...updates }));
                                }}
                                onOpenChange={handleLeadDropdownOpen}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select or search for a ledger..." />
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
                                            <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                        ) : filteredLeads.length > 0 ? (
                                            filteredLeads.map((lead, index) => <SelectItem key={`lead-${lead.id}-${index}`} value={String(lead.id)} className="truncate">{lead.ledger_name || lead.company_name}</SelectItem>)
                                        ) : (
                                            <div className="p-2 text-center text-sm text-muted-foreground">No ledgers found.</div>
                                        )}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Activity Type *</Label>
                                <Select value={formData.activityType} onValueChange={(value) => setFormData({ ...formData, activityType: value })}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-w-[90vw]" position="popper" sideOffset={5}>
                                        {activityTypeOptions.map(type => <SelectItem key={type} value={type} className="truncate">{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration_minutes">Time Taken (minutes) *</Label>
                                <Input
                                    id="duration_minutes"
                                    type="number"
                                    placeholder="e.g., 30"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                                    required
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {formData.activityType === 'Other' && (
                        <div className="space-y-2">
                            <Label>Custom Activity Type *</Label>
                            <Input
                                value={otherActivityType}
                                onChange={(e) => setOtherActivityType(e.target.value)}
                                placeholder="e.g., Site Visit"
                                required
                            />
                        </div>
                    )}

                    {/* Attachment and Created By in two columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="attachment">Attachment (Optional)</Label>
                            {!selectedFile ? (
                                <div className="relative flex items-center">
                                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="attachment"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="pl-9 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                    <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Created By *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                    >
                                        {formData.createdBy
                                            ? salesPersons.find((person) => (person.employee_i_d || person.employee_id)?.toString() === formData.createdBy)?.employee_name
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
                                                {salesPersons.map((person) => {
                                                    const employeeId = (person.employee_i_d || person.employee_id)?.toString() || '';
                                                    return (
                                                        <CommandItem
                                                            key={employeeId}
                                                            value={person.employee_name}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, createdBy: employeeId });
                                                            }}
                                                            className="truncate"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 flex-shrink-0",
                                                                    formData.createdBy === employeeId ? "opacity-100" : "opacity-0"
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
                    </div>

                    {/* Activity Details */}
                    <div className="space-y-2">
                        <Label htmlFor="details">Activity Details / Outcome *</Label>
                        <div className="relative">
                            <Textarea
                                id="details"
                                placeholder="e.g., Called the client... Or click the mic to speak."
                                rows={4}
                                required
                                value={formData.details}
                                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                className="resize-y max-h-24 pr-10"
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
                            Log Activity
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}