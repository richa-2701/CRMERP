// frontend/app/dashboard/drip-sequence/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Users  } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, ApiDripSequenceList } from "@/lib/api";
import { DripsTable } from "@/components/drips/drips-table";

export default function DripMasterPage() {
    const [drips, setDrips] = useState<ApiDripSequenceList[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        fetchDrips();
    }, []);

    const fetchDrips = async () => {
        setIsLoading(true);
        try {
            const data = await api.getDripSequences();
            setDrips(data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch drip sequences.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this drip sequence and all its steps? This action cannot be undone.")) {
            try {
                await api.deleteDripSequence(id);
                toast({ title: "Success", description: "Drip sequence deleted successfully." });
                fetchDrips(); // Refresh the list after deletion
            } catch (error) {
                toast({ title: "Error", description: "Failed to delete drip sequence.", variant: "destructive" });
            }
        }
    };

    const filteredDrips = drips.filter(d =>
        d.drip_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.drip_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                    {/* <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Drip Master</h1> */}
                    <p className="text-sm md:text-base text-muted-foreground">Manage your automated messaging sequences.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/drip-sequence/assign")}
                        className="w-full sm:w-auto justify-center"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Assign Drip to Leads</span>
                    </Button>
                    <Button
                        onClick={() => router.push("/dashboard/drip-sequence/create")}
                        className="w-full sm:w-auto justify-center"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Create Drip Sequence</span>
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader className="p-4 md:p-6">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search drips by name or code..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 md:p-6 md:pt-0">
                    <DripsTable drips={filteredDrips} onDelete={handleDelete} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}