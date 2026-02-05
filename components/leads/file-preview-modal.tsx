// frontend/components/leads/file-preview-modal.tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string | null;
}

export function FilePreviewModal({ isOpen, onClose, fileUrl, fileName }: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [safeFileUrl, setSafeFileUrl] = useState<string | null>(null);

  // --- THIS IS THE NGROK FIX ---
  useEffect(() => {
    if (fileUrl) {
      // Create a URL object to safely add the bypass parameter
      const url = new URL(fileUrl);
      // Append the ngrok-skip-browser-warning header key as a query parameter.
      // The value ('true' or '1') doesn't matter, only the key's presence.
      url.searchParams.append("ngrok-skip-browser-warning", "true");
      setSafeFileUrl(url.toString());
      setIsLoading(true); // Reset loading state when the URL changes
    }
  }, [fileUrl]);
  // --- END NGROK FIX ---

  if (!safeFileUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Preview: {fileName}</DialogTitle>
          <DialogDescription>
            Viewing file from your CRM. You can also download it directly.
          </DialogDescription>
        </DialogHeader>
        {/* --- THIS IS THE LAYOUT FIX --- */}
        <div className="relative flex-grow w-full h-full border rounded-md mt-2">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Loading preview...</p>
            </div>
          )}
          <iframe
            src={safeFileUrl}
            className="w-full h-full"
            title={fileName || "File Preview"}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}