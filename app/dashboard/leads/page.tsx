// frontend/app/dashboard/leads/page.tsx
"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
  Plus,
  Loader2,
  Columns,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
  X,
  MoreVertical,
  Eye,
  Activity,
  UserCheck,
  XCircle,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { leadApi, SalesPerson, ApiLead, api, masterDataApi, ApiMasterData } from "@/lib/api"
import { simplePipelineApi } from "@/lib/simple-pipeline-api"
import { useToast } from "@/hooks/use-toast"
import { LeadActivitiesModal } from "@/components/leads/lead-activities-modal"

// Define interfaces for the new structure
interface Consignee {
  LedgerID?: number
  LedgerName: string
  MailingName: string
  MobileNo: string
  TelephoneNo: string
  Email: string
  Website: string
  Designation: string
  Address1: string
  Address2: string
  Address3: string
  City: string
  District: string
  State: string
  Country: string
  Pincode: string
  GSTNo: string
  PANNo: string
  LegalName: string
  TradeName: string
  FAX: string
  Currency: string
  CurrencyCode: string
  MaxCreditLimit: string
  MaxCreditPeriod: string
  FixedLimit: string
  CustomerType: string
  CustomerCategory: string
  SupplyTypeCode: string
  Status: string
  Remarks: string
  LedgerDescription: string
}

interface Lead {
  LedgerID: number
  LedgerName: string
  MailingName: string
  MobileNo: string
  Email: string
  Website: string
  Address1: string
  Address2: string
  Address3: string
  City: string
  District: string
  State: string
  Country: string
  Pincode: string
  GSTNo: string
  PANNo: string
  SalesPersonName: string
  RefSalesRepresentativeID?: number
  CustomerType: string
  CustomerCategory: string
  Status: string
  LeadStatus: string
  pipeline_stage_id?: number
  expected_revenue?: number
  LegalName: string
  TradeName: string
  SupplyTypeCode: string
  MaxCreditLimit: number
  MaxCreditPeriod: number
  FixedLimit: number
  Remarks: string
  Currency: string
  CurrencyCode: string
  TelephoneNo: string
  FAX: string
  Designation: string
  LedgerDescription: string
  ContactPersonName: string
  ContactPersonNumber: string
  MailingAddress: string
  isClient?: number // 0 or 1
  contacts?: string // JSON string from backend
  Contacts?: Consignee[] // Parsed consignees
  status_reason?: string // Reason for lead lost or not interested
}

// All available columns for leads
const ALL_LEAD_COLUMNS = [
  { id: "LedgerName", label: "Lead Name" },
  { id: "MailingName", label: "Mailing Name" },
  { id: "MobileNo", label: "Mobile No" },
  { id: "TelephoneNo", label: "Telephone No" },
  { id: "Email", label: "Email" },
  { id: "Website", label: "Website" },
  { id: "Designation", label: "Designation" },
  { id: "ContactPersonName", label: "Contact Person Name" },
  { id: "ContactPersonNumber", label: "Contact Person Number" },
  { id: "Address1", label: "Address 1" },
  { id: "Address2", label: "Address 2" },
  { id: "Address3", label: "Address 3" },
  { id: "City", label: "City" },
  { id: "District", label: "District" },
  { id: "State", label: "State" },
  { id: "Country", label: "Country" },
  { id: "Pincode", label: "Pincode" },
  { id: "GSTNo", label: "GST No" },
  { id: "PANNo", label: "PAN No" },
  { id: "LegalName", label: "Legal Name" },
  { id: "TradeName", label: "Trade Name" },
  { id: "FAX", label: "FAX" },
  { id: "CurrencyCode", label: "Currency Code" },
  { id: "SupplyTypeCode", label: "Supply Type Code" },
  // { id: "LeadStatus", label: "Lead Status" }, // Removed as per request
  { id: "pipeline_stage_id", label: "Pipeline Stage" },
  { id: "expected_revenue", label: "Expected Revenue" },
  { id: "SalesPersonName", label: "Sales Person" },
  { id: "Remarks", label: "Remarks" },
]

