// frontend/App/dashboard/leads/[leadId]/page.tsx
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, userApi, leadApi, type ApiLead, type ApiUser, LeadAttachment } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


// MODALS
// import { EditLeadModal } from "@/components/leads/edit-lead-modal"
import { LeadActivitiesModal } from "@/components/leads/lead-activities-modal"
import { useToast } from "@/hooks/use-toast"

import {
  Loader2, ArrowLeft, Edit, Activity, Mail, Phone, User, Building, Globe, MapPin,
  Tag, Users, TrendingUp, FileText, Briefcase, History, MessageSquare, CalendarCheck,
  DollarSign, Upload, File, Trash2, Download, Database, X
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

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useAuth();
  const leadId = params.leadId as string
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lead, setLead] = useState<any>(null)
  const [consignees, setConsignees] = useState<any[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [showActivitiesModal, setShowActivitiesModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<LeadAttachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Edit form state
  const [editedLead, setEditedLead] = useState<any>(null)
  const [editedConsignees, setEditedConsignees] = useState<any[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const fetchLeadData = useCallback(() => {
    if (leadId) {
      setIsLoading(true);
      Promise.all([
        api.getLeadById(Number(leadId)),
        userApi.getUsers()
      ]).then(([leadDataResponse, usersData]) => {
        // Handle both array and single object responses
        let leadData = leadDataResponse;
        if (Array.isArray(leadDataResponse) && leadDataResponse.length > 0) {
          leadData = leadDataResponse[0];
        }

        // Parse attachments from JSON string if needed
        if (leadData.attachments) {
          if (typeof leadData.attachments === 'string') {
            try {
              leadData.attachments = JSON.parse(leadData.attachments);
            } catch (e) {
              console.error("Failed to parse attachments JSON:", e);
              leadData.attachments = [];
            }
          }
        } else {
          leadData.attachments = [];
        }

        console.log("Lead data received:", leadData);
        console.log("Contacts field:", leadData.contacts || leadData.Contacts);

        setLead(leadData);
        // Extract consignees from contacts
        let parsedConsignees: any[] = [];

        if (leadData.Contacts && Array.isArray(leadData.Contacts)) {
          parsedConsignees = leadData.Contacts;
        } else if (leadData.contacts) {
          // Try to parse as JSON string
          if (typeof leadData.contacts === 'string') {
            try {
              const parsed = JSON.parse(leadData.contacts);
              parsedConsignees = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error("Failed to parse contacts JSON:", e);
              parsedConsignees = [];
            }
          } else if (Array.isArray(leadData.contacts)) {
            parsedConsignees = leadData.contacts;
          }
        }

        console.log("Parsed consignees:", parsedConsignees);
        setConsignees(parsedConsignees);
        setUsers(usersData.filter(u => u.id).map(u => ({ id: u.id.toString(), name: u.username })));
      }).catch((err) => {
        console.error("Failed to fetch lead details:", err);
        setError("Could not load lead details. The lead may not exist or an error occurred.");
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [leadId]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  const handleEditComplete = (updatedLeadId: string, updatedData: Partial<ApiLead>) => {
    if (lead && lead.LedgerID?.toString() === updatedLeadId) {
      setLead({ ...lead, ...updatedData });
    }
    setShowEditModal(false);
  };

  const handleOpenEditDetails = () => {
    setEditedLead({ ...lead });
    setEditedConsignees([...consignees]);
    setShowEditDetailsModal(true);
  };

  const handleSaveEditDetails = async () => {
    if (!editedLead) return;

    setIsSavingEdit(true);
    try {
      const payload = {
        ...editedLead,
        Contacts: editedConsignees
      };

      await leadApi.updateLead(payload);
      toast({ title: "Success", description: "Lead and consignees updated successfully." });

      setLead(editedLead);
      setConsignees(editedConsignees);
      setShowEditDetailsModal(false);

      // Refresh data
      fetchLeadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead and consignees.",
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
    if (!lead || !currentUser) return;
    setIsUploading(true);
    try {
      await leadApi.uploadLeadAttachment(lead.LedgerID, file);
      toast({ title: "Success", description: "File uploaded successfully." });
      fetchLeadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete || !lead) return;
    try {
      await leadApi.deleteLeadAttachment(attachmentToDelete.id);
      setLead(prevLead => prevLead ? {
        ...prevLead,
        attachments: prevLead.attachments.filter(att => att.id !== attachmentToDelete.id)
      } : null);
      toast({ title: "Success", description: "Attachment deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete attachment.", variant: "destructive" });
    } finally {
      setAttachmentToDelete(null);
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
        <Button onClick={() => router.push("/dashboard/leads")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
        </Button>
      </div>
    )
  }

  if (!lead) return null

  const creator = users.find(u => u.id === lead?.SalesPersonName?.toString());
  const creatorName = creator ? creator.name : lead?.SalesPersonName;

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lead.LedgerName}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Status: <Badge>{lead.Status}</Badge></span>
                <Separator orientation="vertical" className="h-4" />
                <span>Lead Status: {lead.LeadStatus}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowActivitiesModal(true)}>
              <Activity className="mr-2 h-4 w-4" />View Activities
            </Button>
            <Button onClick={handleOpenEditDetails}>
              <Edit className="mr-2 h-4 w-4" />Edit Ledger & Contacts
            </Button>
          </div>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* Lead Contact Information Card */}
                <Card>
                  <CardHeader><CardTitle>Ledger Information</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <IconInfoField label="Ledger Name" value={lead.LedgerName} icon={Building} />
                      <IconInfoField label="Email" value={lead.Email} icon={Mail} />
                      <IconInfoField label="Mobile No" value={lead.MobileNo} icon={Phone} />
                      <IconInfoField label="Telephone No" value={lead.TelephoneNo} icon={Phone} />
                      <IconInfoField label="Contact Person Name" value={lead.ContactPersonName} icon={User} />
                      <IconInfoField label="Contact Person Number" value={lead.ContactPersonNumber} icon={Phone} />
                      <IconInfoField label="Website" value={lead.Website} icon={Globe} />
                      <IconInfoField label="FAX" value={lead.FAX} icon={FileText} />
                    </div>
                  </CardContent>
                </Card>

                {/* Address Details Card */}
                <Card>
                  <CardHeader><CardTitle>Address Details</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <IconInfoField label="Address 1" value={lead.Address1} icon={MapPin} />
                    <IconInfoField label="Address 2" value={lead.Address2} icon={MapPin} />
                    <IconInfoField label="Address 3" value={lead.Address3} icon={MapPin} />
                    <IconInfoField label="City" value={lead.City} icon={MapPin} />
                    <IconInfoField label="State" value={lead.State} icon={MapPin} />
                    <IconInfoField label="Country" value={lead.Country} icon={Globe} />
                    <IconInfoField label="Pincode" value={lead.Pincode} icon={MapPin} />
                    <IconInfoField label="District" value={lead.District} icon={MapPin} />
                  </CardContent>
                </Card>

                {/* Consignees/Contacts Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contacts</CardTitle>
                    <CardDescription>All contacts and consignees associated with this ledger</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="min-w-[80px]">#</TableHead>
                            <TableHead className="min-w-[140px]">Ledger Name</TableHead>
                            <TableHead className="min-w-[140px]">Mailing Name</TableHead>
                            <TableHead className="min-w-[140px]">Legal Name</TableHead>
                            <TableHead className="min-w-[140px]">Trade Name</TableHead>
                            <TableHead className="min-w-[140px]">Designation</TableHead>

                            <TableHead className="min-w-[160px]">Email</TableHead>
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
                            <TableHead className="min-w-[120px]">Website</TableHead>
                            <TableHead className="min-w-[120px]">Currency</TableHead>
                            <TableHead className="min-w-[140px]">Currency Code</TableHead>
                            <TableHead className="min-w-[140px]">Max Credit Limit</TableHead>
                            <TableHead className="min-w-[140px]">Max Credit Period</TableHead>
                            <TableHead className="min-w-[120px]">Fixed Limit</TableHead>
                            <TableHead className="min-w-[140px]">Customer Type</TableHead>
                            <TableHead className="min-w-[140px]">Customer Category</TableHead>
                            <TableHead className="min-w-[140px]">Supply Type Code</TableHead>
                            <TableHead className="min-w-[120px]">Status</TableHead>
                            <TableHead className="min-w-[180px]">Ledger Description</TableHead>
                            <TableHead className="min-w-[180px]">Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consignees && consignees.length > 0 ? (
                            consignees.map((consignee, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/50">
                                <TableCell className="min-w-[80px] font-medium">{idx + 1}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.LedgerName}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.MailingName}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.LegalName}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.TradeName}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.Designation}</TableCell>

                                <TableCell className="min-w-[160px]">{consignee.Email}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.MobileNo}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.TelephoneNo}</TableCell>
                                <TableCell className="min-w-[100px]">{consignee.FAX}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.Address1}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.Address2}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.Address3}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.City}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.District}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.State}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.Country}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.Pincode}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.GSTNo}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.PANNo}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.Website}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.Currency}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.CurrencyCode}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.MaxCreditLimit}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.MaxCreditPeriod}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.FixedLimit}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.CustomerType}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.CustomerCategory}</TableCell>
                                <TableCell className="min-w-[140px]">{consignee.SupplyTypeCode}</TableCell>
                                <TableCell className="min-w-[120px]">{consignee.Status}</TableCell>
                                <TableCell className="min-w-[180px]">{consignee.LedgerDescription}</TableCell>
                                <TableCell className="min-w-[180px]">{consignee.Remarks}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={31} className="text-center py-4 text-muted-foreground">
                                No consignees found
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
                    <CardDescription>Upload and manage related documents for this lead.</CardDescription>
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
                      {lead.attachments && lead.attachments.length > 0 ? (
                        <ul className="space-y-3 pt-2">
                          {lead.attachments.map(att => (
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
                        <p className="text-sm text-muted-foreground text-center py-4">No attachments uploaded yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Ledger Classification</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <IconInfoField label="Ledger Type" value={lead.LedgerType} icon={Tag} />
                    <IconInfoField label="Sales Person Name" value={lead.SalesPersonName} icon={User} />
                    <IconInfoField label="Customer Type" value={lead.CustomerType} icon={Building} />
                    <IconInfoField label="Customer Category" value={lead.CustomerCategory} icon={Tag} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Financial Details</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <IconInfoField label="GSTNo" value={lead.GSTNo} icon={FileText} />
                    <IconInfoField label="PANNo" value={lead.PANNo} icon={FileText} />
                    <IconInfoField label="Currency" value={lead.Currency} icon={DollarSign} />
                    <IconInfoField label="MaxCreditLimit" value={lead.MaxCreditLimit} icon={DollarSign} />
                    <IconInfoField label="MaxCreditPeriod" value={lead.MaxCreditPeriod} icon={CalendarCheck} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm">{lead.Remarks || "No remarks"}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <LeadActivitiesModal
        lead={lead}
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
      />

      {/* Edit Lead and Consignees Modal */}
      {/* Edit Lead and Consignees Modal */}
      <Dialog open={showEditDetailsModal} onOpenChange={setShowEditDetailsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="flex-shrink-0 px-6 py-4 border-b">
            <DialogHeader>
              <DialogTitle>Edit Ledger & Contacts</DialogTitle>
              <DialogDescription>
                Update ledger information and manage contacts
              </DialogDescription>
            </DialogHeader>
          </div>

          {editedLead && (
            <div className="flex-grow overflow-y-auto">
              <div className="px-6 py-4 space-y-6">
                {/* Lead Details Section - Editable Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Ledger Information</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="min-w-[140px]">Ledger Name</TableHead>
                          <TableHead className="min-w-[140px]">Mailing Name</TableHead>
                          <TableHead className="min-w-[140px]">Legal Name</TableHead>
                          <TableHead className="min-w-[140px]">Trade Name</TableHead>
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
                          <TableHead className="min-w-[140px]">Currency Code</TableHead>
                          <TableHead className="min-w-[140px]">Max Credit Limit</TableHead>
                          <TableHead className="min-w-[140px]">Max Credit Period</TableHead>
                          <TableHead className="min-w-[120px]">Fixed Limit</TableHead>
                          <TableHead className="min-w-[140px]">Customer Type</TableHead>
                          <TableHead className="min-w-[140px]">Customer Category</TableHead>
                          <TableHead className="min-w-[140px]">Supply Type Code</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="min-w-[120px]">Lead Status</TableHead>
                          <TableHead className="min-w-[140px]">Sales Person Name</TableHead>
                          <TableHead className="min-w-[180px]">Ledger Description</TableHead>
                          <TableHead className="min-w-[180px]">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.LedgerName || ""} onChange={(e) => setEditedLead({ ...editedLead, LedgerName: e.target.value })} className="h-8 text-xs" placeholder="Ledger Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.MailingName || ""} onChange={(e) => setEditedLead({ ...editedLead, MailingName: e.target.value })} className="h-8 text-xs" placeholder="Mailing Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.LegalName || ""} onChange={(e) => setEditedLead({ ...editedLead, LegalName: e.target.value })} className="h-8 text-xs" placeholder="Legal Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.TradeName || ""} onChange={(e) => setEditedLead({ ...editedLead, TradeName: e.target.value })} className="h-8 text-xs" placeholder="Trade Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.Designation || ""} onChange={(e) => setEditedLead({ ...editedLead, Designation: e.target.value })} className="h-8 text-xs" placeholder="Designation" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.ContactPersonName || ""} onChange={(e) => setEditedLead({ ...editedLead, ContactPersonName: e.target.value })} className="h-8 text-xs" placeholder="Contact Person Name" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.ContactPersonNumber || ""} onChange={(e) => setEditedLead({ ...editedLead, ContactPersonNumber: e.target.value })} className="h-8 text-xs" placeholder="Contact Person Number" />
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <Input type="email" value={editedLead.Email || ""} onChange={(e) => setEditedLead({ ...editedLead, Email: e.target.value })} className="h-8 text-xs" placeholder="Email" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.Website || ""} onChange={(e) => setEditedLead({ ...editedLead, Website: e.target.value })} className="h-8 text-xs" placeholder="Website" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.MobileNo || ""} onChange={(e) => setEditedLead({ ...editedLead, MobileNo: e.target.value })} className="h-8 text-xs" placeholder="Mobile No" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.TelephoneNo || ""} onChange={(e) => setEditedLead({ ...editedLead, TelephoneNo: e.target.value })} className="h-8 text-xs" placeholder="Telephone No" />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input value={editedLead.FAX || ""} onChange={(e) => setEditedLead({ ...editedLead, FAX: e.target.value })} className="h-8 text-xs" placeholder="FAX" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.Address1 || ""} onChange={(e) => setEditedLead({ ...editedLead, Address1: e.target.value })} className="h-8 text-xs" placeholder="Address 1" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.Address2 || ""} onChange={(e) => setEditedLead({ ...editedLead, Address2: e.target.value })} className="h-8 text-xs" placeholder="Address 2" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.Address3 || ""} onChange={(e) => setEditedLead({ ...editedLead, Address3: e.target.value })} className="h-8 text-xs" placeholder="Address 3" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.City || ""} onChange={(e) => setEditedLead({ ...editedLead, City: e.target.value })} className="h-8 text-xs" placeholder="City" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.District || ""} onChange={(e) => setEditedLead({ ...editedLead, District: e.target.value })} className="h-8 text-xs" placeholder="District" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.State || ""} onChange={(e) => setEditedLead({ ...editedLead, State: e.target.value })} className="h-8 text-xs" placeholder="State" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.Country || ""} onChange={(e) => setEditedLead({ ...editedLead, Country: e.target.value })} className="h-8 text-xs" placeholder="Country" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.Pincode || ""} onChange={(e) => setEditedLead({ ...editedLead, Pincode: e.target.value })} className="h-8 text-xs" placeholder="Pincode" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.GSTNo || ""} onChange={(e) => setEditedLead({ ...editedLead, GSTNo: e.target.value })} className="h-8 text-xs" placeholder="GSTNo" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.PANNo || ""} onChange={(e) => setEditedLead({ ...editedLead, PANNo: e.target.value })} className="h-8 text-xs" placeholder="PANNo" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.Currency || ""} onChange={(e) => setEditedLead({ ...editedLead, Currency: e.target.value })} className="h-8 text-xs" placeholder="Currency" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.CurrencyCode || ""} onChange={(e) => setEditedLead({ ...editedLead, CurrencyCode: e.target.value })} className="h-8 text-xs" placeholder="Currency Code" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.MaxCreditLimit || ""} onChange={(e) => setEditedLead({ ...editedLead, MaxCreditLimit: e.target.value })} className="h-8 text-xs" placeholder="Max Credit Limit" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.MaxCreditPeriod || ""} onChange={(e) => setEditedLead({ ...editedLead, MaxCreditPeriod: e.target.value })} className="h-8 text-xs" placeholder="Max Credit Period" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.FixedLimit || ""} onChange={(e) => setEditedLead({ ...editedLead, FixedLimit: e.target.value })} className="h-8 text-xs" placeholder="Fixed Limit" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.CustomerType || ""} onChange={(e) => setEditedLead({ ...editedLead, CustomerType: e.target.value })} className="h-8 text-xs" placeholder="Customer Type" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.CustomerCategory || ""} onChange={(e) => setEditedLead({ ...editedLead, CustomerCategory: e.target.value })} className="h-8 text-xs" placeholder="Customer Category" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.SupplyTypeCode || ""} onChange={(e) => setEditedLead({ ...editedLead, SupplyTypeCode: e.target.value })} className="h-8 text-xs" placeholder="Supply Type Code" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.Status || ""} onChange={(e) => setEditedLead({ ...editedLead, Status: e.target.value })} className="h-8 text-xs" placeholder="Status" />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input value={editedLead.LeadStatus || ""} onChange={(e) => setEditedLead({ ...editedLead, LeadStatus: e.target.value })} className="h-8 text-xs" placeholder="Lead Status" />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input value={editedLead.SalesPersonName || ""} onChange={(e) => setEditedLead({ ...editedLead, SalesPersonName: e.target.value })} className="h-8 text-xs" placeholder="Sales Person Name" />
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <Input value={editedLead.LedgerDescription || ""} onChange={(e) => setEditedLead({ ...editedLead, LedgerDescription: e.target.value })} className="h-8 text-xs" placeholder="Ledger Description" />
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <Input value={editedLead.Remarks || ""} onChange={(e) => setEditedLead({ ...editedLead, Remarks: e.target.value })} className="h-8 text-xs" placeholder="Remarks" />
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
                            <TableHead className="min-w-[140px]">Ledger Name</TableHead>
                            <TableHead className="min-w-[140px]">Mailing Name</TableHead>
                            <TableHead className="min-w-[140px]">Legal Name</TableHead>
                            <TableHead className="min-w-[140px]">Trade Name</TableHead>
                            <TableHead className="min-w-[140px]">Designation</TableHead>
                            <TableHead className="min-w-[140px]">Contact Person Name</TableHead>
                            <TableHead className="min-w-[140px]">Contact Person Number</TableHead>
                            <TableHead className="min-w-[160px]">Email</TableHead>
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
                            <TableHead className="min-w-[120px]">Website</TableHead>
                            <TableHead className="min-w-[120px]">Currency</TableHead>
                            <TableHead className="min-w-[140px]">Currency Code</TableHead>
                            <TableHead className="min-w-[140px]">Max Credit Limit</TableHead>
                            <TableHead className="min-w-[140px]">Max Credit Period</TableHead>
                            <TableHead className="min-w-[120px]">Fixed Limit</TableHead>
                            <TableHead className="min-w-[140px]">Customer Type</TableHead>
                            <TableHead className="min-w-[140px]">Customer Category</TableHead>
                            <TableHead className="min-w-[140px]">Supply Type Code</TableHead>
                            <TableHead className="min-w-[120px]">Status</TableHead>
                            <TableHead className="min-w-[180px]">Ledger Description</TableHead>
                            <TableHead className="min-w-[180px]">Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editedConsignees.map((consignee, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/50">
                              <TableCell className="min-w-[80px] font-medium">{idx + 1}</TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.LedgerName || ""} onChange={(e) => updateConsigneeField(idx, 'LedgerName', e.target.value)} className="h-8 text-xs" placeholder="Ledger Name" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.MailingName || ""} onChange={(e) => updateConsigneeField(idx, 'MailingName', e.target.value)} className="h-8 text-xs" placeholder="Mailing Name" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.LegalName || ""} onChange={(e) => updateConsigneeField(idx, 'LegalName', e.target.value)} className="h-8 text-xs" placeholder="Legal Name" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.TradeName || ""} onChange={(e) => updateConsigneeField(idx, 'TradeName', e.target.value)} className="h-8 text-xs" placeholder="Trade Name" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.Designation || ""} onChange={(e) => updateConsigneeField(idx, 'Designation', e.target.value)} className="h-8 text-xs" placeholder="Designation" />
                              </TableCell>

                              <TableCell className="min-w-[160px]">
                                <Input type="email" value={consignee.Email || ""} onChange={(e) => updateConsigneeField(idx, 'Email', e.target.value)} className="h-8 text-xs" placeholder="Email" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.MobileNo || ""} onChange={(e) => updateConsigneeField(idx, 'MobileNo', e.target.value)} className="h-8 text-xs" placeholder="Mobile No" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.TelephoneNo || ""} onChange={(e) => updateConsigneeField(idx, 'TelephoneNo', e.target.value)} className="h-8 text-xs" placeholder="Telephone No" />
                              </TableCell>
                              <TableCell className="min-w-[100px]">
                                <Input value={consignee.FAX || ""} onChange={(e) => updateConsigneeField(idx, 'FAX', e.target.value)} className="h-8 text-xs" placeholder="FAX" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.Address1 || ""} onChange={(e) => updateConsigneeField(idx, 'Address1', e.target.value)} className="h-8 text-xs" placeholder="Address 1" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.Address2 || ""} onChange={(e) => updateConsigneeField(idx, 'Address2', e.target.value)} className="h-8 text-xs" placeholder="Address 2" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.Address3 || ""} onChange={(e) => updateConsigneeField(idx, 'Address3', e.target.value)} className="h-8 text-xs" placeholder="Address 3" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.City || ""} onChange={(e) => updateConsigneeField(idx, 'City', e.target.value)} className="h-8 text-xs" placeholder="City" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.District || ""} onChange={(e) => updateConsigneeField(idx, 'District', e.target.value)} className="h-8 text-xs" placeholder="District" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.State || ""} onChange={(e) => updateConsigneeField(idx, 'State', e.target.value)} className="h-8 text-xs" placeholder="State" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.Country || ""} onChange={(e) => updateConsigneeField(idx, 'Country', e.target.value)} className="h-8 text-xs" placeholder="Country" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.Pincode || ""} onChange={(e) => updateConsigneeField(idx, 'Pincode', e.target.value)} className="h-8 text-xs" placeholder="Pincode" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.GSTNo || ""} onChange={(e) => updateConsigneeField(idx, 'GSTNo', e.target.value)} className="h-8 text-xs" placeholder="GSTNo" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.PANNo || ""} onChange={(e) => updateConsigneeField(idx, 'PANNo', e.target.value)} className="h-8 text-xs" placeholder="PANNo" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.Website || ""} onChange={(e) => updateConsigneeField(idx, 'Website', e.target.value)} className="h-8 text-xs" placeholder="Website" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.Currency || ""} onChange={(e) => updateConsigneeField(idx, 'Currency', e.target.value)} className="h-8 text-xs" placeholder="Currency" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.CurrencyCode || ""} onChange={(e) => updateConsigneeField(idx, 'CurrencyCode', e.target.value)} className="h-8 text-xs" placeholder="Currency Code" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.MaxCreditLimit || ""} onChange={(e) => updateConsigneeField(idx, 'MaxCreditLimit', e.target.value)} className="h-8 text-xs" placeholder="Max Credit Limit" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.MaxCreditPeriod || ""} onChange={(e) => updateConsigneeField(idx, 'MaxCreditPeriod', e.target.value)} className="h-8 text-xs" placeholder="Max Credit Period" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.FixedLimit || ""} onChange={(e) => updateConsigneeField(idx, 'FixedLimit', e.target.value)} className="h-8 text-xs" placeholder="Fixed Limit" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.CustomerType || ""} onChange={(e) => updateConsigneeField(idx, 'CustomerType', e.target.value)} className="h-8 text-xs" placeholder="Customer Type" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.CustomerCategory || ""} onChange={(e) => updateConsigneeField(idx, 'CustomerCategory', e.target.value)} className="h-8 text-xs" placeholder="Customer Category" />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input value={consignee.SupplyTypeCode || ""} onChange={(e) => updateConsigneeField(idx, 'SupplyTypeCode', e.target.value)} className="h-8 text-xs" placeholder="Supply Type Code" />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input value={consignee.Status || ""} onChange={(e) => updateConsigneeField(idx, 'Status', e.target.value)} className="h-8 text-xs" placeholder="Status" />
                              </TableCell>
                              <TableCell className="min-w-[180px]">
                                <Input value={consignee.LedgerDescription || ""} onChange={(e) => updateConsigneeField(idx, 'LedgerDescription', e.target.value)} className="h-8 text-xs" placeholder="Ledger Description" />
                              </TableCell>
                              <TableCell className="min-w-[180px]">
                                <Input value={consignee.Remarks || ""} onChange={(e) => updateConsigneeField(idx, 'Remarks', e.target.value)} className="h-8 text-xs" placeholder="Remarks" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No contacts to edit</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditDetailsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditDetails} disabled={isSavingEdit}>
              {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the attachment "{attachmentToDelete?.original_file_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAttachment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}