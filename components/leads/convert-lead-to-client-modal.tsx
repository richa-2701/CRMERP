//frontend/components/leads/convert-lead-to-client-modal.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, type ApiLead, type ClientContact, type ConvertLeadToClientPayload } from "@/lib/api"
import { Loader2, PlusCircle, Trash2 } from "lucide-react"

import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { Country, State, City } from "country-state-city"
import { Combobox } from "@/components/ui/combobox"
import { format } from "date-fns"

interface LeadContactForConversion {
  id?: number
  prefix: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  designation: string | null
  linkedIn: string | null
  pan: string | null
}

interface ConvertLeadToClientModalProps {
  lead: ApiLead | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (convertedLeadId: string) => void
}

const namePrefixes = ["Mr.", "Mrs.", "Ms."]

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(" ")
  let prefix = ""
  let firstName = ""
  let lastName = ""

  if (parts.length > 0 && namePrefixes.includes(parts[0])) {
    prefix = parts.shift() || ""
  }

  if (parts.length > 0) {
    firstName = parts.shift() || ""
  }
  lastName = parts.join(" ")

  return { prefix: prefix || "Mr.", first_name: firstName, last_name: lastName }
}

interface MasterDataOptions {
    version: string[];
    segment: string[];
    verticles: string[];
    current_system: string[];
}

