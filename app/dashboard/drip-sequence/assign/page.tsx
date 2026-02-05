// frontend/app/dashboard/drip-sequence/assign/page.tsx 
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api, ApiDripSequenceList, ApiLead } from "@/lib/api";
import { ChevronLeft, Loader2, Workflow } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Component for a single Drip Assignment Card
function AssignDripCard({ drip, leads }: { drip: ApiDripSequenceList; leads: ApiLead[] }) {
    const [selectedLeads, setSelectedLeads] = useState<ApiLead[]>([]);
    const [openPopover, setOpenPopover] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleAssign = async () => {
        if (selectedLeads.length === 0) {
            toast({ title: "No leads selected", description: "Please select at least one lead to assign this drip to.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            // Filter out leads without IDs and map to API calls
            const validLeads = selectedLeads.filter(lead => lead.id !== undefined);
            if (validLeads.length === 0) {
                toast({ title: "Error", description: "Selected leads have no valid IDs.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            const promises = validLeads.map(lead => api.assignDripToLead(lead.id!, drip.id));
            const results = await Promise.allSettled(promises);

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const errorCount = results.length - successCount;

            toast({
                title: "Assignment Complete",
                description: `${successCount} drip(s) assigned successfully. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
            });

            setSelectedLeads([]); // Reset selection after assignment
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred during assignment.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    {drip.drip_name}
                </CardTitle>
                <CardDescription>Code: {drip.drip_code}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Leads to Assign</label>
                    <Popover open={openPopover} onOpenChange={setOpenPopover}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openPopover} className="w-full justify-between">
                                <span className="truncate">
                                    {selectedLeads.length > 0 ? `${selectedLeads.length} lead(s) selected` : "Select leads..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search leads..." />
                                <CommandList>
                                    <CommandEmpty>No leads found.</CommandEmpty>
                                    <CommandGroup>
                                        {leads.map((lead, index) => {
                                            // Ensure key is unique even if IDs are duplicated
                                            const leadKey = `lead-${lead.id || 'missing'}-${index}`;
                                            return (
                                                <CommandItem
                                                    key={leadKey}
                                                    value={lead.company_name}
                                                    onSelect={() => {
                                                        const isSelected = selectedLeads.some(sl => sl.id === lead.id);
                                                        if (isSelected) {
                                                            setSelectedLeads(selectedLeads.filter(sl => sl.id !== lead.id));
                                                        } else {
                                                            setSelectedLeads([...selectedLeads, lead]);
                                                        }
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedLeads.some(sl => sl.id === lead.id) ? "opacity-100" : "opacity-0")} />
                                                    {lead.company_name}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-1 pt-2">
                        {selectedLeads.map((lead, index) => (
                            <Badge key={`selected-${lead.id || 'missing'}-${index}`} variant="secondary">{lead.company_name}</Badge>
                        ))}
                    </div>
                </div>
                <Button onClick={handleAssign} disabled={isLoading || selectedLeads.length === 0} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Assign Drip to {selectedLeads.length || ''} Lead(s)
                </Button>
            </CardContent>
        </Card>
    );
}

// Main Page Component
export default function AssignDripPage() {
    const [drips, setDrips] = useState<ApiDripSequenceList[]>([]);
    const [leads, setLeads] = useState<ApiLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [dripsData, leadsData] = await Promise.all([
                    api.getDripSequences(),
                    api.getAllLeads(),
                ]);
                setDrips(dripsData || []);

                // Map raw leads data (PascalCase) to ApiLead format (snake_case)
                const mappedLeads: ApiLead[] = (leadsData || []).map((l: any) => ({
                    id: l.LedgerID || l.ledger_id,
                    company_name: l.LedgerName || l.ledger_name || l.MailingName || "Unknown Company",
                    ...l // Keep other properties if needed
                }));

                setLeads(mappedLeads);
            } catch (error) {
                console.error("Error fetching data:", error);
                // Still set empty arrays so the page doesn't break
                setDrips([]);
                setLeads([]);
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch required data.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/drip-sequence">
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assign Drip Sequence</h1>
                    <p className="text-muted-foreground">Choose a sequence and assign it to one or more leads.</p>
                </div>
            </div>
            {leads.length === 0 && drips.length > 0 && (
                <Card className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-semibold mb-2">No Leads Available</p>
                    <p>You need to create leads/ledgers before assigning drip sequences.</p>
                </Card>
            )}
            {drips.length === 0 && (
                <Card className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-semibold mb-2">No Drip Sequences Available</p>
                    <p>You haven't created any drip sequences yet. Please create one first.</p>
                </Card>
            )}
            {drips.length > 0 && leads.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {drips.map(drip => (
                        <AssignDripCard key={drip.id} drip={drip} leads={leads} />
                    ))}
                </div>
            )}
        </div>
    );
}