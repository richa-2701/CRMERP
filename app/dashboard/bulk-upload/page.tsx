// frontend/app/dashboard/bulk-upload/page.tsx
"use client"

import { useState } from "react"
import * as XLSX from "xlsx" // Import the xlsx library
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api, type ApiBulkUploadResponse } from "@/lib/api"
import { Loader2, UploadCloud, Download, FileCheck2, FileX2, Info } from "lucide-react"

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ApiBulkUploadResponse | null>(null)
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0]
      setFile(selectedFile)
      setUploadResult(null) // Reset result when a new file is chosen
      validateExcelHeaders(selectedFile) // Perform client-side header validation
    }
  }

  const validateExcelHeaders = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const headers: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []

        const requiredColumns = ["company_name", "contact_name", "phone", "assigned_to", "source"]
        const missingColumns = requiredColumns.filter(col => !headers.includes(col))

        if (missingColumns.length > 0) {
          toast({
            title: "Template Warning",
            description: `Your file might be missing required columns: ${missingColumns.join(", ")}. The upload may fail.`,
            variant: "default", // Using default as a neutral warning
            duration: 8000,
          })
        }
      } catch (error) {
        console.error("Failed to read or validate Excel file:", error)
        toast({
          title: "File Read Error",
          description: "Could not read the selected file. Please ensure it is a valid, uncorrupted Excel file.",
          variant: "destructive",
        })
      }
    }
    reader.onerror = () => {
        toast({
            title: "File Read Error",
            description: "An error occurred while trying to read the file.",
            variant: "destructive",
        });
    };
    reader.readAsArrayBuffer(file)
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please choose an Excel file to upload.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setUploadResult(null)
    try {
      const result = await api.uploadBulkLeads(file)
      setUploadResult(result)
      toast({
        title: "Upload Processed",
        description: `Successfully imported ${result.successful_imports} leads.`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
      setUploadResult({
        status: "Failed",
        successful_imports: 0,
        errors: [errorMessage],
      })
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Leads</h1>
        <p className="text-muted-foreground">Import multiple leads at once using an Excel file.</p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Step 1: Download and Prepare Your File</CardTitle>
          <CardDescription>
            Download the template and fill it with your lead data. The columns `company_name`, `contact_name`, `phone`, `assigned_to`, and `source` are required. All other columns like GST, Version, AMC, etc., are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/lead_template.xlsx" download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Step 2: Upload Your File</CardTitle>
          <CardDescription>Select the completed Excel file from your computer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-input">Excel File (.xlsx, .xls)</Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
          </div>
          <Button onClick={handleUpload} disabled={isLoading || !file}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Upload and Process File
          </Button>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult.successful_imports > 0 && (
              <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <FileCheck2 className="h-4 w-4 !text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-400">Success</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-500">
                  Successfully imported <strong>{uploadResult.successful_imports}</strong> leads.
                </AlertDescription>
              </Alert>
            )}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <FileX2 className="h-4 w-4" />
                <AlertTitle>Errors Encountered ({uploadResult.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}