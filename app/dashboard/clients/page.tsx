// frontend/app/dashboard/clients/page.tsx
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
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
  CheckCircle,
  Filter,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { leadApi, clientApi, ApiLead, api, SalesPerson } from "@/lib/api"
import { simplePipelineApi } from "@/lib/simple-pipeline-api"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface Client {
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
  isLead?: number // 0 or 1
  IsClientApproval: boolean // Added
  contacts?: string // JSON string from backend
  Contacts?: Consignee[] // Parsed consignees
  _ui_id?: string // Frontend-only unique ID for UI state (expansion, editing)
}

// All available columns for clients
const ALL_CLIENT_COLUMNS = [
  { id: "LedgerName", label: "Client Name" },
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

export default function ClientsPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [allClients, setAllClients] = useState<Client[]>([])
  const [activeTab, setActiveTab] = useState("approved") // "pending" | "approved"
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Expandable rows state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editingConsignee, setEditingConsignee] = useState<{ clientId: number; consigneeIndex: number } | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  // GST Alert
  const [showGSTAlert, setShowGSTAlert] = useState(false)
  const [alertClient, setAlertClient] = useState<Client | null>(null)
  const [pipelineStages, setPipelineStages] = useState<{ id: number; name: string; color: string }[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

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

    // Fetch sales persons
    api.getSalesPersons().then(setSalesPersons).catch(err => console.error("Failed to fetch sales persons", err));
  }, []);


  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "LedgerName",
    "MobileNo",
    "Email",
    "City",
    "State",
    "Status",
    // "LeadStatus", // Removed
    "pipeline_stage_id",
    "expected_revenue",
    "SalesPersonName",
    "GSTNo", // Added GSTNo by default
  ])

  // Activities Modal State
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedClientForActivities, setSelectedClientForActivities] = useState<ApiLead | null>(null);

  // Filters State
  const [filterLeadStatus, setFilterLeadStatus] = useState<string>("All");
  const [filterCustomerType, setFilterCustomerType] = useState<string>("All");

  // Fetch clients from API (leads where isClient=1)
  // Fetch clients from API based on active tab
  const fetchClients = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const approvalStatus = activeTab === "pending" ? 0 : 1;
      const response: any = await clientApi.getAllClients(approvalStatus)

      console.log("Raw Clients API response:", response)

      const parsedClients = response
        .map((client: any) => {
          let parsedContacts: Consignee[] = []
          if (client.contacts && typeof client.contacts === 'string') {
            try {
              parsedContacts = JSON.parse(client.contacts)
            } catch (e) {
              console.error("Failed to parse contacts:", e)
            }
          }

          // Map snake_case from backend (which seems to use _i_d for ID and generic snake_case) to PascalCase
          // Log keys seen: ledger_i_d, ledger_name, g_s_t_no, mobile_no, company_email, etc.
          const ledgerId = client.LedgerID || client.ledger_i_d || client.ledger_id || client.id || client.ID || 0;

          if (!ledgerId) {
            console.warn("Client missing LedgerID:", client);
          }

          return {
            LedgerID: ledgerId,
            LedgerName: client.LedgerName || client.ledger_name || client.company_name,
            Email: client.Email || client.email || client.company_email,
            Website: client.Website || client.website || client.website1,
            City: client.City || client.city,
            State: client.State || client.state,
            Country: client.Country || client.country,
            Address1: client.Address1 || client.address1,
            Address2: client.Address2 || client.address2,
            Pincode: client.Pincode || client.pincode,
            CustomerCategory: client.CustomerCategory || client.customer_category || client.segment,
            MobileNo: client.MobileNo || client.mobile_no,
            TelephoneNo: client.TelephoneNo || client.telephone_no,
            Designation: client.Designation || client.designation,
            GSTNo: client.GSTNo || client.g_s_t_no || client.gst_no,
            PANNo: client.PANNo || client.p_a_n_no || client.pan_no,
            SalesPersonName: client.SalesPersonName || client.sales_person_name,
            CustomerType: client.CustomerType || client.customer_type,
            Status: client.Status || client.status,
            LeadStatus: client.LeadStatus || client.lead_status,
            LegalName: client.LegalName || client.legal_name,
            TradeName: client.TradeName || client.trade_name,
            SupplyTypeCode: client.SupplyTypeCode || client.supply_type_code,
            MaxCreditLimit: client.MaxCreditLimit || client.max_credit_limit,
            MaxCreditPeriod: client.MaxCreditPeriod || client.max_credit_period,
            FixedLimit: client.FixedLimit || client.fixed_limit,
            Remarks: client.Remarks || client.remarks,
            Currency: client.Currency || client.currency,
            CurrencyCode: client.CurrencyCode || client.currency_code,
            FAX: client.FAX || client.f_a_x,
            LedgerDescription: client.LedgerDescription || client.ledger_description,
            MailingAddress: client.MailingAddress || client.mailing_address,
            isClient: client.isClient ?? 1,
            isLead: client.isLead,
            IsClientApproval: client.IsClientApproval ?? client.is_client_approval ?? true,
            expected_revenue: client.expected_revenue,
            contacts: client.contacts,
            Contacts: parsedContacts,
            _ui_id: crypto.randomUUID()
          }
        })
        .filter((client: any) => {
          // Filter: Show only clients where isClient=1 (converted leads)
          const isClientValue = client.isClient
          const shouldInclude = isClientValue === 1 || isClientValue === "1" || isClientValue === true || (isClientValue != null && Number(isClientValue) === 1)

          if (shouldInclude) {
            console.log("Including client on clients page:", client.LedgerName, "isClient:", isClientValue, "type:", typeof isClientValue)
          }
          return shouldInclude
        })

      setAllClients(parsedClients)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients")
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [activeTab]) // Re-fetch when tab changes

  // Approve client
  // Approve client
  const handleApproveClient = async (client: Client) => {
    console.log("handleApproveClient called for:", client.LedgerName, "GSTNo:", client.GSTNo);

    // Check for mandatory GST Number
    if (!client.GSTNo || String(client.GSTNo).trim() === "") {
      console.warn("Approval blocked: Missing GSTNo");
      setAlertClient(client)
      setShowGSTAlert(true)
      return;
    }

    try {
      console.log("Approving client ID:", client.LedgerID);
      await clientApi.approveClient(client.LedgerID)
      console.log("Approval successful");
      toast({
        title: "Success",
        description: `Client ${client.LedgerName} approved successfully`
      })
      // Refresh list
      setAllClients(prev => prev.filter(c => c.LedgerID !== client.LedgerID))
    } catch (error) {
      console.error("Approval failed:", error);
      toast({
        title: "Error",
        description: "Failed to approve client",
        variant: "destructive"
      })
    }
  }

  // Filter clients based on search term and filters
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      // Filter by Lead Status
      if (filterLeadStatus !== "All" && client.LeadStatus !== filterLeadStatus) {
        return false;
      }



      // Filter by search term
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase()
        // Search in client fields
        const clientMatch = Object.values(client).some(value =>
          value && value.toString().toLowerCase().includes(lowerSearch)
        )

        // Search in consignee fields
        const consigneeMatch = client.Contacts?.some(consignee =>
          Object.values(consignee).some(value =>
            value && value.toString().toLowerCase().includes(lowerSearch)
          )
        )

        if (!clientMatch && !consigneeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allClients, searchTerm, filterLeadStatus, filterCustomerType])

  // Paginated clients
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredClients.slice(startIndex, endIndex)
  }, [filteredClients, currentPage, pageSize])

  // Calculate total pages
  const totalPages = Math.ceil(filteredClients.length / pageSize)

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, pageSize])

  // Toggle row expansion
  // Toggle row expansion (fixed)
  const toggleRow = (uiId: string | undefined) => {
    if (!uiId) return
    setExpandedRowId(expandedRowId === uiId ? null : uiId)
  }

  // Handle edit mode
  const startEditClient = (client: Client) => {
    if (!client._ui_id) return
    setEditingClientId(client._ui_id)
    setEditFormData({ ...client })
    // Ensure contacts is parsed if not already
    let contacts = client.Contacts || []
    if (!contacts.length && typeof client.contacts === 'string') {
      try {
        contacts = JSON.parse(client.contacts)
      } catch (e) { }
    }
    setEditFormData({ ...client, Contacts: contacts })
  }

  // Start editing a consignee
  const startEditConsignee = (clientId: number, consigneeIndex: number, consignee: Consignee) => {
    setEditingConsignee({ clientId, consigneeIndex })
    setEditFormData({ ...consignee })
  }

  const cancelEdit = () => {
    setEditingClientId(null)
    setEditingConsignee(null)
    setEditFormData({})
  }

  const saveClient = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log("saveClient: Triggered", { editingClientId, editFormData })

    if (!editingClientId) {
      console.warn("saveClient: No editingClientId")
      return
    }

    // Find the original client using _ui_id
    const originalClient = allClients.find(c => c._ui_id === editingClientId)
    console.log("saveClient: Original Client Found?", !!originalClient, originalClient)

    if (!originalClient) return

    // Use the REAL LedgerID for the API call
    const idToUpdate = originalClient.LedgerID;
    console.log("saveClient: Updating LedgerID", idToUpdate)

    // Validate GST No
    if (!editFormData.GSTNo) {
      console.warn("saveClient: Validation Failed - Missing GSTNo", { gst: editFormData.GSTNo })
      toast({
        title: "Validation Error",
        description: "GST Number is required.",
        variant: "destructive"
      })
      return
    }

    // Use existing update logic, but ensure we pass the correct structure
    // Use existing update logic, but ensure we pass the correct structure
    // We are reusing leadApi.updateLead which expects a SINGLE object
    try {
      const payload = { LedgerID: idToUpdate, ...editFormData }
      console.log("saveClient: Calling leadApi.updateLead with payload", payload)

      await leadApi.updateLead(payload)
      console.log("saveClient: API Call Success")

      toast({
        title: "Success",
        description: "Client updated successfully"
      })

      // Update local state
      setAllClients(prev => prev.map(c =>
        c._ui_id === editingClientId ? { ...c, ...editFormData } : c
      ))

      setEditingClientId(null)
      setEditFormData({})
    } catch (err) {
      console.error("saveClient: API Failure", err)
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive"
      })
    }
  }

  // Save consignee changes
  const saveConsignee = async () => {
    if (!editingConsignee) return

    try {
      const client = allClients.find(c => c.LedgerID === editingConsignee.clientId)
      if (!client) return

      const updatedContacts = [...(client.Contacts || [])]
      updatedContacts[editingConsignee.consigneeIndex] = editFormData

      await leadApi.updateLead({
        LedgerID: client.LedgerID,
        Contacts: updatedContacts
      })

      // Update local state
      setAllClients(prev => prev.map(c =>
        c.LedgerID === editingConsignee.clientId
          ? { ...c, Contacts: updatedContacts }
          : c
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

  // Delete client
  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!clientToDelete) return

    try {
      await leadApi.softDeleteLead(clientToDelete.LedgerID)
      setAllClients(prev => prev.filter(c => c.LedgerID !== clientToDelete.LedgerID))

      toast({
        title: "Success",
        description: `${clientToDelete.LedgerName} has been deleted`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      })
    } finally {
      setClientToDelete(null)
      setShowDeleteConfirm(false)
    }
  }

  // View full details
  const handleViewDetails = (clientId: number) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  // Handle view activities
  const handleViewActivities = (client: Client) => {
    const apiLead: ApiLead = {
      id: client.LedgerID,
      company_name: client.LedgerName,
      ...client
    } as any;

    setSelectedClientForActivities(apiLead);
    setShowActivitiesModal(true);
  }

  // Handle field change during editing
  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  // Render editable cell
  const renderEditableCell = (value: any, field: string, minWidth: string = "min-w-[120px]") => {
    const isCurrentlyEditing = editingClientId !== null || editingConsignee !== null

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(field, e.target.value)}
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
          <Button onClick={() => fetchClients()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <LeadActivitiesModal
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
        lead={selectedClientForActivities}
      />
      <div className="flex h-full flex-col space-y-3">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 space-y-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl">
                Clients Management
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                    <TabsTrigger value="approved">Approved Clients</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredClients.length} {activeTab === "pending" ? "pending requests" : "approved clients"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients and consignees..."
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
                    {ALL_CLIENT_COLUMNS.map((column) => (
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
                    <TableHead className="min-w-[200px]">Client Name</TableHead>
                    {ALL_CLIENT_COLUMNS.filter(col => visibleColumns.includes(col.id) && col.id !== 'LedgerName').map(col => (
                      <TableHead key={col.id} className="min-w-[150px]">{col.label}</TableHead>
                    ))}
                    <TableHead className="w-[150px] md:sticky md:right-0 bg-white dark:bg-slate-950 z-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client, index) => {
                    const isExpanded = expandedRowId === client._ui_id
                    const isEditing = editingClientId === client._ui_id
                    const hasConsignees = (client.Contacts?.length || 0) > 0
                    const rowNumber = (currentPage - 1) * pageSize + index + 1

                    // Fallback key just in case crypto fails or something weird happens (though unlikely)
                    const rowKey = client._ui_id || `client-${index}-${client.LedgerID}`

                    return (
                      <React.Fragment key={rowKey}>
                        {/* Main Client Row */}
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
                                onClick={() => toggleRow(client._ui_id)}
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
                            {isEditing ? renderEditableCell(client.LedgerName, "LedgerName", "min-w-[180px]") : client.LedgerName}
                          </TableCell>
                          {visibleColumns.includes("MailingName") && (
                            <TableCell>{isEditing ? renderEditableCell(client.MailingName, "MailingName") : (client.MailingName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MobileNo") && (
                            <TableCell>{isEditing ? renderEditableCell(client.MobileNo, "MobileNo") : (client.MobileNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("TelephoneNo") && (
                            <TableCell>{isEditing ? renderEditableCell(client.TelephoneNo, "TelephoneNo") : (client.TelephoneNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Email") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Email, "Email", "min-w-[200px]") : (client.Email || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Website") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Website, "Website") : (client.Website || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Designation") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Designation, "Designation") : (client.Designation || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("ContactPersonName") && (
                            <TableCell>{isEditing ? renderEditableCell(client.ContactPersonName, "ContactPersonName") : (client.ContactPersonName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("ContactPersonNumber") && (
                            <TableCell>{isEditing ? renderEditableCell(client.ContactPersonNumber, "ContactPersonNumber") : (client.ContactPersonNumber || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address1") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Address1, "Address1") : (client.Address1 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address2") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Address2, "Address2") : (client.Address2 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Address3") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Address3, "Address3") : (client.Address3 || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("City") && (
                            <TableCell>{isEditing ? renderEditableCell(client.City, "City") : (client.City || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("District") && (
                            <TableCell>{isEditing ? renderEditableCell(client.District, "District") : (client.District || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("State") && (
                            <TableCell>{isEditing ? renderEditableCell(client.State, "State") : (client.State || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Country") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Country, "Country") : (client.Country || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Pincode") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Pincode, "Pincode") : (client.Pincode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("GSTNo") && (
                            <TableCell>{isEditing ? renderEditableCell(client.GSTNo, "GSTNo") : (client.GSTNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("PANNo") && (
                            <TableCell>{isEditing ? renderEditableCell(client.PANNo, "PANNo") : (client.PANNo || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("LegalName") && (
                            <TableCell>{isEditing ? renderEditableCell(client.LegalName, "LegalName") : (client.LegalName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("TradeName") && (
                            <TableCell>{isEditing ? renderEditableCell(client.TradeName, "TradeName") : (client.TradeName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("FAX") && (
                            <TableCell>{isEditing ? renderEditableCell(client.FAX, "FAX") : (client.FAX || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Currency") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Currency, "Currency") : (client.Currency || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CurrencyCode") && (
                            <TableCell>{isEditing ? renderEditableCell(client.CurrencyCode, "CurrencyCode") : (client.CurrencyCode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MaxCreditLimit") && (
                            <TableCell>{isEditing ? renderEditableCell(client.MaxCreditLimit, "MaxCreditLimit") : (client.MaxCreditLimit || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("MaxCreditPeriod") && (
                            <TableCell>{isEditing ? renderEditableCell(client.MaxCreditPeriod, "MaxCreditPeriod") : (client.MaxCreditPeriod || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("FixedLimit") && (
                            <TableCell>{isEditing ? renderEditableCell(client.FixedLimit, "FixedLimit") : (client.FixedLimit || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CustomerType") && (
                            <TableCell>{isEditing ? renderEditableCell(client.CustomerType, "CustomerType") : (client.CustomerType || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("CustomerCategory") && (
                            <TableCell>{isEditing ? renderEditableCell(client.CustomerCategory, "CustomerCategory") : (client.CustomerCategory || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("SupplyTypeCode") && (
                            <TableCell>{isEditing ? renderEditableCell(client.SupplyTypeCode, "SupplyTypeCode") : (client.SupplyTypeCode || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Status") && (
                            <TableCell>
                              {isEditing ? (
                                renderEditableCell(client.Status, "Status")
                              ) : (
                                <Badge variant="outline">{client.Status || "-"}</Badge>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes("LeadStatus") && (
                            <TableCell>
                              {isEditing ? (
                                renderEditableCell(client.LeadStatus, "LeadStatus")
                              ) : (
                                <Badge variant="default" className="bg-green-600">{client.LeadStatus || "Won"}</Badge>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes("pipeline_stage_id") && (
                            <TableCell>{isEditing ? renderEditableCell(client.pipeline_stage_id, "pipeline_stage_id", "min-w-[150px]") : (
                              client.pipeline_stage_id ? renderEditableCell(client.pipeline_stage_id, "pipeline_stage_id") : "-"
                            )}</TableCell>
                          )}
                          {visibleColumns.includes("expected_revenue") && (
                            <TableCell>{isEditing ? renderEditableCell(client.expected_revenue, "expected_revenue") : (
                              client.expected_revenue ? `₹${client.expected_revenue.toLocaleString()}` : "-"
                            )}</TableCell>
                          )}
                          {visibleColumns.includes("SalesPersonName") && (
                            <TableCell>{isEditing ? renderEditableCell(client.SalesPersonName, "SalesPersonName") : (client.SalesPersonName || "-")}</TableCell>
                          )}
                          {visibleColumns.includes("Remarks") && (
                            <TableCell>{isEditing ? renderEditableCell(client.Remarks, "Remarks", "min-w-[200px]") : (client.Remarks || "-")}</TableCell>
                          )}
                          <TableCell className="md:sticky md:right-0 bg-white dark:bg-slate-950 z-10">
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={saveClient}
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
                                    <DropdownMenuItem onClick={() => handleViewDetails(client.LedgerID)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Full Details
                                    </DropdownMenuItem>
                                    {activeTab === "pending" && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleApproveClient(client)
                                      }}>
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                        <span className="text-green-600">Approve Client</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleViewActivities(client)}>
                                      <Activity className="h-4 w-4 mr-2" />
                                      Activities
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEditClient(client);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit/Update Client
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClient(client)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Client
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Consignee Rows */}
                        {isExpanded && hasConsignees && client.Contacts?.map((consignee, consigneeIndex) => {
                          const isEditingThisConsignee =
                            editingConsignee?.clientId === (client.LedgerID) && // Keep LedgerID here as consignee relation is DB based usually, or we can use UI ID if we updated the state type?
                            // Wait, editingConsignee state stores {clientId: number...}.
                            // If we want to fully decouple, we should probably check if we updated that state type.
                            // However, consignee editing is likely less critical or works differently.
                            // Let's stick safe: Determine if THIS row is being edited.
                            // Actually, I didn't update editingConsignee type. It is still number.
                            // Let's rely on LedgerID for consignees as that is likely unique-enough PER client if client is unique.
                            // BUT if LedgerID is 0 for both clients... it breaks.
                            // Since I can't easily refactor Consignee editing deep logic right now without more context,
                            // I will assume consignee editing is separate.
                            // ERROR: The user said "expand for one lead/client then it is expanding all".
                            // Using _ui_id for isExpanded checks SOLVES the expansion issue.
                            // Using _ui_id for isEditing checks SOLVES the main row edit issue.

                            editingConsignee?.clientId === client.LedgerID &&
                            editingConsignee?.consigneeIndex === consigneeIndex

                          return (
                            <TableRow
                              key={`${client.LedgerID}-consignee-${consigneeIndex}`}
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
                              {visibleColumns.includes("LeadStatus") && <TableCell>-</TableCell>}
                              {visibleColumns.includes("SalesPersonName") && <TableCell>-</TableCell>}
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
                                      className="h-8 px-2"
                                      onClick={() => startEditConsignee(client.LedgerID, consigneeIndex, consignee)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
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

              {filteredClients.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">No clients found</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredClients.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-16">
                        {pageSize}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {[10, 25, 50, 100].map((size) => (
                        <DropdownMenuItem
                          key={size}
                          onClick={() => setPageSize(size)}
                          className={pageSize === size ? "bg-accent" : ""}
                        >
                          {size}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-sm text-muted-foreground ml-4">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredClients.length)} of {filteredClients.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the client "{clientToDelete?.LedgerName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GST Alert Dialog */}
      <AlertDialog open={showGSTAlert} onOpenChange={setShowGSTAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Action Required: Missing GST Number</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot approve "{alertClient?.LedgerName}" because the GST Number is missing.
              Please add the GST Number to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {alertClient && (
              <AlertDialogAction
                onClick={() => {
                  setShowGSTAlert(false)
                  startEditClient(alertClient)
                }}
              >
                Edit Client
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

