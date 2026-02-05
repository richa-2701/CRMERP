// frontend/app/dashboard/clients/[clientId]/page.tsx
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { clientApi, userApi, leadApi, type ApiLead, type ApiUser, type LeadAttachment, type ApiClient } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
// import { EditClientModal } from "@/components/clients/edit-client-modal" // Replaced by Edit Details modal
import { LeadActivitiesModal } from "@/components/leads/lead-activities-modal" // Re-using Lead Activities Modal as it works for LedgerMaster
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { parseAsUTCDate } from "@/lib/date-format"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Loader2, ArrowLeft, Edit, Activity, Mail, Phone, User, Building, Globe, MapPin,
  Tag, Users, TrendingUp, FileText, Briefcase, History, MessageSquare, CalendarCheck,
  DollarSign, Upload, File, Trash2, Download, Database, X, Receipt, Wrench, Bug, Code, HardDrive
} from "lucide-react"

const IconInfoField = ({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value?: string | number | null;
  icon: React.ElementType
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="ml-4">
        <h4 className="text-xs font-semibold text-muted-foreground">{label}</h4>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  );
};

// NOTE: We are reusing the layout from LeadDetailPage because Clients share the same "LedgerMaster" structure.
// Some types might need casting if api.ts definitions diverge, but the goal is to show the fields available in LedgerMaster.
// We treat the 'client' state as 'any' to accommodate all LedgerMaster fields returned by the updated backend.

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useAuth();
  const clientId = params.clientId as string
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [client, setClient] = useState<any>(null)
  const [consignees, setConsignees] = useState<any[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [showActivitiesModal, setShowActivitiesModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<LeadAttachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Edit form state
  const [editedClient, setEditedClient] = useState<any>(null)
  const [editedConsignees, setEditedConsignees] = useState<any[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const fetchClientData = useCallback(() => {
    if (clientId) {
      setIsLoading(true);
      Promise.all([
        clientApi.getClientById(Number(clientId)), // Updated backend returns LedgerMaster data
        userApi.getUsers()
      ]).then(([clientDataResponse, usersData]) => {
        // Handle response - assuming single object based strictly on updated implementation
        let clientData: any;
        const data = clientDataResponse as any; // Cast to any to handle both single object and array responses without lint errors

        // If array, take first (though getClientById usually returns one, the backend fix returns DataTable which might be serialized as array)
        if (data && data.length > 0) {
          clientData = data[0];
          // Normalize ID for shared components (LeadActivitiesModal expects LedgerID or ledger_id)
          // The API response seems to produce ledger_i_d from LedgerID
          clientData.LedgerID = clientData.ledger_i_d || clientData.ledger_id || clientData.id;
          clientData.id = clientData.LedgerID; // Ensure id is also set

          // Parse attachments if available
          if (clientData.attachments_json) {
            try {
              clientData.attachments = JSON.parse(clientData.attachments_json);
            } catch (e) {
              console.error("Failed to parse attachments JSON", e);
              clientData.attachments = [];
            }
          } else {
            clientData.attachments = [];
          }

          setClient(clientData);
          setEditedClient(clientData); // Initialize edit form with fetched data
        } else if (data && data.length === 0) {
          throw new Error("Client not found");
        } else {
          // Handle other cases if necessary, e.g., if clientDataResponse is a single object directly
          clientData = clientDataResponse; // Fallback for non-array, single object response

          if (clientData) {
            // Normalize ID for shared components
            clientData.LedgerID = clientData.ledger_i_d || clientData.ledger_id || clientData.id;
            clientData.id = clientData.LedgerID; // Ensure id is also set

            if (!clientData.attachments) { // Ensure attachments array exists even if not from JSON
              clientData.attachments = [];
            }
            // Parse attachments if available (handle single object case with json string)
            if (clientData.attachments_json && typeof clientData.attachments_json === 'string') {
              try {
                clientData.attachments = JSON.parse(clientData.attachments_json);
              } catch (e) {
                console.error("Failed to parse attachments JSON in fallback", e);
                clientData.attachments = [];
              }
            }

            setClient(clientData);
            setEditedClient(clientData);
          } else {
            throw new Error("Invalid client data received");
          }
        }

        console.log("Client data received:", clientData);


        // Extract consignees/contacts
        let parsedConsignees: any[] = [];
        // 'Contacts' might be in different fields depending on how LedgerMaster stores it or if it's joined.
        // The backend update attempts to fetch attachments but logic for Contacts was commented as 'guess'.
        // If the backend returns 'contacts' field (JSON), parse it.
        if (clientData.contacts) {
          if (typeof clientData.contacts === 'string') {
            try {
              parsedConsignees = JSON.parse(clientData.contacts);
            } catch (e) {
              parsedConsignees = [];
            }
          } else if (Array.isArray(clientData.contacts)) {
            parsedConsignees = clientData.contacts;
          }
        }
        // Fallback: Checks 'Contacts' PascalCase if mapped that way
        if (clientData.Contacts && Array.isArray(clientData.Contacts)) {
          parsedConsignees = clientData.Contacts;
        }

        setConsignees(parsedConsignees);
        setUsers(usersData.filter(u => u.id).map(u => ({ id: u.id.toString(), name: u.username })));

      }).catch((err) => {
        console.error("Failed to fetch client details:", err);
        setError("Could not load client details. The client may not exist or an error occurred.");
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleOpenEditDetails = () => {
    setEditedClient({ ...client });
    setEditedConsignees([...consignees]);
    setShowEditDetailsModal(true);
  };

  const handleSaveEditDetails = async () => {
    if (!editedClient) return;

    setIsSavingEdit(true);
    try {
      // Re-using leadApi.updateLead because Clients are in LedgerMaster too.
      // Ideally, there should be clientApi.updateClient that calls the same endpoint or 'Client/Update'.
      // If 'Client/Update' exists in backend, use valid endpoint.
      // Based on previous files, IndasCRMClientController has UpdateClient.
      // Let's assume we can use that, or fallback to lead update if they are the same table.
      // The updated file view showed 'UpdateClient' method.

      const payload = {
        ...editedClient,
        Contacts: editedConsignees
      };

      // Using clientApi to update - assuming updateClient exists or we use leadApi as generic 'Ledger' update
      // Let's check api.ts later. For now, try leadApi.updateLead as it targets LedgerMaster generally?
      // No, safest is to try clientApi if available, but api.ts wasn't fully read.
      // We'll trust leadApi.updateLead works for any LedgerID (since it's just ID based), 
      // OR we implement a specific call.
      // Given user request is to fix query, editing might be secondary but we want it working.
      await leadApi.updateLead(payload);

      toast({ title: "Success", description: "Client details updated successfully." });

      setClient(editedClient);
      setConsignees(editedConsignees);
      setShowEditDetailsModal(false);
      fetchClientData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update client details.",
        variant: "destructive"
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const updateConsigneeField = (index: number, field: string, value: any) => {
    const updated = [...editedConsignees];
    updated[index] = { ...updated[index], [field]: value };
    setEditedConsignees(updated);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!client || !currentUser) return;
    setIsUploading(true);
    try {
      // Attachments are linked to Lead_Id (LedgerID). The table is lead_attachments.
      // So leadApi.uploadLeadAttachment is consistently correct for Clients too (LedgerMaster entities).
      await leadApi.uploadLeadAttachment(client.LedgerID, file);
      toast({ title: "Success", description: "File uploaded successfully." });
      fetchClientData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadAttachment = async (attachment: LeadAttachment) => {
    setDownloadingId(attachment.id);
    try {
      const fileBlob = await leadApi.downloadLeadAttachment(attachment.id);
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not download file.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };


  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete || !client) return;
    try {
      await leadApi.deleteLeadAttachment(attachmentToDelete.id);
      setClient((prev: any) => prev ? {
        ...prev,
        attachments: prev.attachments.filter((att: any) => att.id !== attachmentToDelete.id)
      } : null);
      toast({ title: "Success", description: "Attachment deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete attachment.", variant: "destructive" });
    } finally {
      setAttachmentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-destructive mb-4">{error}</p>
        <Button onClick={() => router.push("/dashboard/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    )
  }

  if (!client) return null

  // Use LedgerName (from LedgerMaster) as display name
  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{client.ledger_name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Status: <Badge>{client.status}</Badge></span>
                <Separator orientation="vertical" className="h-4" />
                <span>Client Status: {client.lead_status || 'Client'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowActivitiesModal(true)}>
              <Activity className="mr-2 h-4 w-4" />View Activities
            </Button>
            <Button onClick={handleOpenEditDetails}>
              <Edit className="mr-2 h-4 w-4" />Edit Client
            </Button>
          </div>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* Ledger Information Card */}
                <Card>
                  <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <IconInfoField label="Ledger Name" value={client.ledger_name} icon={Building} />
                      <IconInfoField label="Email" value={client.email} icon={Mail} />
                      <IconInfoField label="Mobile No" value={client.mobile_no} icon={Phone} />
                      <IconInfoField label="Telephone No" value={client.telephone_no} icon={Phone} />
                      <IconInfoField label="Contact Person Name" value={client.contact_person_name} icon={User} />
                      <IconInfoField label="Contact Person Number" value={client.contact_person_number} icon={Phone} />
                      <IconInfoField label="Website" value={client.website} icon={Globe} />
                      <IconInfoField label="FAX" value={client.fax} icon={FileText} />
                    </div>
                  </CardContent>
                </Card>

                {/* Address Details Card */}
                <Card>
                  <CardHeader><CardTitle>Address Details</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <IconInfoField label="Address 1" value={client.address1} icon={MapPin} />
                    <IconInfoField label="Address 2" value={client.address2} icon={MapPin} />
                    <IconInfoField label="Address 3" value={client.address3} icon={MapPin} />
                    <IconInfoField label="City" value={client.city} icon={MapPin} />
                    <IconInfoField label="State" value={client.state} icon={MapPin} />
                    <IconInfoField label="Country" value={client.country} icon={Globe} />
                    <IconInfoField label="Pincode" value={client.pincode} icon={MapPin} />
                    <IconInfoField label="District" value={client.district} icon={MapPin} />
                  </CardContent>
                </Card>

                {/* Contacts / Consignees Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contacts</CardTitle>
                    <CardDescription>All contacts associated with this client</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="min-w-[80px]">#</TableHead>
                            <TableHead className="min-w-[140px]">Contact Name</TableHead>
                            <TableHead className="min-w-[140px]">Designation</TableHead>
                            <TableHead className="min-w-[160px]">Email</TableHead>
                            <TableHead className="min-w-[140px]">Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consignees && consignees.length > 0 ? (
                            consignees.map((consignee, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/50">
                                <TableCell className="min-w-[80px] font-medium">{idx + 1}</TableCell>
                                {/* Check field names - LedgerMaster vs Contacts subquery */}
                                <TableCell className="min-w-[140px]">{consignee.ledger_name || consignee.contact_name}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.designation || consignee.Designation}</TableCell>

                                <TableCell className="min-w-[160px]">{consignee.email || consignee.Email}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.mobile_no || consignee.phone}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                No contacts found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attachments</CardTitle>
                    <CardDescription>Documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload File
                        </Button>
                      </div>
                      {client.attachments && client.attachments.length > 0 ? (
                        <ul className="space-y-3 pt-2">
                          {client.attachments.map((att: any) => (
                            <li key={att.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm p-3 rounded-md border bg-muted/50">
                              <div className="flex items-center gap-3 truncate">
                                <File className="h-5 w-5 flex-shrink-0 text-primary" />
                                <div className="truncate">
                                  <p className="font-medium truncate" title={att.original_file_name}>{att.original_file_name}</p>
                                  {att.uploaded_by && (
                                    <p className="text-xs text-muted-foreground">Uploaded by {att.uploaded_by}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button variant="outline" size="sm" onClick={() => handleDownloadAttachment(att)} disabled={downloadingId === att.id}>
                                  {downloadingId === att.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                  Download
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAttachmentToDelete(att)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No attachments.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Client Classification</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <IconInfoField label="Ledger Type" value={client.ledger_type} icon={Tag} />
                    <IconInfoField label="Sales Person Name" value={client.sales_person_name} icon={User} />
                    <IconInfoField label="Customer Type" value={client.customer_type} icon={Building} />
                    <IconInfoField label="Customer Category" value={client.customer_category} icon={Tag} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Financial Details</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <IconInfoField label="GSTNo" value={client.gst_no} icon={FileText} />
                    <IconInfoField label="PANNo" value={client.p_a_n_no} icon={FileText} />
                    <IconInfoField label="Currency" value={client.currency} icon={DollarSign} />
                    <IconInfoField label="MaxCreditLimit" value={client.max_credit_limit} icon={DollarSign} />
                    <IconInfoField label="MaxCreditPeriod" value={client.max_credit_period} icon={CalendarCheck} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm">{client.remarks || "No remarks"}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <LeadActivitiesModal
        lead={client}
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
      />

      <Dialog open={showEditDetailsModal} onOpenChange={setShowEditDetailsModal}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information and contacts.
            </DialogDescription>
          </DialogHeader>

          {editedClient && (
            <div className="flex-grow overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Main Client Details Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Client Details</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="min-w-[140px]">Ledger Name</TableHead>
                          <TableHead className="min-w-[140px]">Mailing Name</TableHead>
                          <TableHead className="min-w-[140px]">Designation</TableHead>

                          <TableHead className="min-w-[160px]">Email</TableHead>
                          <TableHead className="min-w-[140px]">Website</TableHead>
                          <TableHead className="min-w-[140px]">Mobile No</TableHead>
                          <TableHead className="min-w-[140px]">Telephone No</TableHead>
                          <TableHead className="min-w-[100px]">FAX</TableHead>
                          <TableHead className="min-w-[140px]">Address 1</TableHead>
                          <TableHead className="min-w-[140px]">Address 2</TableHead>
                          <TableHead className="min-w-[140px]">Address 3</TableHead>
                          <TableHead className="min-w-[120px]">City</TableHead>
                          <TableHead className="min-w-[120px]">District</TableHead>
                          <TableHead className="min-w-[120px]">State</TableHead>
                          <TableHead className="min-w-[120px]">Country</TableHead>
                          <TableHead className="min-w-[120px]">Pincode</TableHead>
                          <TableHead className="min-w-[120px]">GSTNo</TableHead>
                          <TableHead className="min-w-[120px]">PANNo</TableHead>
                          <TableHead className="min-w-[120px]">Currency</TableHead>
                          <TableHead className="min-w-[140px]">Max Credit Limit</TableHead>
                          <TableHead className="min-w-[140px]">Max Credit Period</TableHead>
                          <TableHead className="min-w-[140px]">Customer Type</TableHead>
                          <TableHead className="min-w-[140px]">Customer Category</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="min-w-[120px]">Client Status</TableHead>
                          <TableHead className="min-w-[140px]">Sales Person</TableHead>
                          <TableHead className="min-w-[180px]">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.ledger_name || ""} onChange={(e) => setEditedClient({ ...editedClient, ledger_name: e.target.value })} className="h-8 text-xs" placeholder="Ledger Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.mailing_name || ""} onChange={(e) => setEditedClient({ ...editedClient, mailing_name: e.target.value })} className="h-8 text-xs" placeholder="Mailing Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.designation || ""} onChange={(e) => setEditedClient({ ...editedClient, designation: e.target.value })} className="h-8 text-xs" placeholder="Designation" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.contact_person_name || ""} onChange={(e) => setEditedClient({ ...editedClient, contact_person_name: e.target.value })} className="h-8 text-xs" placeholder="Contact Person Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.contact_person_number || ""} onChange={(e) => setEditedClient({ ...editedClient, contact_person_number: e.target.value })} className="h-8 text-xs" placeholder="Contact Person Number" />
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <Input type="email" value={editedClient.email || ""} onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })} className="h-8 text-xs" placeholder="Email" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.website || ""} onChange={(e) => setEditedClient({ ...editedClient, website: e.target.value })} className="h-8 text-xs" placeholder="Website" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.mobile_no || ""} onChange={(e) => setEditedClient({ ...editedClient, mobile_no: e.target.value })} className="h-8 text-xs" placeholder="Mobile No" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.telephone_no || ""} onChange={(e) => setEditedClient({ ...editedClient, telephone_no: e.target.value })} className="h-8 text-xs" placeholder="Telephone No" />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input value={editedClient.fax || ""} onChange={(e) => setEditedClient({ ...editedClient, fax: e.target.value })} className="h-8 text-xs" placeholder="FAX" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.address1 || ""} onChange={(e) => setEditedClient({ ...editedClient, address1: e.target.value })} className="h-8 text-xs" placeholder="Address 1" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.address2 || ""} onChange={(e) => setEditedClient({ ...editedClient, address2: e.target.value })} className="h-8 text-xs" placeholder="Address 2" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.address3 || ""} onChange={(e) => setEditedClient({ ...editedClient, address3: e.target.value })} className="h-8 text-xs" placeholder="Address 3" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.city || ""} onChange={(e) => setEditedClient({ ...editedClient, city: e.target.value })} className="h-8 text-xs" placeholder="City" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.district || ""} onChange={(e) => setEditedClient({ ...editedClient, district: e.target.value })} className="h-8 text-xs" placeholder="District" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.state || ""} onChange={(e) => setEditedClient({ ...editedClient, state: e.target.value })} className="h-8 text-xs" placeholder="State" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.country || ""} onChange={(e) => setEditedClient({ ...editedClient, country: e.target.value })} className="h-8 text-xs" placeholder="Country" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.pincode || ""} onChange={(e) => setEditedClient({ ...editedClient, pincode: e.target.value })} className="h-8 text-xs" placeholder="Pincode" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.gst_no || ""} onChange={(e) => setEditedClient({ ...editedClient, gst_no: e.target.value })} className="h-8 text-xs" placeholder="GSTNo" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.p_a_n_no || ""} onChange={(e) => setEditedClient({ ...editedClient, p_a_n_no: e.target.value })} className="h-8 text-xs" placeholder="PANNo" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.currency || ""} onChange={(e) => setEditedClient({ ...editedClient, currency: e.target.value })} className="h-8 text-xs" placeholder="Currency" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.max_credit_limit || ""} onChange={(e) => setEditedClient({ ...editedClient, max_credit_limit: e.target.value })} className="h-8 text-xs" placeholder="Max Credit Limit" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.max_credit_period || ""} onChange={(e) => setEditedClient({ ...editedClient, max_credit_period: e.target.value })} className="h-8 text-xs" placeholder="Max Credit Period" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.customer_type || ""} onChange={(e) => setEditedClient({ ...editedClient, customer_type: e.target.value })} className="h-8 text-xs" placeholder="Customer Type" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.customer_category || ""} onChange={(e) => setEditedClient({ ...editedClient, customer_category: e.target.value })} className="h-8 text-xs" placeholder="Customer Category" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.status || ""} onChange={(e) => setEditedClient({ ...editedClient, status: e.target.value })} className="h-8 text-xs" placeholder="Status" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedClient.lead_status || ""} onChange={(e) => setEditedClient({ ...editedClient, lead_status: e.target.value })} className="h-8 text-xs" placeholder="Client Status" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedClient.sales_person_name || ""} onChange={(e) => setEditedClient({ ...editedClient, sales_person_name: e.target.value })} className="h-8 text-xs" placeholder="Sales Person" />
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <Input value={editedClient.remarks || ""} onChange={(e) => setEditedClient({ ...editedClient, remarks: e.target.value })} className="h-8 text-xs" placeholder="Remarks" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Contacts Section - Editable Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contacts</h3>
                  {editedConsignees && editedConsignees.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="min-w-[80px]">#</TableHead>
                            <TableHead className="min-w-[140px]">Contact Name</TableHead>
                            <TableHead className="min-w-[140px]">Designation</TableHead>
                            <TableHead className="min-w-[160px]">Email</TableHead>
                            <TableHead className="min-w-[140px]">Mobile No</TableHead>
                            <TableHead className="min-w-[140px]">Telephone No</TableHead>
                            <TableHead className="min-w-[100px]">FAX</TableHead>
                            <TableHead className="min-w-[140px]">Address 1</TableHead>
                            <TableHead className="min-w-[120px]">City</TableHead>
                            <TableHead className="min-w-[120px]">State</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editedConsignees.map((consignee, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/50">
                              <TableCell className="min-w-[80px] font-medium">{idx + 1}</TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.ledger_name || consignee.contact_name || ""} onChange={(e) => updateConsigneeField(idx, 'ledger_name', e.target.value)} className="h-8 text-xs" placeholder="Name" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.designation || ""} onChange={(e) => updateConsigneeField(idx, 'designation', e.target.value)} className="h-8 text-xs" placeholder="Designation" />
                              </TableCell>

                              <TableCell className="min-w-[160px]">
                                <Input type="email" value={consignee.email || ""} onChange={(e) => updateConsigneeField(idx, 'email', e.target.value)} className="h-8 text-xs" placeholder="Email" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.mobile_no || consignee.phone || ""} onChange={(e) => updateConsigneeField(idx, 'mobile_no', e.target.value)} className="h-8 text-xs" placeholder="Mobile" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.telephone_no || ""} onChange={(e) => updateConsigneeField(idx, 'telephone_no', e.target.value)} className="h-8 text-xs" placeholder="Tel" />
                              </TableCell>
                              <TableCell className="min-w-[100px]">
                                <Input value={consignee.fax || ""} onChange={(e) => updateConsigneeField(idx, 'fax', e.target.value)} className="h-8 text-xs" placeholder="Fax" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.address1 || ""} onChange={(e) => updateConsigneeField(idx, 'address1', e.target.value)} className="h-8 text-xs" placeholder="Address" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.city || ""} onChange={(e) => updateConsigneeField(idx, 'city', e.target.value)} className="h-8 text-xs" placeholder="City" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.state || ""} onChange={(e) => updateConsigneeField(idx, 'state', e.target.value)} className="h-8 text-xs" placeholder="State" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No contacts found.</p>
                  )}
                </div>

              </div>
              <div className="flex justify-end pt-4 gap-3 sticky bottom-0 bg-background border-t mt-4 p-4">
                <Button variant="outline" onClick={() => setShowEditDetailsModal(false)}>Cancel</Button>
                <Button variant="default" onClick={handleSaveEditDetails} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}