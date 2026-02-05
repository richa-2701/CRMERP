// frontend/components/leads/assign-drip-modal.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api, type ApiDripSequenceList, type ApiLead } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface AssignDripModalProps {
  lead: ApiLead | null
  dripSequences: ApiDripSequenceList[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AssignDripModal({ lead, dripSequences, isOpen, onClose, onSuccess }: AssignDripModalProps) {
  const [selectedDripId, setSelectedDripId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleAssign = async () => {
    if (!lead || !selectedDripId) {
      toast({ title: "Error", description: "Please select a drip sequence.", variant: "destructive" })
      return
    }

    // Validate lead has an ID
    if (!lead.id) {
      toast({ title: "Error", description: "Lead ID is missing.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const response = await api.assignDripToLead(lead.id, Number(selectedDripId))
      toast({
        title: "Success!",
        description: response.message,
      })
      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Drip Sequence</DialogTitle>
          <DialogDescription>
            Assign an automated message sequence to "{lead?.company_name}". Any existing drip on this lead will be stopped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="drip-select">Drip Sequence</Label>
            <Select value={selectedDripId} onValueChange={setSelectedDripId}>
              <SelectTrigger id="drip-select">
                <SelectValue placeholder="Select a sequence..." />
              </SelectTrigger>
              <SelectContent>
                {dripSequences.map((drip) => (
                  <SelectItem key={drip.id} value={drip.id.toString()}>
                    {drip.drip_name} ({drip.drip_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || !selectedDripId}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Sequence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}