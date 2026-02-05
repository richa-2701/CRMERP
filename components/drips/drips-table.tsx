// frontend/components/drips/drips-table.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { ApiDripSequenceList } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/date-format";

interface DripsTableProps {
  drips: ApiDripSequenceList[];
  onDelete: (id: number) => void;
  isLoading: boolean;
}

export function DripsTable({ drips, onDelete, isLoading }: DripsTableProps) {
  const router = useRouter();


  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm whitespace-nowrap">Drip Code</TableHead>
              <TableHead className="text-xs md:text-sm whitespace-nowrap">Drip Name</TableHead>
              <TableHead className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap">Created By</TableHead>
              <TableHead className="hidden lg:table-cell text-xs md:text-sm whitespace-nowrap">Created At</TableHead>
              <TableHead className="text-right text-xs md:text-sm w-[60px] md:w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24 text-sm">Loading sequences...</TableCell></TableRow>
            ) : drips.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24 text-sm">No drip sequences found.</TableCell></TableRow>
            ) : (
              drips.map((drip) => (
                <TableRow key={drip.id}>
                  <TableCell className="font-mono text-xs md:text-sm">{drip.drip_code}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[150px] md:max-w-none truncate">{drip.drip_name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs md:text-sm">{drip.created_by}</TableCell>
                  {/* This now uses the correct, imported formatDateTime function */}
                  <TableCell className="hidden lg:table-cell text-xs md:text-sm whitespace-nowrap">{formatDateTime(drip.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/drip-sequence/${drip.id}`)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(drip.id)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}