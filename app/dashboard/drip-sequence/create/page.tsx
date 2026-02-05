// frontend/app/dashboard/drip-sequence/create/page.tsx
"use client";

import { CreateDripForm } from "@/components/drips/create-drip-form";
import { ApiUser } from "@/lib/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function CreateDripPage() {
    const [user, setUser] = useState<ApiUser | null>(null);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            router.push("/login");
        }
    }, [router]);

    if (!user) return <div>Loading user information...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/drip-sequence">
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create Drip Sequence</h1>
                    <p className="text-muted-foreground">Build a new automated messaging sequence.</p>
                </div>
            </div>
            <CreateDripForm currentUser={user} />
        </div>
    );
}