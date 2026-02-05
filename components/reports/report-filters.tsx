//frontend/components/reports/report-filters.tsx
"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { SalesPerson } from "@/lib/api"

interface ReportFiltersProps {
  salesPersons: SalesPerson[];
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  dateRange: DateRange | undefined;
  onDateChange: (dateRange: DateRange | undefined) => void;
  isUserSelectionDisabled: boolean;
}

export function ReportFilters({ salesPersons, selectedUserId, onUserChange, dateRange, onDateChange, isUserSelectionDisabled }: ReportFiltersProps) {
  return (
    <div className="flex flex-row md:flex-row gap-2 md:gap-4">
      <div className="flex-1">
        <label className="text-[10px] sm:text-xs md:text-sm font-medium mb-0.5 md:mb-1 block">Salesperson</label>
        <Select value={selectedUserId} onValueChange={onUserChange} disabled={isUserSelectionDisabled}>
          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select a salesperson" /></SelectTrigger>
          <SelectContent>
            {salesPersons.map(sp => {
              const employeeId = sp.employee_id || sp.employee_i_d;
              return (
                <SelectItem key={employeeId} value={employeeId?.toString() || ''}>
                  {sp.employee_name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <label className="text-[10px] sm:text-xs md:text-sm font-medium mb-0.5 md:mb-1 block">Date Range</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal h-8 sm:h-9 text-xs sm:text-sm">
              <CalendarIcon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">
                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={onDateChange} initialFocus numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}