// frontend/components/messages/create-message-modal.tsx
"use client";
import { useState } from "react";
// --- CHANGE: Import DialogDescription ---
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, ApiUser, ApiMessageMasterCreatePayload } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface CreateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: ApiUser;
}

export function CreateMessageModal({ isOpen, onClose, onSuccess, currentUser }: CreateMessageModalProps) {
  const [formData, setFormData] = useState<Omit<ApiMessageMasterCreatePayload, 'created_by'>>({
    message_name: "",
    message_content: "",
    message_type: "template",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [languageCode, setLanguageCode] = useState("en");
  const [headerType, setHeaderType] = useState("none");
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    if (field === "message_type") {
      setFormData(prev => ({ ...prev, message_type: value as "text" | "media" | "document" | "template" }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const payload: ApiMessageMasterCreatePayload = {
        ...formData,
        created_by: currentUser.username
      };

      // Add template-specific fields
      if (formData.message_type === 'template') {
        payload.language_code = languageCode;
        if (headerType && headerType !== 'none') {
          payload.header_type = headerType;
        }
      }

      // Debug: Log what we're sending
      console.log('=== FRONTEND PAYLOAD ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('File:', file);
      console.log('Header Type:', headerType);
      console.log('Attachment Path:', formData.attachment_path);
      console.log('=======================');

      const response = await api.createMessage(payload, file);

      // Check if there's a note in the response (for template creation status)
      // Backend returns IndasCRMMessageMaster object which has InteraktNote
      const note = (response as any)?.InteraktNote || (response as any)?.interaktNote || (response as any)?.note;

      // Determine if it was a success or partial failure (Draft)
      const hasError = note && (note.includes("Error") || note.includes("Failed") || note.includes("Draft") || note.includes("saved locally"));

      const successMessage = note || (formData.message_type === 'template'
        ? "Template saved successfully!"
        : "Message template created.");

      toast({
        title: hasError ? "Attention Required" : "Success",
        description: successMessage,
        variant: hasError ? "destructive" : "default"
      });
      onSuccess();
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to create message: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      message_name: "",
      message_content: "",
      message_type: "template",
    });
    setFile(null);
    setLanguageCode("en");
    setHeaderType("none");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Message Template</DialogTitle>
          {/* --- CHANGE: Add DialogDescription to fix console warning --- */}
          <DialogDescription>
            Create a reusable message for text, media, or documents to use in drip sequences.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message_name">Message Name</Label>
            <Input id="message_name" value={formData.message_name} onChange={e => handleInputChange("message_name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message_type">Message Type</Label>
            <Select value={formData.message_type} onValueChange={value => handleInputChange("message_type", value)}>
              <SelectTrigger id="message_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="template">WhatsApp Template (Interakt API)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template-specific fields */}
          {formData.message_type === "template" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="language_code">Language</Label>
                <Select value={languageCode} onValueChange={setLanguageCode}>
                  <SelectTrigger id="language_code"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="header_type">Header Type (Optional)</Label>
                <Select value={headerType} onValueChange={setHeaderType}>
                  <SelectTrigger id="header_type"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="TEXT">Text Header</SelectItem>
                    <SelectItem value="IMAGE">Image Header</SelectItem>
                    <SelectItem value="VIDEO">Video Header</SelectItem>
                    <SelectItem value="DOCUMENT">Document Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File upload or URL input for media headers */}
              {(headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT") && (
                <div className="space-y-2">
                  <Label htmlFor="header_file">
                    {headerType === "IMAGE" && "Header Image"}
                    {headerType === "VIDEO" && "Header Video"}
                    {headerType === "DOCUMENT" && "Header Document"}
                  </Label>

                  {/* URL Input (Recommended) */}
                  <div className="space-y-2">
                    <Input
                      id="media_url"
                      type="url"
                      placeholder={`Paste public ${headerType.toLowerCase()} URL (e.g., https://i.imgur.com/image.jpg)`}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, attachment_path: e.target.value }));
                        setFile(null); // Clear file if URL is entered
                      }}
                      value={formData.attachment_path || ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Recommended:</strong> Use a public URL from Imgur, Cloudinary, or similar service.
                      {headerType === "IMAGE" && " Formats: JPG, JPEG, PNG"}
                      {headerType === "VIDEO" && " Formats: MP4"}
                      {headerType === "DOCUMENT" && " Formats: PDF"}
                    </p>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t"></div>
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  {/* File Upload (Alternative) */}
                  <div className="space-y-2">
                    <Input
                      id="header_file"
                      type="file"
                      onChange={(e) => {
                        handleFileChange(e);
                        if (e.target.files && e.target.files.length > 0) {
                          setFormData(prev => ({ ...prev, attachment_path: '' })); // Clear URL if file is selected
                        }
                      }}
                      accept={
                        headerType === "IMAGE" ? "image/*" :
                          headerType === "VIDEO" ? "video/*" :
                            ".pdf,.doc,.docx"
                      }
                      disabled={!!formData.attachment_path} // Disable if URL is entered
                    />
                    {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
                    <p className="text-xs text-yellow-600">
                      ⚠️ <strong>Note:</strong> File uploads require ngrok or a public server. URL input is recommended for testing.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="message_content">
              {formData.message_type === "template" ? "Template Body" : "Message Content"}
            </Label>
            <Textarea
              id="message_content"
              value={formData.message_content || ''}
              onChange={e => handleInputChange("message_content", e.target.value)}
              rows={5}
              placeholder={formData.message_type === "template"
                ? "Hello {{1}}, welcome to our service! Use {{1}}, {{2}} for variables."
                : "Type your message here..."}
              required
            />
            {formData.message_type === "template" && (
              <p className="text-xs text-muted-foreground">
                💡 Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> for dynamic variables. Template will be submitted to Meta/WhatsApp for approval (24-48 hours).
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Message"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}