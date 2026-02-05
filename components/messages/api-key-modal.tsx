"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { interaktApi } from "@/lib/api";

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchApiKey();
        }
    }, [isOpen]);

    const fetchApiKey = async () => {
        setIsLoading(true);
        try {
            const data = await interaktApi.getApiKey();
            setApiKey(data.apiKey || "");
        } catch (error) {
            console.error("Failed to fetch API key", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await interaktApi.saveApiKey(apiKey);
            toast({ title: "Success", description: "API Key saved successfully." });
            onClose();
        } catch (error) {
            console.error("Failed to save API key", error);
            toast({ title: "Error", description: "Failed to save API Key.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Interakt API Configuration</DialogTitle>
                    <DialogDescription>
                        Enter your Interakt API Key to enable syncing.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="TmlXajdldEh..."
                            className="col-span-4"
                            type="password"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Configuration"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
