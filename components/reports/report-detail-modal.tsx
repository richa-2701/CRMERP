//frontend/components/reports/report-detail-modal.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Timer, Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react"
import { formatDateTime } from "@/lib/date-format"
import { Badge } from "@/components/ui/badge"
// --- START OF FIX: Import differenceInMinutes ---
import { differenceInMinutes } from "date-fns"
// --- END OF FIX ---

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[] | null;
  dataType: string;
}

function DetailItem({ item, dataType }: { item: any, dataType: string }) {
  switch (dataType) {
    case 'NewLead':
      return (
        <div>
          <p className="font-medium">{item.company_name} <Badge variant="outline">{item.status}</Badge></p>
          <p className="text-xs text-muted-foreground">Contact: {item.contact_name || 'N/A'} ({item.contact_phone || 'N/A'})</p>
          <p className="text-xs text-muted-foreground">Assigned on: {formatDateTime(item.created_at)}</p>
        </div>
      );
    case 'Meeting':
      return (
        <div>
          <div className="flex justify-between items-start">
            <p className="font-medium">{item.company_name}</p>
            {item.duration_minutes > 0 && <Badge variant="secondary" className="flex items-center gap-1"><Timer className="h-3 w-3" />{item.duration_minutes} min</Badge>}
          </div>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{item.remark || "No remarks."}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed on: {formatDateTime(item.event_time)}</p>
        </div>
      );
    case 'Demo':
      return (
        <div>
          <div className="flex justify-between items-start">
            <p className="font-medium">{item.company_name}</p>
            {item.duration_minutes > 0 && <Badge variant="secondary" className="flex items-center gap-1"><Timer className="h-3 w-3" />{item.duration_minutes} min</Badge>}
          </div>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{item.remark || "No remarks."}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed on: {formatDateTime(item.start_time)}</p>
        </div>
      );
    case 'Activity':
      return (
        <div>
          <div className="flex justify-between items-start">
            <p className="font-medium">{item.company_name || "N/A"} <Badge variant="outline">{item.activity_type}</Badge></p>
            {item.duration_minutes > 0 && <Badge variant="secondary" className="flex items-center gap-1"><Timer className="h-3 w-3" />{item.duration_minutes} min</Badge>}
          </div>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{item.details}</p>
          <p className="text-xs text-muted-foreground mt-1">Logged on: {formatDateTime(item.created_at)}</p>
        </div>
      );
    case 'Task':
      console.log("Debugging Task Metrics - Item:", item);
      // --- START OF FIX: Calculate time allotted and taken in minutes ---
      const timeAllotted = item.due_date && item.created_at ? differenceInMinutes(new Date(item.due_date), new Date(item.created_at)) : null;
      const timeTaken = item.completed_at && item.created_at ? differenceInMinutes(new Date(item.completed_at), new Date(item.created_at)) : null;
      // --- END OF FIX ---
      return (
        <div>
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium">{item.title}</p>
            <Badge variant="outline">{item.company_names || 'General Task'}</Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.details || "No details provided."}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>
                <span className="font-semibold text-foreground">Time Allotted:</span> {timeAllotted !== null ? `${timeAllotted} minutes` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5" />
              <span>
                <span className="font-semibold text-foreground">Time Taken:</span> {timeTaken !== null ? `${timeTaken} min` : (item.duration_minutes ? `${item.duration_minutes} min` : 'N/A')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                <span className="font-semibold text-foreground">Due:</span> {formatDateTime(item.due_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                <span className="font-semibold text-foreground">Completed:</span> {formatDateTime(item.completed_at)}
              </span>
            </div>
          </div>
        </div>
      );
    case 'DealWon':
      return <p>{item.company_name} (Source: {item.source})</p>;
    default:
      return <p>{item.company_name || item.title || 'Unknown record'}</p>;
  }
}


export function ReportDetailModal({ isOpen, onClose, title, data, dataType }: ReportDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const lowercasedFilter = searchTerm.toLowerCase();
    return data.filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(lowercasedFilter)
      )
    );
  }, [data, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Showing {filteredData.length} of {data?.length || 0} records for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {filteredData.length > 0 ? (
              <ul className="space-y-2">
                {filteredData.map((item, index) => (
                  <li key={item.id || item.client_id || index} className="text-sm p-3 bg-muted/50 rounded-md border">
                    <DetailItem item={item} dataType={dataType} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No matching records found.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}