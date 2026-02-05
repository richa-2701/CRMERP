// frontend/app/dashboard/create-lead/page.tsx
"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { leadApi, userApi, type ApiUser, type ApiLead, type SalesPerson, api } from "@/lib/api"
import { simplePipelineApi } from "@/lib/simple-pipeline-api"
import { Loader2, PlusCircle, Trash2, Settings } from "lucide-react"
import { Country, State, City } from "country-state-city"
import { Combobox } from "@/components/ui/combobox"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"

const optionalFieldsConfig = {
  "Ledger Details": ["MailingName", "LedgerDescription", "Email", "Website", "TelephoneNo", "FAX", "Designation", "LegalName", "TradeName", "GSTNo", "PANNo", "Currency", "CurrencyCode", "ContactPersonName", "ContactPersonNumber"],
  "Address Details": ["Address1", "Address2", "Address3", "District"],
  "Customer & Sales": ["CustomerType", "CustomerCategory", "SupplyTypeCode", "Status"],
  "Credit Details": ["MaxCreditLimit", "MaxCreditPeriod", "FixedLimit"],
  "Remarks": ["Remarks"],
  "Consignee Ledger Details": ["Contact_MailingName", "Contact_LedgerDescription", "Contact_Email", "Contact_Website", "Contact_TelephoneNo", "Contact_FAX", "Contact_Designation", "Contact_LegalName", "Contact_TradeName", "Contact_GSTNo", "Contact_PANNo"],
  "Consignee Address": ["Contact_Address1", "Contact_Address2", "Contact_Address3", "Contact_City", "Contact_District", "Contact_State", "Contact_Country", "Contact_Pincode"],
  "Consignee Customer & Sales": ["Contact_CustomerType", "Contact_CustomerCategory", "Contact_SupplyTypeCode", "Contact_Status"],
  "Consignee Credit Details": ["Contact_Currency", "Contact_CurrencyCode", "Contact_MaxCreditLimit", "Contact_MaxCreditPeriod", "Contact_FixedLimit"],
  "Consignee Remarks": ["Contact_Remarks"],
};