export function ConvertLeadToClientModal({ lead, isOpen, onClose, onSuccess }: ConvertLeadToClientModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState({
    company_name: "", website: "", linkedIn: "", company_email: "", company_phone_2: "",
    address: "", address_2: "", country: "", state: "", city: "", pincode: "",
    segment: "", verticles: "", team_size: "", turnover: "", current_system: "",
    machine_specification: "", challenges: "",
    version: "", database_type: "", amc: "", gst: "",
    converted_date: format(new Date(), "yyyy-MM-dd"),
  })
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>()
  const [selectedState, setSelectedState] = useState<string | undefined>()
  const [contacts, setContacts] = useState<LeadContactForConversion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [masterOptions, setMasterOptions] = useState<MasterDataOptions>({
      version: [], segment: [], verticles: [], current_system: []
  });

  const countryOptions = useMemo(() => Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name })), [])
  const stateOptions = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry).map(s => ({ value: s.isoCode, label: s.name })) : [], [selectedCountry])
  const cityOptions = useMemo(() => (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry, selectedState).map(c => ({ value: c.name, label: c.name })) : [], [selectedCountry, selectedState])

  useEffect(() => {
    if (isOpen) {
        const fetchMasterData = async () => {
            try {
                const [versionData, segmentData, verticlesData, currentSystemData] = await Promise.all([
                    api.getByCategory("version"),
                    api.getByCategory("segment"),
                    api.getByCategory("verticles"),
                    api.getByCategory("current_system")
                ]);
                setMasterOptions({
                    version: versionData.map(item => item.value),
                    segment: segmentData.map(item => item.value),
                    verticles: verticlesData.map(item => item.value),
                    current_system: currentSystemData.map(item => item.value),
                });
            } catch (err) {
                console.error("Failed to fetch master data for conversion modal:", err);
                toast({ title: "Error", description: "Could not load dropdown options.", variant: "destructive" });
            }
        };
        fetchMasterData();
    }
  }, [isOpen, toast]);
  
  useEffect(() => {
    if (lead && isOpen) {
      const countryObj = countryOptions.find(c => c.label === lead.country);
      const countryCode = countryObj?.value;
      
      let stateCode: string | undefined;
      if (countryCode && lead.state) {
        const statesOfCountry = State.getStatesOfCountry(countryCode);
        const stateObj = statesOfCountry.find(s => s.name === lead.state);
        stateCode = stateObj?.isoCode;
      }

      setSelectedCountry(countryCode);
      setSelectedState(stateCode);

      setFormData({
        company_name: lead.company_name || "",
        website: lead.website || "",
        linkedIn: lead.linkedIn || "",
        company_email: lead.email || "",
        company_phone_2: lead.phone_2 || "",
        address: lead.address || "",
        address_2: lead.address_2 || "",
        country: countryCode || "",
        state: stateCode || "",
        city: lead.city || "",
        pincode: lead.pincode || "",
        segment: lead.segment || "",
        verticles: lead.verticles || "",
        team_size: String(lead.team_size || ""),
        turnover: lead.turnover || "",
        current_system: lead.current_system || "",
        machine_specification: lead.machine_specification || "",
        challenges: lead.challenges || "",
        version: lead.version || "",
        database_type: lead.database_type || "",
        amc: lead.amc || "",
        gst: lead.gst || "",
        converted_date: format(new Date(), "yyyy-MM-dd"),
      });

      if (lead.contacts && lead.contacts.length > 0) {
        setContacts(lead.contacts.map(c => ({
          ...c,
          ...splitFullName(c.contact_name || ""),
          linkedIn: c.linkedIn || "",
          pan: c.pan || "",
        })))
      } else {
        setContacts([{ prefix: "Mr.", first_name: "", last_name: "", phone: "", email: "", designation: "", linkedIn: "", pan: "" }])
      }
    }
  }, [lead, isOpen, countryOptions]);

  const handleInputChange = (field: keyof Omit<typeof formData, "remark">, value: string) => setFormData(prev => ({ ...prev, [field]: value }))
  const handleContactChange = (index: number, field: keyof LeadContactForConversion, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  }
  const handleContactPhoneChange = (index: number, value: string) => { const newContacts = [...contacts]; newContacts[index].phone = value; setContacts(newContacts); }
  const addContact = () => setContacts([...contacts, { prefix: "Mr.", first_name: "", last_name: "", phone: "", email: "", designation: "", linkedIn: "", pan: "" }])
  const removeContact = (index: number) => { if (contacts.length > 1) setContacts(contacts.filter((_, i) => i !== index)) }

  const handleConvert = async () => {
    if (!lead) return

    if (!formData.gst || formData.gst.trim() === "") {
        toast({
            title: "Missing Information",
            description: "GST No. is mandatory to convert a lead to a client.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true)

    const clientContacts: ClientContact[] = contacts.map(c => ({
      contact_name: `${c.prefix} ${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      email: c.email,
      designation: c.designation,
      linkedIn: c.linkedIn,
      pan: c.pan,
    }))

    const countryName = Country.getCountryByCode(formData.country)?.name
    const stateName = State.getStateByCodeAndCountry(formData.state, formData.country)?.name || formData.state;

    const payload: ConvertLeadToClientPayload = {
      ...formData,
      country: countryName || formData.country,
      state: stateName,
      contacts: clientContacts,
    }

    try {
      await api.convertToClient(Number(lead.id), null, payload)
      onSuccess(lead.id.toString())
    } catch (error: any) {
      if (error.message && error.message.includes("409")) {
        let message = "This lead has already been converted to a Client.";
        try {
          // Extract the JSON part of the message for a more specific error
          const jsonString = error.message.substring(error.message.indexOf('{'));
          const parsed = JSON.parse(jsonString);
          message = parsed.Message || message;
        } catch (e) {
            // Fallback for non-JSON messages
            const simpleMessage = error.message.split(':').slice(1).join(':').trim();
            message = simpleMessage || message;
        }
        toast({
            title: "Already Converted",
            description: message,
            variant: "default",
        });
        router.push('/dashboard/clients'); 
        onClose();
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Conversion failed. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Convert Lead to Client: {lead.company_name}</DialogTitle><DialogDescription>Review and update details before converting this lead into a client.</DialogDescription></DialogHeader>

        <div className="space-y-6 py-4">

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2"><Label htmlFor="company_name">Company Name *</Label><Input id="company_name" value={formData.company_name} onChange={e => handleInputChange("company_name", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="company_email">Company Email</Label><Input id="company_email" type="email" value={formData.company_email} onChange={e => handleInputChange("company_email", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="website">Website</Label><Input id="website" type="url" value={formData.website} onChange={e => handleInputChange("website", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="linkedIn">Company LinkedIn</Label><Input id="linkedIn" type="url" value={formData.linkedIn} onChange={e => handleInputChange("linkedIn", e.target.value)} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact Persons</h3>
            {contacts.map((contact, index) => (
              <div key={contact.id || index} className="space-y-4 rounded-lg border bg-muted/50 p-4 relative">
                {contacts.length > 1 && (<Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeContact(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>)}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-2"><Label htmlFor={`prefix_${index}`}>Prefix *</Label><Select value={contact.prefix} onValueChange={v => handleContactChange(index, "prefix", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{namePrefixes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor={`first_name_${index}`}>First Name *</Label><Input id={`first_name_${index}`} value={contact.first_name} onChange={e => handleContactChange(index, "first_name", e.target.value)} required /></div>
                    <div className="space-y-2"><Label htmlFor={`last_name_${index}`}>Last Name *</Label><Input id={`last_name_${index}`} value={contact.last_name} onChange={e => handleContactChange(index, "last_name", e.target.value)} required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-2"><Label htmlFor={`phone_${index}`}>Phone *</Label><PhoneInput country={"in"} value={contact.phone} onChange={v => handleContactPhoneChange(index, v)} inputProps={{ id: `phone_${index}`, required: true }} containerClass="w-full" inputClass="!w-full !flex !h-10 !rounded-md !border !border-input !bg-background !pl-10 !px-3 !py-2 !text-sm" /></div>
                  <div className="space-y-2"><Label htmlFor={`designation_${index}`}>Designation</Label><Input id={`designation_${index}`} value={contact.designation || ""} onChange={e => handleContactChange(index, "designation", e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor={`contact_email_${index}`}>Email</Label><Input id={`contact_email_${index}`} type="email" value={contact.email || ""} onChange={e => handleContactChange(index, "email", e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor={`contact_linkedin_${index}`}>LinkedIn Profile</Label><Input id={`contact_linkedin_${index}`} type="url" value={contact.linkedIn || ""} onChange={e => handleContactChange(index, "linkedIn", e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor={`contact_pan_${index}`}>PAN</Label><Input id={`contact_pan_${index}`} value={contact.pan || ""} onChange={e => handleContactChange(index, "pan", e.target.value)} /></div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addContact} className="flex items-center gap-2"><PlusCircle className="h-4 w-4" /> Add Another Contact</Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2"><Label htmlFor="address">Address Line 1</Label><Input id="address" value={formData.address} onChange={e => handleInputChange("address", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="address_2">Address Line 2</Label><Input id="address_2" value={formData.address_2} onChange={e => handleInputChange("address_2", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="country">Country</Label><Combobox options={countryOptions} value={formData.country} onChange={v => { handleInputChange("country", v); setSelectedCountry(v); handleInputChange("state", ""); handleInputChange("city", ""); }} placeholder="Select country..." /></div>
              <div className="space-y-2"><Label htmlFor="state">State</Label><Combobox options={stateOptions} value={formData.state} onChange={v => { handleInputChange("state", v); setSelectedState(v); handleInputChange("city", ""); }} placeholder="Select state..." disabled={!selectedCountry} /></div>
              <div className="space-y-2"><Label htmlFor="city">City</Label><Combobox options={cityOptions} value={formData.city} onChange={v => handleInputChange("city", v)} placeholder="Select city..." disabled={!selectedState} /></div>
              <div className="space-y-2"><Label htmlFor="pincode">Pincode</Label><Input id="pincode" value={formData.pincode} onChange={e => handleInputChange("pincode", e.target.value)} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Classification & System Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2"><Label htmlFor="company_phone_2">Company Phone 2</Label><PhoneInput country={"in"} value={formData.company_phone_2} onChange={v => handleInputChange("company_phone_2", v)} inputProps={{ id: 'company_phone_2' }} containerClass="w-full" inputClass="!w-full !flex !h-10 !rounded-md !border !border-input !bg-background !pl-10 !px-3 !py-2 !text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="team_size">Team Size</Label><Input id="team_size" value={formData.team_size} onChange={e => handleInputChange("team_size", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="turnover">Turnover</Label><Input id="turnover" value={formData.turnover} onChange={e => handleInputChange("turnover", e.target.value)} /></div>
              <div className="space-y-2">
                <Label htmlFor="segment">Segment</Label>
                <Select value={formData.segment} onValueChange={v => handleInputChange("segment", v)}>
                    <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                    <SelectContent>{masterOptions.segment.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verticles">Verticals</Label>
                <Select value={formData.verticles} onValueChange={v => handleInputChange("verticles", v)}>
                    <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                    <SelectContent>{masterOptions.verticles.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_system">Current System</Label>
                <Select value={formData.current_system} onValueChange={v => handleInputChange("current_system", v)}>
                    <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                    <SelectContent>{masterOptions.current_system.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="machine_specification">Machine Specification</Label><Textarea id="machine_specification" value={formData.machine_specification} onChange={e => handleInputChange("machine_specification", e.target.value)} rows={2} /></div>
              <div className="space-y-2"><Label htmlFor="challenges">Challenges Faced</Label><Textarea id="challenges" value={formData.challenges} onChange={e => handleInputChange("challenges", e.target.value)} rows={2} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Additional Client Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2"><Label htmlFor="database_type">Database Type</Label><Input id="database_type" value={formData.database_type} onChange={e => handleInputChange("database_type", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="amc">AMC</Label><Input id="amc" value={formData.amc} onChange={e => handleInputChange("amc", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="gst">GST No. *</Label><Input id="gst" value={formData.gst} onChange={e => handleInputChange("gst", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="converted_date">Date Converted</Label><Input id="converted_date" type="date" value={formData.converted_date} onChange={e => handleInputChange("converted_date", e.target.value)} /></div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Select value={formData.version} onValueChange={v => handleInputChange("version", v)}>
                    <SelectTrigger><SelectValue placeholder="Select version" /></SelectTrigger>
                    <SelectContent>{masterOptions.version.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Convert to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}