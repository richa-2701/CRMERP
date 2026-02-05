// frontend/app/dashboard/drip-sequence/[dripId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { CreateDripForm } from "@/components/drips/create-drip-form";
import { api, ApiUser, ApiDripSequence } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function EditDripPage() {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [dripData, setDripData] = useState<ApiDripSequence | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const dripId = params.dripId as string;

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        if (dripId) {
            const fetchDripData = async () => {
                setIsLoading(true);
                try {
                    const data = await api.getDripSequenceById(Number(dripId));
                    setDripData(data);
                } catch (error) {
                    toast({ title: "Error", description: "Failed to fetch drip sequence data.", variant: "destructive" });
                    router.push("/dashboard/drip-sequence"); // Redirect if not found
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDripData();
        }
    }, [dripId, router, toast]);

    if (!user || isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading drip sequence...</span>
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
                    <h1 className="text-3xl font-bold tracking-tight">Edit Drip Sequence</h1>
                    <p className="text-muted-foreground">Modify the details and steps of this sequence.</p>
                </div>
            </div>
            {/* We will pass the existing data to the form */}
            <CreateDripForm currentUser={user} existingDrip={dripData} />
        </div>
    );
}