const FieldVisibilityModal = ({ open, onOpenChange, visibleFields, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, visibleFields: Set<string>, onSave: (newFields: Set<string>) => void }) => {
  const [localVisibleFields, setLocalVisibleFields] = useState(new Set(visibleFields));
  const handleToggleField = (field: string, checked: boolean) => { setLocalVisibleFields(prev => { const newFields = new Set(prev); if (checked) { newFields.add(field); } else { newFields.delete(field); } return newFields; }); };
  const handleSave = () => { onSave(localVisibleFields); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Customize Form Fields</DialogTitle><DialogDescription>Select the fields you want to display on the create form.</DialogDescription></DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          {Object.entries(optionalFieldsConfig).map(([group, fields]) => (
            <div key={group} className="space-y-2">
              <h4 className="font-semibold text-md mb-2 border-b pb-1">{group}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox id={field} checked={localVisibleFields.has(field)} onCheckedChange={(checked) => handleToggleField(field, !!checked)} />
                    <Label htmlFor={field} className="capitalize font-normal cursor-pointer">{field.replace(/_/g, " ")}</Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={handleSave}>Save Preferences</Button><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface Contact {
  LedgerName: string;
  MailingName: string;
  LedgerDescription: string;
  Address1: string;
  Address2: string;
  Address3: string;
  City: string;
  District: string;
  State: string;
  Country: string;
  Pincode: string;
  MobileNo: string;
  TelephoneNo: string;
  FAX: string;
  Email: string;
  Website: string;
  Designation: string;
  GSTNo: string;
  PANNo: string;
  LegalName: string;
  TradeName: string;
  Currency: string;
  CurrencyCode: string;
  MaxCreditLimit: string;
  MaxCreditPeriod: string;
  FixedLimit: string;
  CustomerType: string;
  CustomerCategory: string;
  SupplyTypeCode: string;
  Status: string;
  Remarks: string;
}

const initialContactState: Contact = {
  LedgerName: "",
  MailingName: "",
  LedgerDescription: "",
  Address1: "",
  Address2: "",
  Address3: "",
  City: "",
  District: "",
  State: "",
  Country: "",
  Pincode: "",
  MobileNo: "",
  TelephoneNo: "",
  FAX: "",
  Email: "",
  Website: "",
  Designation: "",
  GSTNo: "",
  PANNo: "",
  LegalName: "",
  TradeName: "",
  Currency: "",
  CurrencyCode: "",
  MaxCreditLimit: "",
  MaxCreditPeriod: "",
  FixedLimit: "",
  CustomerType: "",
  CustomerCategory: "",
  SupplyTypeCode: "",
  Status: "",
  Remarks: "",
};

interface MasterDataOptions { customer_type: string[]; customer_category: string[]; supply_type_code: string[]; }
const initialFormData = { LedgerName: "", MailingName: "", LedgerDescription: "", Address1: "", Address2: "", Address3: "", City: "", District: "", State: "", Country: "", Pincode: "", MobileNo: "", TelephoneNo: "", FAX: "", Email: "", Website: "", Designation: "", GSTNo: "", PANNo: "", LegalName: "", TradeName: "", SupplyTypeCode: "", Remarks: "", Status: "New", SalesPersonName: "", CustomerType: "", CustomerCategory: "", Currency: "", CurrencyCode: "", MaxCreditLimit: "", MaxCreditPeriod: "", FixedLimit: "", ContactPersonName: "", ContactPersonNumber: "", pipeline_stage_id: "1", expected_revenue: "" };

type ValidationErrors = { [key: string]: string | undefined | any; contacts?: { [index: number]: { LedgerName?: string; MobileNo?: string; } } }
const defaultVisibleFields = new Set([
  "Website", "Address1", "Remarks", "Designation",
  "Contact_Email", "Contact_Designation", "Contact_Address1",
  "ContactPersonName", "ContactPersonNumber"
]);

// Mock data for districts and pincodes - In production, these would come from an API
const getDistrictsByCity = (_countryCode: string, _stateCode: string, cityName: string): Array<{ value: string; label: string }> => {
  // This is a mock function. In production, you'd fetch this from your backend
  // For now, returning some sample districts
  if (!cityName) return [];
  return [
    { value: "district1", label: `${cityName} District 1` },
    { value: "district2", label: `${cityName} District 2` },
    { value: "central", label: `${cityName} Central` },
  ];
};


export default function CreateLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentContact, setCurrentContact] = useState<Contact>(initialContactState);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [masterOptions, setMasterOptions] = useState<MasterDataOptions>({ customer_type: [], customer_category: [], supply_type_code: [] });
  const [formData, setFormData] = useState(initialFormData);
  const [locationState, setLocationState] = useState<{ [key: string]: { country?: string; state?: string; city?: string; district?: string } }>({ main: {}, contact: {} });
  const [activeTab, setActiveTab] = useState("lead-info");
  const [existingLeads, setExistingLeads] = useState<ApiLead[]>([]);
  const [pipelineStages, setPipelineStages] = useState<{ id: number; name: string; color: string }[]>([]);

  useEffect(() => {
    // Load pipeline stages
    const loadStages = async () => {
      try {
        const stages = await simplePipelineApi.getStages();
        setPipelineStages(stages);
      } catch (err) {
        console.error("Failed to load pipeline stages", err);
      }
    };
    loadStages();

    // Load visible fields configuration from memory
    const savedVisibleFields = localStorage.getItem("visibleLeadFields");
    if (savedVisibleFields) {
      try {
        const parsed = JSON.parse(savedVisibleFields);
        setVisibleFields(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse saved visible fields", e);
        setVisibleFields(defaultVisibleFields); // Fallback to default if parsing fails
      }
    } else {
      setVisibleFields(defaultVisibleFields);
    }

    const fetchData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          console.log("=== Starting API Calls ===");
          console.log("Calling leadApi.getSalesPersons()...");

          const [salesPersonData, customerTypeData, customerCategoryData, supplyTypeCodeData, allLeadsData] = await Promise.all([
            leadApi.getSalesPersons(),
            api.getByCategory("CustomerType"),
            api.getByCategory("CustomerCategory"),
            api.getByCategory("SupplyTypeCode"),
            leadApi.getAllLeads()
          ]);

          setExistingLeads(allLeadsData);

          console.log("=== API Response Details ===");
          console.log("Sales Persons Raw Response:", JSON.stringify(salesPersonData, null, 2));
          console.log("Sales Persons Type:", typeof salesPersonData);
          console.log("Sales Persons Is Array:", Array.isArray(salesPersonData));
          console.log("Sales Persons Length:", salesPersonData?.length || 0);
          console.log("Customer Type Data:", customerTypeData);
          console.log("=== End API Response ===");

          setMasterOptions({ customer_type: customerTypeData.map(item => item.value), customer_category: customerCategoryData.map(item => item.value), supply_type_code: supplyTypeCodeData.map(item => item.value) });
          setSalesPersons(salesPersonData || []);

          if (salesPersonData && salesPersonData.length > 0) {
            const matchedSP = salesPersonData.find(sp => sp.employee_name === parsedUser.username);
            setFormData(prev => ({ ...prev, SalesPersonName: matchedSP ? matchedSP.employee_name : (salesPersonData[0]?.employee_name || "") }));
          } else {
            console.warn("⚠️ No sales persons found in the database");
            toast({ title: "Warning", description: "No sales persons available. Please check the backend logs for CompanyID mismatch.", variant: "default" });
          }
        }
      } catch (error) {
        console.error("❌ Failed to init form:", error);
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load initial data.", variant: "destructive" });
      }
    };
    fetchData();
  }, [toast]);

  const handleSaveVisibleFields = useCallback((newFields: Set<string>) => { setVisibleFields(newFields); localStorage.setItem("visibleLeadFields", JSON.stringify(Array.from(newFields))); toast({ title: "Preferences Saved" }); }, [toast]);

  const countryOptions = useMemo(() => Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name })), []);

  const stateOptions = (key: string) => locationState[key]?.country ? State.getStatesOfCountry(locationState[key].country!).map(s => ({ value: s.isoCode, label: s.name })) : [];

  const cityOptions = (key: string) => (locationState[key]?.country && locationState[key]?.state) ? City.getCitiesOfState(locationState[key].country!, locationState[key].state!).map(c => ({ value: c.name, label: c.name })) : [];

  const districtOptions = (key: string) => {
    const loc = locationState[key];
    if (loc?.country && loc?.state && loc?.city) {
      return getDistrictsByCity(loc.country, loc.state, loc.city);
    }
    return [];
  };


  const handleLocationChange = (key: string, field: 'country' | 'state' | 'city' | 'district', value: string) => {
    setLocationState(prev => {
      const newState = { ...prev };
      if (!newState[key]) newState[key] = {};
      (newState[key] as any)[field] = value;

      // Cascading reset logic
      if (field === 'country') {
        newState[key].state = undefined;
        newState[key].city = undefined;
        newState[key].district = undefined;
        if (key === 'main') {
          handleInputChange("State", "");
          handleInputChange("City", "");
          handleInputChange("District", "");
          handleInputChange("Pincode", "");
        } else if (key === 'contact') {
          setCurrentContact(prev => ({ ...prev, State: "", City: "", District: "", Pincode: "" }));
        }
      } else if (field === 'state') {
        newState[key].city = undefined;
        newState[key].district = undefined;
        if (key === 'main') {
          handleInputChange("City", "");
          handleInputChange("District", "");
          handleInputChange("Pincode", "");
        } else if (key === 'contact') {
          setCurrentContact(prev => ({ ...prev, City: "", District: "", Pincode: "" }));
        }
      } else if (field === 'city') {
        newState[key].district = undefined;
        if (key === 'main') {
          handleInputChange("District", "");
          handleInputChange("Pincode", "");
        } else if (key === 'contact') {
          setCurrentContact(prev => ({ ...prev, District: "", Pincode: "" }));
        }
      } else if (field === 'district') {
        if (key === 'main') {
          handleInputChange("Pincode", "");
        } else if (key === 'contact') {
          setCurrentContact(prev => ({ ...prev, Pincode: "" }));
        }
      }

      return newState;
    });

    if (key === 'main') {
      const fieldMap: { [key: string]: keyof typeof initialFormData } = {
        'country': 'Country',
        'state': 'State',
        'city': 'City',
        'district': 'District'
      };
      handleInputChange(fieldMap[field], value);
    } else if (key === 'contact') {
      const fieldMap: { [key: string]: keyof Contact } = {
        'country': 'Country',
        'state': 'State',
        'city': 'City',
        'district': 'District'
      };
      setCurrentContact(prev => ({ ...prev, [fieldMap[field]]: value }));
    }
  };

  const handleInputChange = (field: keyof typeof initialFormData, value: string | boolean) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: value }))
  };

  const handleCurrentContactChange = (field: keyof Contact, value: string | boolean) => {
    setCurrentContact(prev => ({ ...prev, [field]: value }));
  };

  const handleCurrentContactPhoneChange = (phoneValue: string) => {
    setCurrentContact(prev => ({ ...prev, MobileNo: `+${phoneValue}` }));
  };

  const addContactToTable = () => {
    // Validate current contact before adding
    if (!currentContact.LedgerName.trim()) {
      toast({ title: "Validation Error", description: "Consignee Ledger Name is required.", variant: "destructive" });
      return;
    }
    if (!currentContact.MobileNo || currentContact.MobileNo.length <= 3) {
      toast({ title: "Validation Error", description: "Consignee Mobile No is required.", variant: "destructive" });
      return;
    }

    setContacts(prev => [...prev, { ...currentContact }]);
    setCurrentContact(initialContactState);
    setLocationState(prev => ({ ...prev, contact: {} }));
    toast({ title: "Consignee Added", description: "Consignee has been added to the list." });
  };

  const removeContactFromTable = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Consignee Removed", description: "Consignee has been removed from the list." });
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!formData.LedgerName.trim()) newErrors.LedgerName = "Ledger Name is required.";
    // if (!formData.SalesPersonName.trim()) newErrors.SalesPersonName = "'Assigned To' is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check for duplicates (Handle both PascalCase from raw API and snake_case from type definition)
    const duplicateName = existingLeads.find(l => {
      const name = (l as any).LedgerName || l.ledger_name;
      return name?.trim().toLowerCase() === formData.LedgerName.trim().toLowerCase();
    });

    const duplicateMobile = existingLeads.find(l => {
      const mobile = (l as any).MobileNo || l.mobile_no;
      const targetMobile = formData.MobileNo || "";
      return mobile?.replace(/\D/g, '') === targetMobile.replace(/\D/g, '') && targetMobile.length > 5;
    });

    if (duplicateName) {
      const name = (duplicateName as any).LedgerName || duplicateName.ledger_name;
      toast({ title: "Duplicate Lead", description: `A lead with the name "${name}" already exists.`, variant: "destructive" });
      return;
    }
    if (duplicateMobile) {
      const mobile = (duplicateMobile as any).MobileNo || duplicateMobile.mobile_no;
      const name = (duplicateMobile as any).LedgerName || duplicateMobile.ledger_name;
      toast({ title: "Duplicate Lead", description: `A lead with the mobile number "${mobile}" already exists (${name}).`, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const sanitize = (value: any) => (value === null || value === undefined) ? "" : String(value).trim();
    const sanitizeNumber = (value: any) => {
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    try {
      const countryName = Country.getCountryByCode(formData.Country)?.name;
      const stateName = State.getStateByCodeAndCountry(formData.State, formData.Country)?.name;

      const processedContacts = contacts.map((c) => {
        const contactCountry = Country.getCountryByCode(c.Country)?.name;
        const contactState = State.getStateByCodeAndCountry(c.State, c.Country)?.name;
        return {
          ledger_name: c.LedgerName,
          mailing_name: c.MailingName || c.LedgerName,
          mobile_no: c.MobileNo,
          telephone_no: c.TelephoneNo,
          email: c.Email,
          designation: c.Designation,
          pan_no: c.PANNo,
          gst_no: c.GSTNo,
          address1: c.Address1,
          address2: c.Address2,
          address3: c.Address3,
          city: c.City,
          district: c.District,
          state: contactState || c.State,
          country: contactCountry || c.Country,
          pincode: c.Pincode,
          remarks: c.Remarks,
          legal_name: c.LegalName,
          trade_name: c.TradeName,
          website: c.Website,
          fax: c.FAX,
          ledger_description: c.LedgerDescription,
          currency: c.Currency,
          currency_code: c.CurrencyCode,
          max_credit_limit: c.MaxCreditLimit ? parseFloat(c.MaxCreditLimit) : null,
          max_credit_period: c.MaxCreditPeriod ? parseFloat(c.MaxCreditPeriod) : null,
          fixed_limit: c.FixedLimit ? parseFloat(c.FixedLimit) : null,
          customer_type: c.CustomerType,
          customer_category: c.CustomerCategory,
          supply_type_code: c.SupplyTypeCode,
          status: c.Status
        };
      });

      // Get sales person ID from form selection
      const salesPersonId = formData.SalesPersonName ? parseInt(formData.SalesPersonName, 10) : undefined;

      const sanitize = (val: string): string | undefined => val && val.trim() !== "" ? val : undefined;
      const sanitizeNumber = (val: string): number | null | undefined => val && val.trim() !== "" ? parseFloat(val) : null;

      const leadPayload: Partial<ApiLead> = {
        ledger_name: formData.LedgerName,
        mailing_name: sanitize(formData.MailingName),
        ledger_description: sanitize(formData.LedgerDescription),
        address1: sanitize(formData.Address1),
        address2: sanitize(formData.Address2),
        address3: sanitize(formData.Address3),
        city: sanitize(formData.City),
        district: sanitize(formData.District),
        state: stateName || sanitize(formData.State),
        country: countryName || sanitize(formData.Country),
        pincode: sanitize(formData.Pincode),
        mobile_no: sanitize(formData.MobileNo),
        telephone_no: sanitize(formData.TelephoneNo),
        fax: sanitize(formData.FAX),
        email: sanitize(formData.Email),
        website: sanitize(formData.Website),
        designation: sanitize(formData.Designation),
        gst_no: sanitize(formData.GSTNo),
        pan_no: sanitize(formData.PANNo),
        contact_person_name: sanitize(formData.ContactPersonName),
        contact_person_number: sanitize(formData.ContactPersonNumber),
        legal_name: sanitize(formData.LegalName),
        trade_name: sanitize(formData.TradeName),
        supply_type_code: sanitize(formData.SupplyTypeCode),
        remarks: sanitize(formData.Remarks),
        status: sanitize(formData.Status),
        pipeline_stage_id: formData.pipeline_stage_id ? parseInt(formData.pipeline_stage_id) : 1,
        expected_revenue: formData.expected_revenue ? parseFloat(formData.expected_revenue) : 0,
        ref_sales_representative_id: salesPersonId,
        customer_type: sanitize(formData.CustomerType),
        customer_category: sanitize(formData.CustomerCategory),
        currency: sanitize(formData.Currency),
        currency_code: sanitize(formData.CurrencyCode),
        max_credit_limit: sanitizeNumber(formData.MaxCreditLimit),
        max_credit_period: sanitizeNumber(formData.MaxCreditPeriod),
        fixed_limit: sanitizeNumber(formData.FixedLimit),
        contacts: processedContacts,
      };

      const response = await leadApi.createLead(leadPayload);
      toast({ title: "Lead Created", description: response.message || "The lead has been successfully created." });
      router.push('/dashboard/leads');
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create lead.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      <FieldVisibilityModal open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} visibleFields={visibleFields} onSave={handleSaveVisibleFields} />
      <div className="flex justify-between items-center">
        <div>
          {/* <h1 className="text-3xl font-bold">Create Ledger (Lead)</h1> */}
          <p className="text-muted-foreground">Add a new business lead to the system.</p>
        </div>
        <Button size="sm" onClick={() => setIsSettingsModalOpen(true)}><Settings className="h-4 w-4 mr-2" />Customize</Button>
      </div>

      <form onSubmit={handleSubmit} ref={formRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="lead-info">Lead Information</TabsTrigger>
            <TabsTrigger value="consignees">Concern Person({contacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="lead-info" className="space-y-4">
            {/* Ledger Details */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Ledger Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="LedgerName" className="text-xs">Ledger Name *</Label>
                    <Input id="LedgerName" value={formData.LedgerName} onChange={e => handleInputChange("LedgerName", e.target.value)} className={`h-8 text-sm ${errors.LedgerName ? "border-red-500" : ""}`} placeholder="Company/Entity Name" />
                    {errors.LedgerName && <p className="text-red-500 text-[10px]">{errors.LedgerName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="MobileNo" className="text-xs">Mobile No *</Label>
                    <PhoneInput country="in" value={formData.MobileNo} onChange={v => handleInputChange("MobileNo", v)} inputProps={{ id: "MobileNo" }} containerClass="!h-8" inputClass="!w-full !h-8 !text-sm" buttonClass="!h-8" countryCodeEditable={false} enableSearch />
                    {errors.MobileNo && <p className="text-red-500 text-[10px]">{errors.MobileNo}</p>}
                  </div>

                  {/* Contact Person Details */}
                  {visibleFields.has("ContactPersonName") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ContactPersonName" className="text-xs">Contact Person Name</Label>
                      <Input id="ContactPersonName" value={formData.ContactPersonName} onChange={e => handleInputChange("ContactPersonName", e.target.value)} className="h-8 text-sm" placeholder="Name of primary contact" />
                    </div>
                  )}
                  {visibleFields.has("ContactPersonNumber") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ContactPersonNumber" className="text-xs">Contact Person Number</Label>
                      <PhoneInput country="in" value={formData.ContactPersonNumber} onChange={v => handleInputChange("ContactPersonNumber", v)} inputProps={{ id: "ContactPersonNumber" }} containerClass="!h-8" inputClass="!w-full !h-8 !text-sm" buttonClass="!h-8" countryCodeEditable={false} enableSearch />
                    </div>
                  )}
                  {visibleFields.has("MailingName") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="MailingName" className="text-xs">Mailing Name</Label>
                      <Input id="MailingName" value={formData.MailingName} onChange={e => handleInputChange("MailingName", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Email") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Email" className="text-xs">Email</Label>
                      <Input id="Email" type="email" value={formData.Email} onChange={e => handleInputChange("Email", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Website") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Website" className="text-xs">Website</Label>
                      <Input id="Website" type="url" value={formData.Website} onChange={e => handleInputChange("Website", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("TelephoneNo") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="TelephoneNo" className="text-xs">Telephone</Label>
                      <Input id="TelephoneNo" value={formData.TelephoneNo} onChange={e => handleInputChange("TelephoneNo", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("FAX") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="FAX" className="text-xs">FAX</Label>
                      <Input id="FAX" value={formData.FAX} onChange={e => handleInputChange("FAX", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Designation") && (
                    <div className="space-y-2">
                      <Label htmlFor="Designation">Designation</Label>
                      <Input id="Designation" name="Designation" value={formData.Designation} onChange={e => handleInputChange("Designation", e.target.value)} placeholder="Enter designation" />
                    </div>
                  )}
                  {visibleFields.has("LegalName") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="LegalName" className="text-xs">Legal Name</Label>
                      <Input id="LegalName" value={formData.LegalName} onChange={e => handleInputChange("LegalName", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("TradeName") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="TradeName" className="text-xs">Trade Name</Label>
                      <Input id="TradeName" value={formData.TradeName} onChange={e => handleInputChange("TradeName", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                </div>
                {visibleFields.has("LedgerDescription") && (
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="LedgerDescription" className="text-xs">Description</Label>
                    <Textarea id="LedgerDescription" value={formData.LedgerDescription} onChange={e => handleInputChange("LedgerDescription", e.target.value)} className="text-sm min-h-[60px]" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Address</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  {visibleFields.has("Address1") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Address1" className="text-xs">Address 1</Label>
                      <Input id="Address1" value={formData.Address1} onChange={e => handleInputChange("Address1", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Address2") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Address2" className="text-xs">Address 2</Label>
                      <Input id="Address2" value={formData.Address2} onChange={e => handleInputChange("Address2", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Address3") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Address3" className="text-xs">Address 3</Label>
                      <Input id="Address3" value={formData.Address3} onChange={e => handleInputChange("Address3", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="Country" className="text-xs">Country</Label>
                    <Combobox options={countryOptions} value={formData.Country} onChange={v => handleLocationChange('main', 'country', v)} placeholder="Select country..." searchPlaceholder="Search country..." className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="State" className="text-xs">State</Label>
                    <Combobox options={stateOptions('main')} value={formData.State} onChange={v => handleLocationChange('main', 'state', v)} placeholder="Select state..." searchPlaceholder="Search state..." className="h-8 text-sm" disabled={!locationState.main?.country} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="City" className="text-xs">City</Label>
                    <Combobox options={cityOptions('main')} value={formData.City} onChange={v => handleLocationChange('main', 'city', v)} placeholder="Select city..." searchPlaceholder="Search city..." className="h-8 text-sm" disabled={!locationState.main?.state} />
                  </div>
                  {visibleFields.has("District") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="District" className="text-xs">District</Label>
                      <Combobox options={districtOptions('main')} value={formData.District} onChange={v => handleInputChange("District", v)} placeholder="Select district..." searchPlaceholder="Search district..." className="h-8 text-sm" disabled={!locationState.main?.city} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="Pincode" className="text-xs">Pincode</Label>
                    <Input id="Pincode" value={formData.Pincode} onChange={e => handleInputChange("Pincode", e.target.value)} placeholder="Enter pincode..." className="h-8 text-sm" maxLength={10} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax & Financial */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Tax & Financial</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  {visibleFields.has("GSTNo") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="GSTNo" className="text-xs">GST No.</Label>
                      <Input id="GSTNo" value={formData.GSTNo} onChange={e => handleInputChange("GSTNo", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("PANNo") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="PANNo" className="text-xs">PAN No.</Label>
                      <Input id="PANNo" value={formData.PANNo} onChange={e => handleInputChange("PANNo", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("Currency") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="Currency" className="text-xs">Currency</Label>
                      <Input id="Currency" value={formData.Currency} onChange={e => handleInputChange("Currency", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("CurrencyCode") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="CurrencyCode" className="text-xs">Currency Code</Label>
                      <Input id="CurrencyCode" value={formData.CurrencyCode} onChange={e => handleInputChange("CurrencyCode", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("MaxCreditLimit") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="MaxCreditLimit" className="text-xs">Max Credit Limit</Label>
                      <Input id="MaxCreditLimit" type="number" value={formData.MaxCreditLimit} onChange={e => handleInputChange("MaxCreditLimit", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("MaxCreditPeriod") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="MaxCreditPeriod" className="text-xs">Max Credit Period (Days)</Label>
                      <Input id="MaxCreditPeriod" type="number" value={formData.MaxCreditPeriod} onChange={e => handleInputChange("MaxCreditPeriod", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  {visibleFields.has("FixedLimit") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="FixedLimit" className="text-xs">Fixed Limit</Label>
                      <Input id="FixedLimit" type="number" value={formData.FixedLimit} onChange={e => handleInputChange("FixedLimit", e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Classification & Assignment */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Classification & Assignment</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="SalesPersonName" className="text-xs">Assigned To</Label>
                    <Select value={formData.SalesPersonName} onValueChange={v => handleInputChange("SalesPersonName", v)}>
                      <SelectTrigger id="SalesPersonName" className={`h-8 text-sm w-full [&>span]:truncate ${errors.SalesPersonName ? "border-red-500" : ""}`}>
                        <SelectValue placeholder={salesPersons.length === 0 ? "No sales persons available" : "Select..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {salesPersons.length > 0 ? salesPersons.map((sp, idx) => {
                          const spId = sp.employee_id || sp.employee_i_d;
                          return (
                            <SelectItem key={`sp-${idx}-${spId}`} value={spId?.toString() || ""}>
                              {sp.employee_name} ({spId})
                            </SelectItem>
                          );
                        }) : <div className="px-2 py-1.5 text-sm text-muted-foreground">No sales persons found</div>}
                      </SelectContent>
                    </Select>
                  </div>
                  {visibleFields.has("CustomerType") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="CustomerType" className="text-xs">Customer Type</Label>
                      <Select value={formData.CustomerType} onValueChange={v => handleInputChange("CustomerType", v)}>
                        <SelectTrigger className="h-8 text-sm w-full [&>span]:truncate"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{masterOptions.customer_type.map((o, i) => <SelectItem key={`customertype-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {visibleFields.has("CustomerCategory") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="CustomerCategory" className="text-xs">Customer Category</Label>
                      <Select value={formData.CustomerCategory} onValueChange={v => handleInputChange("CustomerCategory", v)}>
                        <SelectTrigger className="h-8 text-sm w-full [&>span]:truncate"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{masterOptions.customer_category.map((o, i) => <SelectItem key={`customercategory-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {visibleFields.has("SupplyTypeCode") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="SupplyTypeCode" className="text-xs">Supply Type</Label>
                      <Select value={formData.SupplyTypeCode} onValueChange={v => handleInputChange("SupplyTypeCode", v)}>
                        <SelectTrigger className="h-8 text-sm w-full [&>span]:truncate"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{masterOptions.supply_type_code.map((o, i) => <SelectItem key={`supplytype-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Lead Status Removed as per request */}

                  <div className="space-y-1.5">
                    <Label htmlFor="pipeline_stage_id" className="text-xs">Pipeline Stage</Label>
                    <Select value={formData.pipeline_stage_id} onValueChange={v => handleInputChange("pipeline_stage_id", v)}>
                      <SelectTrigger className="h-8 text-sm w-full [&>span]:truncate"><SelectValue placeholder="Select Stage..." /></SelectTrigger>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="expected_revenue" className="text-xs">Expected Revenue (₹)</Label>
                    <Input
                      id="expected_revenue"
                      type="number"
                      value={formData.expected_revenue}
                      onChange={(e) => handleInputChange("expected_revenue", e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            {visibleFields.has("Remarks") && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Remarks</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={formData.Remarks} onChange={e => handleInputChange("Remarks", e.target.value)} className="text-sm min-h-[60px]" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="consignees" className="space-y-4">
            {/* Add Consignee Form */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Add Consignee</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Basic Details</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_LedgerName" className="text-xs">Concern Person Name *</Label>
                      <Input id="contact_LedgerName" value={currentContact.LedgerName} onChange={e => handleCurrentContactChange("LedgerName", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_MobileNo" className="text-xs">Mobile No *</Label>
                      <PhoneInput country="in" value={currentContact.MobileNo} onChange={handleCurrentContactPhoneChange} inputProps={{ id: "contact_MobileNo" }} containerClass="!h-8" inputClass="!w-full !h-8 !text-sm" buttonClass="!h-8" countryCodeEditable={false} enableSearch />
                    </div>
                    {visibleFields.has("Contact_MailingName") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_MailingName" className="text-xs">Mailing Name</Label>
                        <Input id="contact_MailingName" value={currentContact.MailingName} onChange={e => handleCurrentContactChange("MailingName", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_Email") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Email" className="text-xs">Email</Label>
                        <Input id="contact_Email" type="email" value={currentContact.Email} onChange={e => handleCurrentContactChange("Email", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_Website") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Website" className="text-xs">Website</Label>
                        <Input id="contact_Website" type="url" value={currentContact.Website} onChange={e => handleCurrentContactChange("Website", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_TelephoneNo") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_TelephoneNo" className="text-xs">Telephone</Label>
                        <Input id="contact_TelephoneNo" value={currentContact.TelephoneNo} onChange={e => handleCurrentContactChange("TelephoneNo", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_FAX") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_FAX" className="text-xs">FAX</Label>
                        <Input id="contact_FAX" value={currentContact.FAX} onChange={e => handleCurrentContactChange("FAX", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}

                    {visibleFields.has("Contact_Designation") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Designation" className="text-xs">Designation</Label>
                        <Input id="contact_Designation" value={currentContact.Designation} onChange={e => handleCurrentContactChange("Designation", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_LegalName") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_LegalName" className="text-xs">Legal Name</Label>
                        <Input id="contact_LegalName" value={currentContact.LegalName} onChange={e => handleCurrentContactChange("LegalName", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_TradeName") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_TradeName" className="text-xs">Trade Name</Label>
                        <Input id="contact_TradeName" value={currentContact.TradeName} onChange={e => handleCurrentContactChange("TradeName", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                  </div>
                  {visibleFields.has("Contact_LedgerDescription") && (
                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor="contact_LedgerDescription" className="text-xs">Description</Label>
                      <Textarea id="contact_LedgerDescription" value={currentContact.LedgerDescription} onChange={e => handleCurrentContactChange("LedgerDescription", e.target.value)} className="text-sm min-h-[60px]" />
                    </div>
                  )}
                </div>

                {/* Address Section */}
                {visibleFields.has("Contact_Address1") && (
                  <div className="border-t pt-3 space-y-3">
                    <h4 className="text-sm font-semibold">Address</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Address1" className="text-xs">Address 1</Label>
                        <Input id="contact_Address1" value={currentContact.Address1} onChange={e => handleCurrentContactChange("Address1", e.target.value)} className="h-8 text-sm" />
                      </div>
                      {visibleFields.has("Contact_Address2") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_Address2" className="text-xs">Address 2</Label>
                          <Input id="contact_Address2" value={currentContact.Address2} onChange={e => handleCurrentContactChange("Address2", e.target.value)} className="h-8 text-sm" />
                        </div>
                      )}
                      {visibleFields.has("Contact_Address3") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_Address3" className="text-xs">Address 3</Label>
                          <Input id="contact_Address3" value={currentContact.Address3} onChange={e => handleCurrentContactChange("Address3", e.target.value)} className="h-8 text-sm" />
                        </div>
                      )}
                      {visibleFields.has("Contact_Country") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_Country" className="text-xs">Country</Label>
                          <Combobox options={countryOptions} value={currentContact.Country} onChange={v => handleLocationChange('contact', 'country', v)} placeholder="Select country..." searchPlaceholder="Search country..." className="h-8 text-sm" />
                        </div>
                      )}
                      {visibleFields.has("Contact_State") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_State" className="text-xs">State</Label>
                          <Combobox options={stateOptions('contact')} value={currentContact.State} onChange={v => handleLocationChange('contact', 'state', v)} placeholder="Select state..." searchPlaceholder="Search state..." className="h-8 text-sm" disabled={!locationState.contact?.country} />
                        </div>
                      )}
                      {visibleFields.has("Contact_City") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_City" className="text-xs">City</Label>
                          <Combobox options={cityOptions('contact')} value={currentContact.City} onChange={v => handleLocationChange('contact', 'city', v)} placeholder="Select city..." searchPlaceholder="Search city..." className="h-8 text-sm" disabled={!locationState.contact?.state} />
                        </div>
                      )}
                      {visibleFields.has("Contact_District") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_District" className="text-xs">District</Label>
                          <Combobox options={districtOptions('contact')} value={currentContact.District} onChange={v => handleCurrentContactChange("District", v)} placeholder="Select district..." searchPlaceholder="Search district..." className="h-8 text-sm" disabled={!locationState.contact?.city} />
                        </div>
                      )}
                      {visibleFields.has("Contact_Pincode") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="contact_Pincode" className="text-xs">Pincode</Label>
                          <Input id="contact_Pincode" value={currentContact.Pincode} onChange={e => handleCurrentContactChange("Pincode", e.target.value)} placeholder="Enter pincode..." className="h-8 text-sm" maxLength={10} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tax & Financial Details */}
                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-sm font-semibold">Tax & Financial Details</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    {visibleFields.has("Contact_GSTNo") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_GSTNo" className="text-xs">GST No.</Label>
                        <Input id="contact_GSTNo" value={currentContact.GSTNo} onChange={e => handleCurrentContactChange("GSTNo", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_PANNo") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_PANNo" className="text-xs">PAN No.</Label>
                        <Input id="contact_PANNo" value={currentContact.PANNo} onChange={e => handleCurrentContactChange("PANNo", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_Currency") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Currency" className="text-xs">Currency</Label>
                        <Input id="contact_Currency" value={currentContact.Currency} onChange={e => handleCurrentContactChange("Currency", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_CurrencyCode") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_CurrencyCode" className="text-xs">Currency Code</Label>
                        <Input id="contact_CurrencyCode" value={currentContact.CurrencyCode} onChange={e => handleCurrentContactChange("CurrencyCode", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_MaxCreditLimit") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_MaxCreditLimit" className="text-xs">Max Credit Limit</Label>
                        <Input id="contact_MaxCreditLimit" type="number" value={currentContact.MaxCreditLimit} onChange={e => handleCurrentContactChange("MaxCreditLimit", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_MaxCreditPeriod") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_MaxCreditPeriod" className="text-xs">Max Credit Period (Days)</Label>
                        <Input id="contact_MaxCreditPeriod" type="number" value={currentContact.MaxCreditPeriod} onChange={e => handleCurrentContactChange("MaxCreditPeriod", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                    {visibleFields.has("Contact_FixedLimit") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_FixedLimit" className="text-xs">Fixed Limit</Label>
                        <Input id="contact_FixedLimit" type="number" value={currentContact.FixedLimit} onChange={e => handleCurrentContactChange("FixedLimit", e.target.value)} className="h-8 text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer & Sales Details */}
                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-sm font-semibold">Customer & Sales</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    {visibleFields.has("Contact_CustomerType") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_CustomerType" className="text-xs">Customer Type</Label>
                        <Select value={currentContact.CustomerType} onValueChange={v => handleCurrentContactChange("CustomerType", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{masterOptions.customer_type.map((o, i) => <SelectItem key={`contact-customertype-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {visibleFields.has("Contact_CustomerCategory") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_CustomerCategory" className="text-xs">Customer Category</Label>
                        <Select value={currentContact.CustomerCategory} onValueChange={v => handleCurrentContactChange("CustomerCategory", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{masterOptions.customer_category.map((o, i) => <SelectItem key={`contact-customercategory-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {visibleFields.has("Contact_SupplyTypeCode") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_SupplyTypeCode" className="text-xs">Supply Type</Label>
                        <Select value={currentContact.SupplyTypeCode} onValueChange={v => handleCurrentContactChange("SupplyTypeCode", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{masterOptions.supply_type_code.map((o, i) => <SelectItem key={`contact-supplytype-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {visibleFields.has("Contact_Status") && (
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_Status" className="text-xs">Status</Label>
                        <Select value={currentContact.Status} onValueChange={v => handleCurrentContactChange("Status", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                {visibleFields.has("Contact_Remarks") && (
                  <div className="border-t pt-3 space-y-3">
                    <h4 className="text-sm font-semibold">Remarks</h4>
                    <Textarea id="contact_Remarks" value={currentContact.Remarks} onChange={e => handleCurrentContactChange("Remarks", e.target.value)} className="text-sm min-h-[60px]" />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={addContactToTable} size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Consignee
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Consignees Table */}
            {contacts.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Consignees List</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] sticky left-0 bg-background z-10">#</TableHead>
                          <TableHead className="min-w-[180px]">Ledger Name</TableHead>
                          <TableHead className="min-w-[150px]">Mailing Name</TableHead>
                          <TableHead className="min-w-[120px]">Mobile No</TableHead>
                          <TableHead className="min-w-[120px]">Telephone No</TableHead>
                          <TableHead className="min-w-[200px]">Email</TableHead>
                          <TableHead className="min-w-[150px]">Website</TableHead>
                          <TableHead className="min-w-[120px]">Designation</TableHead>
                          <TableHead className="min-w-[150px]">Address 1</TableHead>
                          <TableHead className="min-w-[150px]">Address 2</TableHead>
                          <TableHead className="min-w-[150px]">Address 3</TableHead>
                          <TableHead className="min-w-[120px]">City</TableHead>
                          <TableHead className="min-w-[120px]">District</TableHead>
                          <TableHead className="min-w-[120px]">State</TableHead>
                          <TableHead className="min-w-[120px]">Country</TableHead>
                          <TableHead className="min-w-[100px]">Pincode</TableHead>
                          <TableHead className="min-w-[120px]">GST No</TableHead>
                          <TableHead className="min-w-[120px]">PAN No</TableHead>
                          <TableHead className="min-w-[150px]">Legal Name</TableHead>
                          <TableHead className="min-w-[150px]">Trade Name</TableHead>
                          <TableHead className="min-w-[100px]">FAX</TableHead>
                          <TableHead className="min-w-[100px]">Currency</TableHead>
                          <TableHead className="min-w-[120px]">Currency Code</TableHead>
                          <TableHead className="min-w-[150px]">Max Credit Limit</TableHead>
                          <TableHead className="min-w-[150px]">Max Credit Period</TableHead>
                          <TableHead className="min-w-[120px]">Fixed Limit</TableHead>
                          <TableHead className="min-w-[130px]">Customer Type</TableHead>
                          <TableHead className="min-w-[150px]">Customer Category</TableHead>
                          <TableHead className="min-w-[150px]">Supply Type Code</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>

                          <TableHead className="min-w-[200px]">Remarks</TableHead>
                          <TableHead className="w-[120px] sticky right-0 bg-background z-10">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact, index) => {
                          const isEditing = editingContactIndex === index;
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium sticky left-0 bg-background z-10">{index + 1}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.LedgerName}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].LedgerName = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[160px]"
                                  />
                                ) : (
                                  contact.LedgerName
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.MailingName}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].MailingName = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.MailingName || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.MobileNo}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].MobileNo = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.MobileNo
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.TelephoneNo}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].TelephoneNo = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.TelephoneNo || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Email}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Email = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[180px]"
                                  />
                                ) : (
                                  contact.Email || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Website}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Website = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.Website || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Designation}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Designation = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.Designation || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Address1}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Address1 = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.Address1 || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Address2}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Address2 = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.Address2 || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Address3}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Address3 = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.Address3 || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.City}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].City = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.City || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.District}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].District = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.District || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.State}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].State = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.State || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Country}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Country = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.Country || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Pincode}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Pincode = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[80px]"
                                  />
                                ) : (
                                  contact.Pincode || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.GSTNo}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].GSTNo = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.GSTNo || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.PANNo}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].PANNo = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.PANNo || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.LegalName}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].LegalName = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.LegalName || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.TradeName}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].TradeName = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.TradeName || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.FAX}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].FAX = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[80px]"
                                  />
                                ) : (
                                  contact.FAX || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Currency}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Currency = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[80px]"
                                  />
                                ) : (
                                  contact.Currency || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.CurrencyCode}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].CurrencyCode = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.CurrencyCode || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.MaxCreditLimit}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].MaxCreditLimit = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.MaxCreditLimit || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.MaxCreditPeriod}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].MaxCreditPeriod = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.MaxCreditPeriod || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.FixedLimit}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].FixedLimit = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  contact.FixedLimit || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.CustomerType}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].CustomerType = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[110px]"
                                  />
                                ) : (
                                  contact.CustomerType || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.CustomerCategory}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].CustomerCategory = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.CustomerCategory || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.SupplyTypeCode}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].SupplyTypeCode = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[130px]"
                                  />
                                ) : (
                                  contact.SupplyTypeCode || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Status}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Status = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[80px]"
                                  />
                                ) : (
                                  contact.Status || "-"
                                )}
                              </TableCell>

                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={contact.Remarks}
                                    onChange={(e) => {
                                      const updated = [...contacts];
                                      updated[index].Remarks = e.target.value;
                                      setContacts(updated);
                                    }}
                                    className="h-8 text-sm min-w-[180px]"
                                  />
                                ) : (
                                  contact.Remarks || "-"
                                )}
                              </TableCell>
                              <TableCell className="sticky right-0 bg-background z-10">
                                <div className="flex gap-1">
                                  {isEditing ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => setEditingContactIndex(null)}
                                    >
                                      Done
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => setEditingContactIndex(index)}
                                    >
                                      Edit
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removeContactFromTable(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Ledger"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}