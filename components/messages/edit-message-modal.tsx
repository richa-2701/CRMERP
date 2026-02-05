// frontend/components/messages/edit-message-modal.tsx
"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, ApiMessageMaster, ApiMessageMasterUpdatePayload } from "@/lib/api";
import { Loader2, X } from "lucide-react";

interface EditMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  message: ApiMessageMaster;
}

export function EditMessageModal({ isOpen, onClose, onSuccess, message }: EditMessageModalProps) {
  const [formData, setFormData] = useState<ApiMessageMasterUpdatePayload>({
    message_name: "",
    message_content: "",
    message_type: "text",
    existing_attachment_path: null,
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (message) {
      setFormData({
        message_name: message.message_name,
        message_content: message.message_content,
        message_type: message.message_type,
        existing_attachment_path: message.attachment_path,
      });
      // Reset file input state when modal opens with new message data
      setFile(null); 
    }
  }, [message, isOpen]); // Rerun effect if isOpen changes, to reset the form

  // --- CHANGE: Corrected the type of the 'field' parameter ---
  const handleInputChange = (field: keyof ApiMessageMasterUpdatePayload, value: string) => {
    // If user switches type, reset file-related fields
    if (field === "message_type") {
      setFile(null);
      // If switching back to text, clear any attachment path
      if (value === "text") {
        setFormData(prev => ({ ...prev, [field]: value as 'text' | 'media' | 'document', existing_attachment_path: null }));
      } else {
        setFormData(prev => ({ ...prev, [field]: value as 'text' | 'media' | 'document' }));
      }
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // When a new file is selected, it takes precedence
      setFile(e.target.files[0]);
      // Clear the existing path so the new file will be used
      setFormData(prev => ({ ...prev, existing_attachment_path: null }));
    } else {
      setFile(null);
    }
  };

  const handleRemoveAttachment = () => {
    setFile(null);
    setFormData(prev => ({ ...prev, existing_attachment_path: null }));
     // Also clear the file input visually
    const fileInput = document.getElementById('edit_file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that a file is present if type is not 'text'
    if (formData.message_type !== 'text' && !file && !formData.existing_attachment_path) {
        toast({ title: "File Required", description: "Please select a file for media or document message types.", variant: "destructive" });
        return;
    }
    
    setIsLoading(true);
    try {
      // The api function now handles FormData correctly
      await api.updateMessage(message.id, formData, file);
      toast({ title: "Success", description: "Message template updated." });
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to update message: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Message Template</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="edit_message_name">Message Name</Label>
                <Input id="edit_message_name" value={formData.message_name} onChange={e => handleInputChange("message_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit_message_type">Message Type</Label>
                <Select value={formData.message_type} onValueChange={value => handleInputChange("message_type", value as 'text' | 'media' | 'document')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="media">Media (Image/Video)</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {formData.message_type === 'text' ? (
                <div className="space-y-2">
                    <Label htmlFor="edit_message_content">Message Content</Label>
                    <Textarea id="edit_message_content" value={formData.message_content || ''} onChange={e => handleInputChange("message_content", e.target.value)} rows={5} placeholder="Type your message here... You can use {contact_name} as a placeholder."/>
                </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit_file">File Attachment</Label>
                {/* Show the existing file if there is one */}
                {formData.existing_attachment_path && (
                  <div className="text-sm p-2 border rounded-md flex items-center justify-between bg-muted/50">
                      <span className="truncate pr-2" title={formData.existing_attachment_path}>
                        Current: {formData.existing_attachment_path.substring(32)}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleRemoveAttachment}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  </div>
                )}
                {/* The file input for uploading a new file */}
                <Input id="edit_file" type="file" onChange={handleFileChange} />
                {/* Show the newly selected file name */}
                {file && <p className="text-xs text-muted-foreground">New: {file.name}</p>}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}</Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}