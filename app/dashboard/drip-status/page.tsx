"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface DripLog {
    sent_at: string;
    lead_name: string;
    phone_number: string;
    message_name: string;
    delivery_status: string;
    interakt_message_id: string;
    error_message?: string;
}

export default function DripStatusLog() {
    const [logs, setLogs] = useState<DripLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const data = await api.getDripStatusLogs();
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "queued":
                return "default"; // Black background
            case "sent":
                return "secondary";
            case "delivered":
                return "outline";
            case "read":
                return "outline";
            case "failed":
                return "destructive";
            default:
                return "default";
        }
    };

    return (
        <Card className="m-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Drip Sequences Status Log</CardTitle>
                <button
                    onClick={fetchLogs}
                    className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors"
                >
                    Refresh
                </button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sent At</TableHead>
                                <TableHead>Lead</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Interakt ID / Error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        {new Date(log.sent_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{log.lead_name}</div>
                                        <div className="text-sm text-gray-500">{log.phone_number}</div>
                                    </TableCell>
                                    <TableCell>{log.message_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(log.delivery_status) as any}>
                                            {log.delivery_status || "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={log.error_message || log.interakt_message_id}>
                                        {log.delivery_status === "Failed"
                                            ? <span className="text-red-500">{log.error_message}</span>
                                            : <span className="font-mono text-xs">{log.interakt_message_id}</span>
                                        }
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