export default function LeadsPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Editing state
  const [editingLead, setEditingLead] = useState<number | null>(null)
  const [editingConsignee, setEditingConsignee] = useState<{ leadId: number; consigneeIndex: number } | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "LedgerName",
    "MobileNo",
    "Email",
    "City",
    "State",
    // "Status", // Removed
    "pipeline_stage_id",
    "expected_revenue",
    "SalesPersonName",
  ])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [pipelineStages, setPipelineStages] = useState<{ id: number; name: string; color: string }[]>([]);

  // Fetch pipeline stages
  useEffect(() => {
    const loadStages = async () => {
      try {
        const stages = await simplePipelineApi.getStages();
        setPipelineStages(stages);
      } catch (err) {
        console.error("Failed to load pipeline stages", err);
      }
    };
    loadStages();
  }, []);

  // Fetch sales persons
  useEffect(() => {
    api.getSalesPersons().then(setSalesPersons).catch(err => console.error("Failed to fetch sales persons", err));
  }, []);

  // Activities Modal State
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedLeadForActivities, setSelectedLeadForActivities] = useState<ApiLead | null>(null);

  // Lead Lost Dialog State
  const [showLeadLostDialog, setShowLeadLostDialog] = useState(false);
  const [leadToMarkAsLost, setLeadToMarkAsLost] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostReasons, setLostReasons] = useState<ApiMasterData[]>([]);

  // Fetch lost reasons on mount
  useEffect(() => {
    masterDataApi.getByCategory("reason").then(setLostReasons).catch(err => console.error("Failed to fetch lost reasons", err));
  }, []);

  // Filters State
  const [filterLeadStatus, setFilterLeadStatus] = useState<string>("All");
  const [filterCustomerType, setFilterCustomerType] = useState<string>("All");

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsLoading(true)
      // setError(null) // Keep error state persisting or reset if needed, but reducing flickering

      const response = await leadApi.getLeadsPaginated(currentPage, pageSize, searchTerm)

      // Parse and set leads, filtering out converted clients (isClient=1)
      const parsedLeads = response.data
        .map((lead: any) => {
          let parsedContacts: Consignee[] = []
          if (lead.contacts && typeof lead.contacts === 'string') {
            try {
              parsedContacts = JSON.parse(lead.contacts)
            } catch (e) {
              console.error("Failed to parse contacts:", e)
            }
          }
          return {
            ...lead,
            Contacts: parsedContacts
          }
        })
        .filter((lead: any) => {
          // Filter: Show only leads where isLead=1 AND isClient=0 (or null/undefined)
          // Exclude converted clients (isClient=1 or "1" or true)
          const isClientValue = lead.isClient
          const shouldExclude = isClientValue === 1 || isClientValue === "1" || isClientValue === true || (isClientValue != null && Number(isClientValue) === 1)

          if (shouldExclude) {
            console.log("Excluding lead from leads page:", lead.LedgerName, "isClient:", isClientValue, "type:", typeof isClientValue)
            return false
          }
          return true
        })

      setAllLeads(parsedLeads)
      // Update total pages based on server total
      setTotalCount(response.total)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads")
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on search
      fetchLeads();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm])

  // Fetch when page or pageSize changes (but not searchTerm, that's handled above)
  useEffect(() => {
    fetchLeads()
  }, [currentPage, pageSize])

  // Apply client-side filters
  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      // Filter by Lead Status
      if (filterLeadStatus !== "All" && lead.LeadStatus !== filterLeadStatus) {
        return false;
      }



      return true;
    });
  }, [allLeads, filterLeadStatus, filterCustomerType]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // No need to reset page here as it's done in search useEffect or page control controls it


  // Toggle row expansion
  const toggleRow = (ledgerId: number) => {
    console.log("Toggling row with LedgerID:", ledgerId)
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ledgerId)) {
        newSet.delete(ledgerId)
        console.log("Collapsed row:", ledgerId, "Expanded rows:", Array.from(newSet))
      } else {
        newSet.add(ledgerId)
        console.log("Expanded row:", ledgerId, "Expanded rows:", Array.from(newSet))
      }
      return newSet
    })
  }

  // Start editing a lead
  const startEditLead = (lead: Lead) => {
    setEditingLead(lead.LedgerID)
    setEditFormData({ ...lead })
  }

  // Start editing a consignee
  const startEditConsignee = (leadId: number, consigneeIndex: number, consignee: Consignee) => {
    setEditingConsignee({ leadId, consigneeIndex })
    setEditFormData({ ...consignee })
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingLead(null)
    setEditingConsignee(null)
    setEditFormData({})
  }

  // Save lead changes
  const saveLead = async () => {
    if (!editingLead) return

    try {
      await leadApi.updateLead(editFormData)

      // Update local state
      setAllLeads(prev => prev.map(lead =>
        lead.LedgerID === editingLead ? { ...lead, ...editFormData } : lead
      ))

      toast({
        title: "Success",
        description: "Lead updated successfully"
      })

      cancelEdit()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive"
      })
    }
  }

  // Save consignee changes
  const saveConsignee = async () => {
    if (!editingConsignee) return

    try {
      const lead = allLeads.find(l => l.LedgerID === editingConsignee.leadId)
      if (!lead) return

      const updatedContacts = [...(lead.Contacts || [])]
      updatedContacts[editingConsignee.consigneeIndex] = editFormData

      await leadApi.updateLead({
        LedgerID: lead.LedgerID,
        Contacts: updatedContacts
      })

      // Update local state
      setAllLeads(prev => prev.map(l =>
        l.LedgerID === editingConsignee.leadId
          ? { ...l, Contacts: updatedContacts }
          : l
      ))

      toast({
        title: "Success",
        description: "Consignee updated successfully"
      })

      cancelEdit()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update consignee",
        variant: "destructive"
      })
    }
  }

  // Delete lead
  const handleDeleteLead = (lead: Lead) => {
    setLeadToDelete(lead)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return

    try {
      await leadApi.softDeleteLead(leadToDelete.LedgerID)
      setAllLeads(prev => prev.filter(l => l.LedgerID !== leadToDelete.LedgerID))

      toast({
        title: "Success",
        description: `${leadToDelete.LedgerName} has been deleted`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive"
      })
    } finally {
      setLeadToDelete(null)
      setShowDeleteConfirm(false)
    }
  }

  // Convert lead to client
  const handleConvertToClient = async (lead: Lead) => {
    console.log("handleConvertToClient: Triggered", lead)

    try {
      // Call the simplified convert endpoint that sets isClient=1 and LeadStatus='Won'
      console.log("handleConvertToClient: Calling API convertToClient", lead.LedgerID)
      await leadApi.convertToClient(lead.LedgerID)
      console.log("handleConvertToClient: API Success")

      // Remove from leads list
      setAllLeads(prev => prev.filter(l => l.LedgerID !== lead.LedgerID))

      toast({
        title: "Success",
        description: `${lead.LedgerName} has been converted to client successfully`
      })
    } catch (error) {
      console.error("handleConvertToClient: API Error", error)
      toast({
        title: "Error",
        description: "Failed to convert lead to client",
        variant: "destructive"
      })
    }
  }

  // Handle Lead Lost
  const handleLeadLost = (lead: Lead) => {
    setLeadToMarkAsLost(lead);
    setLostReason("");
    setShowLeadLostDialog(true);
  }

  const confirmMarkAsLost = async () => {
    if (!leadToMarkAsLost) return;

    if (!lostReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for marking the lead as lost",
        variant: "destructive"
      });
      return;
    }

    try {
      await leadApi.markLeadAsLost(leadToMarkAsLost.LedgerID, lostReason);

      // Update local state
      setAllLeads(prev => prev.map(l =>
        l.LedgerID === leadToMarkAsLost.LedgerID
          ? { ...l, LeadStatus: "Lost", status_reason: lostReason }
          : l
      ));

      toast({
        title: "Success",
        description: `${leadToMarkAsLost.LedgerName} has been marked as lost`
      });

      setShowLeadLostDialog(false);
      setLeadToMarkAsLost(null);
      setLostReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark lead as lost",
        variant: "destructive"
      });
    }
  }

  // ... (keeping other functions intact or assuming they are) ...
  // Wait, I need to match the replacement block carefully.
  // The target content starts at `const handleConvertToClient = async (lead: Lead) => {` line 398
  // And ends at button onClick line 753? No, tools can't span that far if I don't precise.

  // Let's split this.
  // Step 1: Update handleConvertToClient definition.

  // View full details
  const handleViewDetails = (leadId: number) => {
    router.push(`/dashboard/leads/${leadId}`)
  }

  // Handle view activities
  const handleViewActivities = (lead: Lead) => {
    const apiLead: ApiLead = {
      id: lead.LedgerID,
      company_name: lead.LedgerName,
      ...lead
    } as any;

    setSelectedLeadForActivities(apiLead);
    setShowActivitiesModal(true);
  }

  // Handle field change during editing
  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  // Render editable cell
  const renderEditableCell = (value: any, field: string, minWidth: string = "min-w-[120px]") => {
    const isCurrentlyEditing = editingLead !== null || editingConsignee !== null

    if (isCurrentlyEditing) {
      if (field === "pipeline_stage_id") {
        return (
          <Select
            value={editFormData[field]?.toString() || ""}
            onValueChange={(v) => handleFieldChange(field, parseInt(v))}
          >
            <SelectTrigger className={`h-8 text-sm ${minWidth}`}>
              <SelectValue placeholder="Select Stage" />
            </SelectTrigger>
            <SelectContent>
              {pipelineStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      if (field === "SalesPersonName") {
        return (
          <Select
            value={editFormData["SalesPersonName"] || ""}
            onValueChange={(v) => {
              const sp = salesPersons.find(p => p.employee_name === v);
              handleFieldChange("SalesPersonName", v);
              if (sp) {
                const spId = sp.employee_i_d || sp.employee_id;
                if (spId) handleFieldChange("RefSalesRepresentativeID", spId);
              }
            }}
          >
            <SelectTrigger className={`h-8 text-sm ${minWidth}`}>
              <SelectValue placeholder="Select Sales Person" />
            </SelectTrigger>
            <SelectContent>
              {salesPersons.map((sp, index) => (
                <SelectItem key={`${sp.employee_i_d || sp.employee_id || index}-${sp.employee_name}`} value={sp.employee_name}>
                  {sp.employee_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }




      return (
        <Input
          value={editFormData[field] || ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className={`h-8 text-sm ${minWidth}`}
        />
      )
    }

    if (field === "pipeline_stage_id") {
      const stage = pipelineStages.find(s => s.id === value);
      return stage ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span>{stage.name}</span>
        </div>
      ) : <span>-</span>;
    }

    return <span>{value || "-"}</span>
  }

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => fetchLeads()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <LeadActivitiesModal
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
        lead={selectedLeadForActivities}
      />
      <div className="flex h-full flex-col space-y-3">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 space-y-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl">
                All Leads
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredLeads.length} total)
                </span>
              </CardTitle>
              <Link href="/dashboard/create-lead">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lead
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads and consignees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Lead Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("All")}>
                    All
                    {filterLeadStatus === "All" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("New")}>
                    New
                    {filterLeadStatus === "New" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("In Progress")}>
                    In Progress
                    {filterLeadStatus === "In Progress" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("Contacted")}>
                    Contacted
                    {filterLeadStatus === "Contacted" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("Won")}>
                    Won
                    {filterLeadStatus === "Won" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("Lost")}>
                    Lost
                    {filterLeadStatus === "Lost" && " ✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterLeadStatus("Not Interested")}>
                    Not Interested
                    {filterLeadStatus === "Not Interested" && " ✓"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>



              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[400px] overflow-y-auto">
                    {ALL_LEAD_COLUMNS.filter(col => col.id !== 'LedgerName').map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col min-h-0 p-0">
            <div className="relative flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[50px] min-w-[50px] max-w-[50px] p-0 text-center md:sticky md:left-0 bg-white dark:bg-slate-950 z-20">#</TableHead>
                    <TableHead className="w-[50px] min-w-[50px] max-w-[50px] p-0 text-center md:sticky md:left-[50px] bg-white dark:bg-slate-950 z-20"><ChevronRight className="h-4 w-4 mx-auto" /></TableHead>
                    <TableHead className="min-w-[200px]">Lead Name(Company Name)</TableHead>
                    {ALL_LEAD_COLUMNS.filter(col => visibleColumns.includes(col.id) && col.id !== 'LedgerName').map(col => (
                      <TableHead key={col.id} className="min-w-[150px]">{col.label}</TableHead>
                    ))}
                    <TableHead className="w-[150px] md:sticky md:right-0 bg-white dark:bg-slate-950 z-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, index) => {
                    const isExpanded = expandedRows.has(lead.LedgerID)
                    const isEditing = editingLead === lead.LedgerID
                    const hasConsignees = (lead.Contacts?.length || 0) > 0
                    const rowNumber = (currentPage - 1) * pageSize + index + 1

                    return (
                      <React.Fragment key={lead.LedgerID}>
                        {/* Main Lead Row */}
                        <TableRow className={isEditing ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                          <TableCell className="font-medium p-0 text-center md:sticky md:left-0 bg-white dark:bg-slate-950 z-10 w-[50px] min-w-[50px] max-w-[50px]">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="p-0 text-center md:sticky md:left-[50px] bg-white dark:bg-slate-950 z-10 w-[50px] min-w-[50px] max-w-[50px]">
                            {hasConsignees && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleRow(lead.LedgerID)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isEditing ? renderEditableCell(lead.LedgerName, "LedgerName", "min-w-[180px]") : lead.LedgerName}
                          </TableCell>
                          {visibleColumns.includes("MailingName") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.MailingName, "MailingName") : (lead.MailingName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MobileNo") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.MobileNo, "MobileNo") : (lead.MobileNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("TelephoneNo") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.TelephoneNo, "TelephoneNo") : (lead.TelephoneNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Email") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Email, "Email", "min-w-[200px]") : (lead.Email || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Website") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Website, "Website") : (lead.Website || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Designation") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Designation, "Designation") : (lead.Designation || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("ContactPersonName") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.ContactPersonName, "ContactPersonName") : (lead.ContactPersonName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("ContactPersonNumber") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.ContactPersonNumber, "ContactPersonNumber") : (lead.ContactPersonNumber || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address1") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Address1, "Address1") : (lead.Address1 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address2") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Address2, "Address2") : (lead.Address2 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address3") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Address3, "Address3") : (lead.Address3 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("City") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.City, "City") : (lead.City || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("District") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.District, "District") : (lead.District || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("State") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.State, "State") : (lead.State || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Country") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Country, "Country") : (lead.Country || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Pincode") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Pincode, "Pincode") : (lead.Pincode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("GSTNo") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.GSTNo, "GSTNo") : (lead.GSTNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("PANNo") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.PANNo, "PANNo") : (lead.PANNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("LegalName") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.LegalName, "LegalName") : (lead.LegalName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("TradeName") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.TradeName, "TradeName") : (lead.TradeName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("FAX") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.FAX, "FAX") : (lead.FAX || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Currency") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Currency, "Currency") : (lead.Currency || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CurrencyCode") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.CurrencyCode, "CurrencyCode") : (lead.CurrencyCode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MaxCreditLimit") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.MaxCreditLimit, "MaxCreditLimit") : (lead.MaxCreditLimit || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MaxCreditPeriod") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.MaxCreditPeriod, "MaxCreditPeriod") : (lead.MaxCreditPeriod || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("FixedLimit") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.FixedLimit, "FixedLimit") : (lead.FixedLimit || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CustomerType") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.CustomerType, "CustomerType") : (lead.CustomerType || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CustomerCategory") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.CustomerCategory, "CustomerCategory") : (lead.CustomerCategory || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("SupplyTypeCode") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.SupplyTypeCode, "SupplyTypeCode") : (lead.SupplyTypeCode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Status") && (
                            <TableCell>
                              {isEditing ? (
                                renderEditableCell(lead.Status, "Status")
                              ) : (
                                <Badge variant="outline">{lead.Status || "-"}</Badge>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes("LeadStatus") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.LeadStatus, "LeadStatus") : (lead.LeadStatus || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("pipeline_stage_id") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.pipeline_stage_id, "pipeline_stage_id", "min-w-[150px]") : (
                              lead.pipeline_stage_id ? renderEditableCell(lead.pipeline_stage_id, "pipeline_stage_id") : "-"
                            )}</TableCell>
                          )}
                          {visibleColumns.includes("expected_revenue") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.expected_revenue, "expected_revenue") : (
                              lead.expected_revenue ? `₹${lead.expected_revenue.toLocaleString()}` : "-"
                            )}</TableCell>
                          )}
                          {visibleColumns.includes("SalesPersonName") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.SalesPersonName, "SalesPersonName") : (lead.SalesPersonName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Remarks") && (
                            <TableCell>{isEditing ? renderEditableCell(lead.Remarks, "Remarks", "min-w-[200px]") : (lead.Remarks || "-")}</TableCell>
                          )}
                          <TableCell className="md:sticky md:right-0 bg-white dark:bg-slate-950 z-10">
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={saveLead}
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleViewDetails(lead.LedgerID)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Full Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewActivities(lead)}>
                                      <Activity className="h-4 w-4 mr-2" />
                                      Activities
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => startEditLead(lead)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit/Update Lead
                                    </DropdownMenuItem>
                                    {lead.isClient !== 1 && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleConvertToClient(lead)}>
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Convert to Client
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleLeadLost(lead)}>
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Mark as Lost
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteLead(lead)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Consignee Rows */}
                        {isExpanded && hasConsignees && lead.Contacts?.map((consignee, consigneeIndex) => {
                          const isEditingThisConsignee =
                            editingConsignee?.leadId === lead.LedgerID &&
                            editingConsignee?.consigneeIndex === consigneeIndex

                          return (
                            <TableRow
                              key={`${lead.LedgerID}-consignee-${consigneeIndex}`}
                              className={`bg-muted/30 ${isEditingThisConsignee ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                            >
                              <TableCell className="md:sticky md:left-0 bg-gray-50 dark:bg-slate-900 z-10 w-[50px] min-w-[50px] max-w-[50px] p-0"></TableCell>
                              <TableCell className="md:sticky md:left-[50px] bg-gray-50 dark:bg-slate-900 z-10 text-xs text-muted-foreground w-[50px] min-w-[50px] max-w-[50px] p-0 text-center">
                                C{consigneeIndex + 1}
                              </TableCell>
                              <TableCell className="">
                                {isEditingThisConsignee ? renderEditableCell(consignee.LedgerName, "LedgerName", "min-w-[180px]") : consignee.LedgerName}
                              </TableCell>
                              {visibleColumns.includes("MailingName") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.MailingName, "MailingName") : (consignee.MailingName || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("MobileNo") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.MobileNo, "MobileNo") : (consignee.MobileNo || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("TelephoneNo") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.TelephoneNo, "TelephoneNo") : (consignee.TelephoneNo || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Email") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Email, "Email", "min-w-[200px]") : (consignee.Email || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Website") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Website, "Website") : (consignee.Website || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Designation") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Designation, "Designation") : (consignee.Designation || "-")}</TableCell>
                              )}

                              {visibleColumns.includes("Address1") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Address1, "Address1") : (consignee.Address1 || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Address2") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Address2, "Address2") : (consignee.Address2 || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Address3") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Address3, "Address3") : (consignee.Address3 || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("City") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.City, "City") : (consignee.City || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("District") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.District, "District") : (consignee.District || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("State") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.State, "State") : (consignee.State || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Country") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Country, "Country") : (consignee.Country || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Pincode") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Pincode, "Pincode") : (consignee.Pincode || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("GSTNo") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.GSTNo, "GSTNo") : (consignee.GSTNo || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("PANNo") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.PANNo, "PANNo") : (consignee.PANNo || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("LegalName") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.LegalName, "LegalName") : (consignee.LegalName || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("TradeName") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.TradeName, "TradeName") : (consignee.TradeName || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("FAX") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.FAX, "FAX") : (consignee.FAX || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Currency") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Currency, "Currency") : (consignee.Currency || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("CurrencyCode") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.CurrencyCode, "CurrencyCode") : (consignee.CurrencyCode || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("MaxCreditLimit") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.MaxCreditLimit, "MaxCreditLimit") : (consignee.MaxCreditLimit || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("MaxCreditPeriod") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.MaxCreditPeriod, "MaxCreditPeriod") : (consignee.MaxCreditPeriod || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("FixedLimit") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.FixedLimit, "FixedLimit") : (consignee.FixedLimit || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("CustomerType") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.CustomerType, "CustomerType") : (consignee.CustomerType || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("CustomerCategory") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.CustomerCategory, "CustomerCategory") : (consignee.CustomerCategory || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("SupplyTypeCode") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.SupplyTypeCode, "SupplyTypeCode") : (consignee.SupplyTypeCode || "-")}</TableCell>
                              )}
                              {visibleColumns.includes("Status") && (
                                <TableCell>
                                  {isEditingThisConsignee ? (
                                    renderEditableCell(consignee.Status, "Status")
                                  ) : (
                                    <Badge variant="outline">{consignee.Status || "-"}</Badge>
                                  )}
                                </TableCell>
                              )}
                              {visibleColumns.includes("LeadStatus") && (
                                <TableCell>-</TableCell>
                              )}
                              {visibleColumns.includes("SalesPersonName") && (
                                <TableCell>-</TableCell>
                              )}
                              {visibleColumns.includes("Remarks") && (
                                <TableCell>{isEditingThisConsignee ? renderEditableCell(consignee.Remarks, "Remarks", "min-w-[200px]") : (consignee.Remarks || "-")}</TableCell>
                              )}
                              <TableCell className="md:sticky md:right-0 bg-gray-50 dark:bg-slate-900 z-10">
                                <div className="flex gap-1">
                                  {isEditingThisConsignee ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={saveConsignee}
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={cancelEdit}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => startEditConsignee(lead.LedgerID, consigneeIndex, consignee)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div >

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the lead "{leadToDelete?.LedgerName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showLeadLostDialog} onOpenChange={setShowLeadLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking "{leadToMarkAsLost?.LedgerName}" as lost. This will help in future analysis and reporting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lost-reason">Reason for Loss</Label>
              <Select
                value={lostReason}
                onValueChange={setLostReason}
              >
                <SelectTrigger id="lost-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {lostReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.value}>
                      {reason.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLeadLostDialog(false);
                setLeadToMarkAsLost(null);
                setLostReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmMarkAsLost} variant="destructive">
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
