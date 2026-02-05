//frontend/components/tasks/create-task-modal.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Calendar as CalendarIcon, ChevronsUpDown, X } from "lucide-react"
import { format } from "date-fns"
import { debounce } from "lodash"

import { api, ApiUser, ApiLeadSearchResult, SalesPerson, clientApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CreateTaskModalProps {
    currentUser: ApiUser;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateTaskModal({ currentUser, isOpen, onClose, onSuccess }: CreateTaskModalProps) {
    const [title, setTitle] = useState("")
    const [details, setDetails] = useState("")
    const [dueDate, setDueDate] = useState<Date | undefined>()
    const [dueTime, setDueTime] = useState("12:00");
    const [assignedToUserId, setAssignedToUserId] = useState<string>("")
    const [selectedLeads, setSelectedLeads] = useState<ApiLeadSearchResult[]>([]);

    const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
    const [allLeads, setAllLeads] = useState<ApiLeadSearchResult[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<ApiLeadSearchResult[]>([]);
    const [isFetchingLeads, setIsFetchingLeads] = useState(false);

    const [leadSearch, setLeadSearch] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLeadPopoverOpen, setIsLeadPopoverOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            api.getSalesPersons().then(setSalesPersons).catch(() => toast.error("Failed to load salesperson list."));

            // Fetch all leads once when modal opens (background loading)
            if (allLeads.length === 0) {
                setIsFetchingLeads(true);
                Promise.all([
                    api.searchLeads(""),
                    clientApi.getAllClients()
                ]).then(([leadsResults, clientsResults]) => {
                    // Map clients to ApiLeadSearchResult format
                    const clients = clientsResults.map((client: any) => ({
                        id: client.id || client.LedgerID,
                        company_name: client.company_name || client.LedgerName || "",
                        ledger_name: client.LedgerName || client.company_name || ""
                    }));

                    // Merge and deduplicate
                    const allItems = [...leadsResults, ...clients];
                    const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

                    setAllLeads(uniqueItems);
                    setFilteredLeads(uniqueItems); // Show all initially
                    setIsFetchingLeads(false);
                }).catch((error) => {
                    console.error("Error fetching leads/clients:", error);
                    toast.error("Could not fetch leads and clients.");
                    setIsFetchingLeads(false);
                });
            } else {
                // If already loaded, just show all
                setFilteredLeads(allLeads);
            }
        } else {
            setTitle(""); setDetails(""); setDueDate(undefined); setDueTime("12:00"); setAssignedToUserId(""); setSelectedLeads([]); setLeadSearch("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const handleLeadPopoverOpenChange = (open: boolean) => {
        setIsLeadPopoverOpen(open);
        if (!open) {
            setLeadSearch("");
            setFilteredLeads(allLeads); // Reset to show all leads
        }
    };

    // Client-side filtering for instant search
    const searchLeads = useCallback((searchTerm: string) => {
        if (!searchTerm || searchTerm.trim().length === 0) {
            setFilteredLeads(allLeads); // Show all if no search term
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const filtered = allLeads.filter(lead =>
            lead.company_name.toLowerCase().includes(lowerSearch)
        );
        setFilteredLeads(filtered);
    }, [allLeads]);

    useEffect(() => {
        const debouncedSearch = debounce(() => searchLeads(leadSearch), 300);
        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [leadSearch, searchLeads]);


    const handleLeadSelect = (lead: ApiLeadSearchResult) => {
        // Check if lead is already selected by ID (not name)
        if (selectedLeads.some(l => l.id === lead.id)) {
            toast.info("This lead is already attached to the task.");
            return;
        }
        setSelectedLeads([...selectedLeads, lead]);
        setLeadSearch("");
        // Don't close popover to allow multiple selections
    };

    const handleRemoveLead = (leadId: number) => {
        setSelectedLeads(selectedLeads.filter(l => l.id !== leadId));
    };

    const handleSubmit = async () => {
        if (!title || !assignedToUserId || !dueDate) {
            toast.warning("Please fill in Title, Assignee, and a valid Due Date/Time.");
            return;
        }
        setIsSubmitting(true);

        const [hours, minutes] = dueTime.split(':').map(Number);
        const finalDueDate = new Date(dueDate);
        finalDueDate.setHours(hours, minutes, 0, 0);

        try {
            await api.createTask({
                title,
                details,
                assigned_to_user_id: parseInt(assignedToUserId),
                created_by_user_id: currentUser.id,
                due_date: finalDueDate.toISOString(),
                lead_id: selectedLeads.length > 0 ? selectedLeads[0].id : undefined,
                lead_ids: selectedLeads.map(l => l.id),
            });
            toast.success("Task created successfully!");
            onSuccess();
        } catch (error: any) {
            toast.error("Failed to create task.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[500px]"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Create a New Task</DialogTitle>
                    <DialogDescription>Assign a task to a user with a due date, time, and optional lead links (multiple leads can be attached).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title *</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" placeholder="e.g., Follow up with Client X" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="details" className="text-right">Details</Label>
                        <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} className="col-span-3" placeholder="Add any relevant details or instructions..." />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="assignee" className="text-right">Assign To *</Label>
                        <Select onValueChange={setAssignedToUserId} value={assignedToUserId}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a salesperson" /></SelectTrigger>
                            <SelectContent className="max-w-[90vw]">
                                {salesPersons.map(sp => {
                                    const employeeId = sp.employee_id || sp.employee_i_d;
                                    return (
                                        <SelectItem key={employeeId} value={employeeId?.toString() || ''} className="truncate">
                                            {sp.employee_name}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dueDate" className="text-right">Due Date *</Label>
                        <div className="col-span-3 flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                            </Popover>
                            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-[120px]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4 pt-2">
                        <Label className="text-right pt-2">Link Lead</Label>
                        <div className="col-span-3 space-y-2">
                            <Popover open={isLeadPopoverOpen} onOpenChange={handleLeadPopoverOpenChange}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={isLeadPopoverOpen} className="w-full justify-between font-normal">
                                        {selectedLeads.length > 0 ? `${selectedLeads.length} lead(s) selected` : "Search to select leads..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[375px] max-w-[90vw] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search by company name..." value={leadSearch} onValueChange={setLeadSearch} />
                                        <CommandList className="max-h-[200px]">
                                            <div className="max-h-[200px] overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
                                                {isFetchingLeads && <div className="p-2 text-center text-sm">Loading all leads...</div>}
                                                {!isFetchingLeads && filteredLeads.length === 0 && <CommandEmpty>No leads found.</CommandEmpty>}
                                                {!isFetchingLeads && filteredLeads.length > 0 && (
                                                    <CommandGroup>
                                                        {filteredLeads.map((lead, index) => (
                                                            <CommandItem
                                                                key={`lead-${lead.id}-${index}`}
                                                                value={`${lead.id}-${lead.company_name}`}
                                                                onSelect={() => handleLeadSelect(lead)}
                                                                className="truncate cursor-pointer"
                                                            >
                                                                {lead.company_name} <span className="text-xs text-muted-foreground ml-2">(ID: {lead.id})</span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                            </div>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {selectedLeads.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {selectedLeads.map((lead) => (
                                        <Badge key={lead.id} variant="secondary">
                                            {lead.company_name}
                                            <button onClick={() => handleRemoveLead(lead.id)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}