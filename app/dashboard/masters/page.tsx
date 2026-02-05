// frontend/app/dashboard/masters/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { masterDataApi, type ApiMasterData } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MASTER_CATEGORIES = [
    { key: "status", label: "Lead Status" },
    { key: "CustomerType", label: "Cust. Type" },
    { key: "CustomerCategory", label: "Cust. Category" },
    { key: "SupplyTypeCode", label: "Supply Type" },
    { key: "activity_type", label: "Activity Type" },
    { key: "meeting_type", label: "Meeting Type" },
    { key: "reason", label: "Reason" },
];

export default function MastersPage() {
    const { toast } = useToast();
    const [activeCategory, setActiveCategory] = useState(MASTER_CATEGORIES[0].key);
    const [items, setItems] = useState<ApiMasterData[]>([]);
    const [newItemValue, setNewItemValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchItems = useCallback(async (category: string) => {
        setIsLoading(true);
        try {
            // --- START OF FIX: Use the correct API object ---
            const data = await masterDataApi.getByCategory(category);
            // --- END OF FIX ---
            setItems(data || []); // Ensure data is an array
        } catch (error) {
            console.error(`Failed to fetch ${category}:`, error);
            toast({
                title: "Error",
                description: `Could not load data for ${category}.`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchItems(activeCategory);
    }, [activeCategory, fetchItems]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemValue.trim()) return;
        setIsSubmitting(true);
        try {
            const newItem = await masterDataApi.create({ category: activeCategory, value: newItemValue });
            setItems(prev => [...prev, newItem].sort((a, b) => a.value.localeCompare(b.value)));
            setNewItemValue("");
            toast({ title: "Success", description: "New item added successfully." });
        } catch (error) {
            console.error("Failed to add item:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not add the new item.";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
        try {
            await masterDataApi.delete(itemId);
            setItems(prev => prev.filter(item => item.id !== itemId));
            toast({ title: "Success", description: "Item deleted successfully." });
        } catch (error) {
            console.error("Failed to delete item:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not delete the item.";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const filteredItems = useMemo(() =>
        items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase())),
        [items, searchTerm]);

    const activeCategoryLabel = MASTER_CATEGORIES.find(c => c.key === activeCategory)?.label || "Items";

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
            <div className="space-y-1">
                {/* <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Masters Configuration</h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage dropdown options used across the CRM.</p> */}
            </div>

            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto">
                    {MASTER_CATEGORIES.map(cat => (
                        <TabsTrigger
                            key={cat.key}
                            value={cat.key}
                            className="text-xs md:text-sm px-1 py-2"
                        >
                            {cat.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <Card>
                <CardHeader className="space-y-1 p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl">Manage {activeCategoryLabel}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Add, view, and delete options for the {activeCategoryLabel} field.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                    <div className="space-y-4">
                        <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Input
                                placeholder={`New ${activeCategoryLabel} Name...`}
                                value={newItemValue}
                                onChange={e => setNewItemValue(e.target.value)}
                                disabled={isSubmitting}
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newItemValue.trim()}
                                className="w-full sm:w-auto whitespace-nowrap"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </form>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        <div className="rounded-md border max-h-96 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary">
                                    <TableRow>
                                        <TableHead className="text-sm md:text-base">{activeCategoryLabel} Name</TableHead>
                                        <TableHead className="text-right w-[80px] md:w-[100px] text-sm md:text-base">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={2} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : filteredItems.length > 0 ? (
                                        filteredItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium text-sm md:text-base break-words">{item.value}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-8 w-8">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground text-sm">No items found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}