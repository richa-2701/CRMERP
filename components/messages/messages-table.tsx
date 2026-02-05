// frontend/components/messages/messages-table.tsx
"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { ApiMessageMaster } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface MessagesTableProps {
  messages: ApiMessageMaster[];
  onEdit: (message: ApiMessageMaster) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
}

export function MessagesTable({ messages, onEdit, onDelete, isLoading }: MessagesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Message Code</TableHead>
            <TableHead>Message Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
          ) : messages.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center h-24">No messages found.</TableCell></TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell className="font-mono">{message.message_code}</TableCell>
                <TableCell className="font-medium">{message.message_name}</TableCell>
                <TableCell>
                  <Badge variant={message.approval_status === 'Approved' ? 'default' : 'secondary'}>
                    {message.approval_status || 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">{message.message_content || "Attachment"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{message.message_type}</Badge></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(message)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}