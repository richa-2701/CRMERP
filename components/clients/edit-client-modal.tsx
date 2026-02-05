// frontend/components/clients/edit-client-modal.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
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
import { api, type ApiClient, type ClientContact, type ApiClientUpdatePayload, type ApiMasterData } from "@/lib/api"
import { Loader2, PlusCircle, Trash2 } from "lucide-react"

import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { Country, State, City } from "country-state-city"
import { Combobox } from "@/components/ui/combobox"
import { format } from "date-fns"

interface ClientContactForEdit {
  id?: number // Optional for new contacts, present for existing ones
  prefix: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  designation: string | null
  linkedIn: string | null
  pan: string | null
}

interface EditClientModalProps {
  client: ApiClient | null
  isOpen: boolean
  onClose: () => void
  onSave: (clientId: string, updatedData: ApiClient) => void // Callback with updated Client
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

// Updated MasterDataOptions: removed database_type, amc, gst as they will be text fields
interface MasterDataOptions {
    segment: string[];
    verticles: string[];
    current_system: string[];
    version: string[]; // version remains a dropdown
}

export function EditClientModal({ client, isOpen, onClose, onSave }: EditClientModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    company_name: "", website: "", linkedIn: "", company_email: "", company_phone_2: "",
    address: "", address_2: "", country: "", state: "", city: "", pincode: "",
    segment: "", verticles: "", team_size: "", turnover: "", current_system: "",
    machine_specification: "", challenges: "", remark: "",
    version: "", database_type: "", amc: "", gst: "", // database_type, amc, gst are now text fields in formData
    converted_date: format(new Date(), "yyyy-MM-dd"),
  })
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>()
  const [selectedState, setSelectedState] = useState<string | undefined>()
  const [contacts, setContacts] = useState<ClientContactForEdit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Updated initial state for masterOptions
  const [masterOptions, setMasterOptions] = useState<MasterDataOptions>({
      segment: [], verticles: [], current_system: [], version: [],
  });

  const countryOptions = useMemo(() => Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name })), [])
  const stateOptions = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry).map(s => ({ value: s.isoCode, label: s.name })) : [], [selectedCountry])
  const cityOptions = useMemo(() => (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry, selectedState).map(c => ({ value: c.name, label: c.name })) : [], [selectedCountry, selectedState])

  // Fetch master data on modal open
  useEffect(() => {
    if (isOpen) {
        const fetchMasterData = async () => {
            try {
                // Corrected API calls: directly call getByCategory on the api object
                const [segmentData, verticlesData, currentSystemData, versionData] = await Promise.all([
                    api.getByCategory("segment"),
                    api.getByCategory("verticles"),
                    api.getByCategory("current_system"),
                    api.getByCategory("version"), // Fetching version for dropdown
                ]);
                setMasterOptions({
                    segment: segmentData.map(item => item.value),
                    verticles: verticlesData.map(item => item.value),
                    current_system: currentSystemData.map(item => item.value),
                    version: versionData.map(item => item.value),
                });
            } catch (err) {
                console.error("Failed to fetch master data:", err);
                toast({ title: "Error", description: "Could not load dropdown options for client.", variant: "destructive" });
            }
        };
        fetchMasterData();
    }
  }, [isOpen, toast]);

  // Populate form data when client prop changes or modal opens
  useEffect(() => {
    if (client && isOpen) {
      const countryObj = countryOptions.find(c => c.label === client.country);
      let foundStateCode: string | undefined;

      if (countryObj && client.state) {
        const statesOfSelectedCountry = State.getStatesOfCountry(countryObj.value);
        const stateObj = statesOfSelectedCountry.find(s => s.name === client.state);
        foundStateCode = stateObj?.isoCode;
      }

      setSelectedCountry(countryObj?.value);
      setSelectedState(foundStateCode);

      setFormData({
        company_name: client.company_name || "",
        website: client.website || "",
        linkedIn: client.linkedIn || "",
        company_email: client.company_email || "",
        company_phone_2: client.company_phone_2 || "",
        address: client.address || "",
        address_2: client.address_2 || "",
        country: countryObj?.value || "",
        state: foundStateCode || "", // Use the corrected foundStateCode
        city: client.city || "",
        pincode: client.pincode || "",
        segment: client.segment || "",
        verticles: client.verticles || "",
        team_size: String(client.team_size || "") || "", // Ensure string conversion and null handling
        turnover: client.turnover || "",
        current_system: client.current_system || "",
        machine_specification: client.machine_specification || "",
        challenges: client.challenges || "",
        remark: client.remark || "",
        version: client.version || "",
        database_type: client.database_type || "", // Populate from client data, now for text field
        amc: client.amc || "", // Populate from client data, now for text field
        gst: client.gst || "", // Populate from client data, now for text field
        converted_date: client.converted_date ? format(new Date(client.converted_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      });

      if (client.contacts && client.contacts.length > 0) {
        setContacts(client.contacts.map(c => ({
          ...c,
          ...splitFullName(c.contact_name || ""), // Ensure contact_name is not null for splitFullName
          linkedIn: c.linkedIn || "",
          pan: c.pan || "",
        })));
      } else {
        setContacts([{ prefix: "Mr.", first_name: "", last_name: "", phone: "", email: "", designation: "", linkedIn: "", pan: "" }]);
      }
    }
  }, [client, isOpen, countryOptions]);

  const handleInputChange = (field: keyof typeof formData, value: string) => setFormData(prev => ({ ...prev, [field]: value }))
  const handleContactChange = (index: number, field: keyof ClientContactForEdit, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  }
  const handleContactPhoneChange = (index: number, value: string) => { const newContacts = [...contacts]; newContacts[index].phone = value; setContacts(newContacts); }
  const addContact = () => setContacts([...contacts, { prefix: "Mr.", first_name: "", last_name: "", phone: "", email: "", designation: "", linkedIn: "", pan: "" }])
  const removeContact = (index: number) => { if (contacts.length > 1) setContacts(contacts.filter((_, i) => i !== index)) }

  const handleSave = async () => {
    if (!client) return
    setIsLoading(true)

    // Prepare contacts for client update payload
    const clientContacts: ClientContact[] = contacts.map(c => ({
      id: c.id, // Include ID for existing contacts for potential backend matching
      contact_name: `${c.prefix} ${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      email: c.email,
      designation: c.designation,
      linkedIn: c.linkedIn,
      pan: c.pan,
    }))

    const countryName = Country.getCountryByCode(formData.country)?.name
    // For state, we store ISO code in formData.state, but the backend model expects the full name if it's not a dropdown
    // Assuming backend will handle the ISO code, or we would convert it here if needed.
    const stateName = State.getStateByCodeAndCountry(formData.state, formData.country)?.name || formData.state;


    const payload: ApiClientUpdatePayload = {
      ...formData,
      country: countryName || formData.country,
      state: stateName, // Use the state name if found, or the ISO code if not converted
      contacts: clientContacts,
      converted_date: formData.converted_date,
    }

    try {
      const updatedClient = await api.updateClient(Number(client.id), payload) // Corrected: Directly call updateClient on api object
      toast({ title: "Client Updated", description: `${client.company_name} has been updated.` })
      onSave(client.id, updatedClient) // Pass back the full updated client object
      onClose()
    } catch (error) {
      console.error("Failed to update client:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Update failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Client - {client.company_name}</DialogTitle><DialogDescription>Update client details and save your changes.</DialogDescription></DialogHeader>

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
                  <div className="space-y-2"><Label htmlFor={`phone_${index}`}>Phone *</Label><PhoneInput country={"in"} value={contact.phone} onChange={v => handleContactPhoneChange(index, v)} inputProps={{ id: `phone_${index}`, required: true }} containerClass="w-full" inputClass="!w-full !flex !h-10 !rounded-md !border !border-input !bg-background !px-3 !py-2 !text-sm" /></div>
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
              <div className="space-y-2"><Label htmlFor="company_phone_2">Company Phone 2</Label><PhoneInput country={"in"} value={formData.company_phone_2} onChange={v => handleInputChange("company_phone_2", v)} inputProps={{ id: 'company_phone_2' }} containerClass="w-full" inputClass="!w-full !flex !h-10 !rounded-md !border !border-input !bg-background !px-3 !py-2 !text-sm" /></div>
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
              <div className="md:col-span-2 space-y-2"><Label htmlFor="remark">Remarks</Label><Textarea id="remark" value={formData.remark} onChange={e => handleInputChange("remark", e.target.value)} rows={3} /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Additional Client Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Select value={formData.version} onValueChange={v => handleInputChange("version", v)}>
                    <SelectTrigger><SelectValue placeholder="Select version" /></SelectTrigger>
                    <SelectContent>{masterOptions.version.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {/* Changed from Select to Input */}
              <div className="space-y-2"><Label htmlFor="database_type">Database Type</Label><Input id="database_type" value={formData.database_type} onChange={e => handleInputChange("database_type", e.target.value)} /></div>
              {/* Changed from Select to Input */}
              <div className="space-y-2"><Label htmlFor="amc">AMC</Label><Input id="amc" value={formData.amc} onChange={e => handleInputChange("amc", e.target.value)} /></div>
              {/* Changed from Select to Input */}
              <div className="space-y-2"><Label htmlFor="gst">GST</Label><Input id="gst" value={formData.gst} onChange={e => handleInputChange("gst", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="converted_date">Date Converted</Label><Input id="converted_date" type="date" value={formData.converted_date} onChange={e => handleInputChange("converted_date", e.target.value)} /></div>
            </div>
          </div>

        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}