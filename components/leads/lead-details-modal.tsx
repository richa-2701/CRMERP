//frontend/components/leads/lead-details-modal.tsx
"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

interface Contact {
  id: number
  lead_id: number
  contact_name: string
  phone: string
  email: string | null
  designation: string | null
}

interface Lead {
  id: string
  company_name: string
  contacts: Contact[]
  phone_2?: string
  email: string
  address?: string
  team_size?: string
  turnover?: string
  source?: string
  segment?: string
  assigned_to: string
  current_system?: string
  machine_specification?: string
  challenges?: string
  remark?: string
  status: string
  created_at: string
  updated_at: string
}

interface LeadDetailsModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  getUserName: (userId: string) => string
}

export function LeadDetailsModal({ lead, isOpen, onClose, getUserName }: LeadDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.company_name}</DialogTitle>
          <DialogDescription>Complete lead information and details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lead Status</h3>
            <Badge>{lead.status}</Badge>
          </div>

          <Separator />

          {/* Contact Persons Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Persons</h3>
            <div className="space-y-3">
              {lead.contacts && lead.contacts.length > 0 ? (
                lead.contacts.map((contact, index) => (
                  <Card key={contact.id || index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold">{contact.contact_name}</p>
                        {contact.designation && <Badge variant="secondary">{contact.designation}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <p>
                          <strong>Phone:</strong> {contact.phone}
                        </p>
                        {contact.email && (
                          <p>
                            <strong>Email:</strong> {contact.email}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No contact persons listed.</p>
              )}
            </div>
          </div>

          <Separator />
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Company Email</h4>
              <p className="mt-1">{lead.email || "N/A"}</p>
            </div>
             {lead.phone_2 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Company Phone 2</h4>
                <p className="mt-1">{lead.phone_2}</p>
              </div>
            )}
          </div>

          {lead.address && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Address</h4>
              <p className="mt-1">{lead.address}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {lead.team_size && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Team Size</h4>
                <p className="mt-1">{lead.team_size}</p>
              </div>
            )}
            {lead.turnover && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Turnover</h4>
                <p className="mt-1">{lead.turnover}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {lead.source && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Source</h4>
                <p className="mt-1">{lead.source}</p>
              </div>
            )}
            {lead.segment && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Segment</h4>
                <p className="mt-1">{lead.segment}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Assigned To</h4>
              <p className="mt-1">{getUserName(lead.assigned_to)}</p>
            </div>
            {lead.current_system && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Current System</h4>
                <p className="mt-1">{lead.current_system}</p>
              </div>
            )}
          </div>

          {lead.machine_specification && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Machine Specification</h4>
              <p className="mt-1 whitespace-pre-wrap">{lead.machine_specification}</p>
            </div>
          )}

          {lead.challenges && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Challenges</h4>
              <p className="mt-1 whitespace-pre-wrap">{lead.challenges}</p>
            </div>
          )}

          {lead.remark && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Remark</h4>
              <p className="mt-1 whitespace-pre-wrap">{lead.remark}</p>
            </div>
          )}

          <Separator />

          <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium">Created At</h4>
              <p className="mt-1">{new Date(lead.created_at).toLocaleString()}</p>
            </div>
            <div>
              <h4 className="font-medium">Updated At</h4>
              <p className="mt-1">{new Date(lead.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}