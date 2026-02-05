//frontend/app/dashboard/reports/invoice-sales/page.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Download, Loader2, Calendar as CalendarIcon, FileSpreadsheet, ServerCrash, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { reportApi } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

interface InvoiceSalesData {
  [key: string]: any
}

export default function InvoiceSalesReportPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  })

  const [reportData, setReportData] = useState<InvoiceSalesData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applicationName, setApplicationName] = useState<string>("multiunit")
  const [activeTab, setActiveTab] = useState<string>("consolidated")
  const [isExporting, setIsExporting] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})

  // Load application name from localStorage
  useEffect(() => {
    const storedAppName = localStorage.getItem("applicationName")
    if (storedAppName) {
      setApplicationName(storedAppName.toLowerCase())
    }
  }, [])

  const canGenerate = dateRange?.from && dateRange?.to

  const generateReport = async (reportType: string = "Item Wise Sales Report") => {
    if (!canGenerate) {
      toast({ title: "Date Range Required", description: "Please select start and end dates.", variant: "destructive" })
      return
    }

    setLoading(true)
    setError(null)
    setReportData([])
    setCurrentPage(1) // Reset to first page

    try {
      const response = await reportApi.getInvoiceSalesReport(
        format(dateRange!.from!, "yyyy-MM-dd"),
        format(dateRange!.to!, "yyyy-MM-dd"),
        reportType,
        applicationName
      )

      if (response.success && response.data) {
        setReportData(response.data)
      } else {
        setError("No data found for the selected period.")
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred while fetching report data."
      setError(errorMessage)
      toast({ title: "Report Generation Failed", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canGenerate) {
      const reportType = applicationName === "estimoprime"
        ? (activeTab === "consolidated" ? "Consolidated Sales Report" : "Item Wise Sales Report")
        : "Item Wise Sales Report"
      generateReport(reportType)
    }
  }, [dateRange, activeTab])

  const handleExportToExcel = async () => {
    if (!reportData || reportData.length === 0) {
      toast({ title: "No Data", description: "No data available to export.", variant: "destructive" })
      return
    }

    setIsExporting(true)
    try {
      const worksheet = XLSX.utils.json_to_sheet(reportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Sales Report")

      const fileName = `Invoice_Sales_Report_${format(dateRange!.from!, "yyyy-MM-dd")}_to_${format(dateRange!.to!, "yyyy-MM-dd")}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast({ title: "Export Successful", description: "Report exported to Excel successfully." })
    } catch (err) {
      toast({ title: "Export Failed", description: "Failed to export report to Excel.", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const renderConsolidatedColumns = () => {
    // Fewer columns for Consolidated Sales Report as per image
    return [
      { key: "VoucherNo", label: "Invoice No", width: 120 },
      { key: "VoucherDate", label: "Invoice Date", width: 120 },
      { key: "LedgerName", label: "Ledger Name", width: 200 },
      { key: "GSTNo", label: "GST No", width: 150 },
      { key: "City", label: "Bill To Place", width: 120 },
      { key: "State", label: "State", width: 120 },
      { key: "PANNo", label: "PAN No", width: 120 },
      { key: "InvoiceType", label: "Invoice Type", width: 120 },
      { key: "VoucherType", label: "Voucher Type", width: 120 },
      { key: "RefCode", label: "Source", width: 100 },
      { key: "ConsigneeName", label: "Consignee Name", width: 180 },
      { key: "TotalBoxes", label: "Total Boxes", width: 100 },
      { key: "Quantity", label: "Invoice Quant...", width: 120 },
      { key: "NetAmount", label: "Round Off", width: 100 },
    ]
  }

  const renderItemWiseColumns = () => {
    // Columns for Item Wise Sales Report (more columns)
    return [
      { key: "VoucherNo", label: "Invoice No", width: 120 },
      { key: "VoucherDate", label: "Invoice Date", width: 120 },
      { key: "LedgerName", label: "Ledger Name", width: 200 },
      { key: "ConsigneeName", label: "Consignee Name", width: 180 },
      { key: "GSTNo", label: "GST No", width: 150 },
      { key: "City", label: "City", width: 120 },
      { key: "State", label: "State", width: 120 },
      { key: "PANNo", label: "PAN No", width: 120 },
      { key: "JobName", label: "Job Name", width: 150 },
      { key: "ProductCode", label: "Product Code", width: 120 },
      { key: "HSNCode", label: "HSN Code", width: 100 },
      { key: "Quantity", label: "Quantity", width: 100 },
      { key: "Rate", label: "Rate", width: 100 },
      { key: "BasicAmount", label: "Basic Amount", width: 120 },
      { key: "TaxableAmount", label: "Taxable Amount", width: 120 },
      { key: "CGSTPercentage", label: "CGST %", width: 80 },
      { key: "CGSTAmount", label: "CGST Amount", width: 120 },
      { key: "SGSTPercentage", label: "SGST %", width: 80 },
      { key: "SGSTAmount", label: "SGST Amount", width: 120 },
      { key: "IGSTPercentage", label: "IGST %", width: 80 },
      { key: "IGSTAmount", label: "IGST Amount", width: 120 },
      { key: "NetAmount", label: "Net Amount", width: 120 },
      { key: "SalesPersonName", label: "Sales Person", width: 150 },
      { key: "SalesOrderNo", label: "SO No", width: 120 },
      { key: "PONo", label: "PO No", width: 120 },
      { key: "Transporter", label: "Transporter", width: 150 },
      { key: "VehicleNo", label: "Vehicle No", width: 120 },
      { key: "EWayBillNumber", label: "E-Way Bill", width: 120 },
    ]
  }

  const renderMultiunitColumns = () => {
    // Columns for Multiunit (similar to item-wise but with production unit)
    return [
      { key: "ProductionUnitName", label: "Production Unit", width: 150 },
      { key: "VoucherNo", label: "Invoice No", width: 120 },
      { key: "VoucherDate", label: "Invoice Date", width: 120 },
      { key: "LedgerName", label: "Ledger Name", width: 200 },
      { key: "ConsigneeName", label: "Consignee Name", width: 180 },
      { key: "GSTNo", label: "GST No", width: 150 },
      { key: "City", label: "City", width: 120 },
      { key: "State", label: "State", width: 120 },
      { key: "JobName", label: "Job Name", width: 150 },
      { key: "ProductCode", label: "Product Code", width: 120 },
      { key: "HSNCode", label: "HSN Code", width: 100 },
      { key: "Quantity", label: "Quantity", width: 100 },
      { key: "Rate", label: "Rate", width: 100 },
      { key: "BasicAmount", label: "Basic Amount", width: 120 },
      { key: "TaxableAmount", label: "Taxable Amount", width: 120 },
      { key: "CGSTAmount", label: "CGST Amount", width: 120 },
      { key: "SGSTAmount", label: "SGST Amount", width: 120 },
      { key: "IGSTAmount", label: "IGST Amount", width: 120 },
      { key: "NetAmount", label: "Net Amount", width: 120 },
      { key: "SalesPersonName", label: "Sales Person", width: 150 },
    ]
  }

  // Search and filter logic
  const filteredData = reportData.filter((row) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    return Object.values(row).some((value) =>
      value?.toString().toLowerCase().includes(searchLower)
    )
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)


  const renderTable = (columns: { key: string; label: string; width: number }[]) => {
    return (
      <div className="space-y-4">
        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHeader>
            <TableRow>
              {columns.map((col, colIndex) => (
                <TableHead
                  key={col.key}
                  className="font-semibold border-r last:border-r-0 relative px-1 py-1"
                  style={{
                    minWidth: columnWidths[col.key] || col.width,
                    width: columnWidths[col.key] || col.width,
                    maxWidth: columnWidths[col.key] || col.width,
                    position: 'relative',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div className="flex items-center pr-1" style={{ overflow: 'hidden' }}>
                    <span className="truncate" title={col.label}>{col.label}</span>
                    {colIndex < columns.length - 1 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary hover:w-1.5 transition-all z-10"
                        style={{ marginRight: '-1px' }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const startX = e.clientX
                          const startWidth = columnWidths[col.key] || col.width

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const diff = moveEvent.clientX - startX
                            const newWidth = Math.max(80, startWidth + diff)
                            setColumnWidths(prev => ({
                              ...prev,
                              [col.key]: newWidth
                            }))
                          }

                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }

                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className="border-r last:border-r-0 text-sm px-1 py-1"
                      style={{
                        minWidth: columnWidths[col.key] || col.width,
                        width: columnWidths[col.key] || col.width,
                        maxWidth: columnWidths[col.key] || col.width,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={row[col.key]?.toString() || "-"}
                    >
                      {row[col.key] ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {loading ? "Loading..." : "No data available for the selected period."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {reportData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredData.length} records)
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
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
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
      </div>
    )
  }

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-1 pb-6 px-3 sm:px-4 md:px-0">
      <Card className="border-none shadow-none">
        <CardHeader className="pb-1">
          <div className="flex flex-col gap-3">
            {/* Title and Record Count */}
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">
                  Invoice Sales Report - {applicationName === "estimoprime" ? "Estimoprime" : "Multiunit"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Records: {reportData.length} {searchQuery && `(Filtered: ${filteredData.length})`}
                </p>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              {/* Left side - Search */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all columns..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* Right side - Tabs and Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Tabs for Estimoprime */}
                {applicationName === "estimoprime" && (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-8">
                      <TabsTrigger value="consolidated" className="text-xs px-2 h-7">Consolidated</TabsTrigger>
                      <TabsTrigger value="itemwise" className="text-xs px-2 h-7">Item Wise</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  onClick={() => {
                    const reportType = applicationName === "estimoprime"
                      ? (activeTab === "consolidated" ? "Consolidated Sales Report" : "Item Wise Sales Report")
                      : "Item Wise Sales Report"
                    generateReport(reportType)
                  }}
                  disabled={!canGenerate || loading}
                  className="h-8 text-xs px-3"
                >
                  {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Generate
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={!reportData || reportData.length === 0 || isExporting}
                  variant="outline"
                  className="h-8 text-xs px-3"
                >
                  {isExporting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Export
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <div className="text-center p-8 md:p-16 flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 md:mb-4" />
          <p className="text-xs sm:text-sm text-muted-foreground">Loading report data...</p>
        </div>
      )}

      {error && (
        <Card className="text-center p-8 md:p-16 bg-destructive/10 border-destructive">
          <ServerCrash className="h-8 w-8 sm:h-12 sm:w-12 text-destructive mx-auto mb-2 md:mb-4" />
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-destructive">Failed to Generate Report</h3>
          <p className="text-xs sm:text-sm text-destructive/80 mt-1">{error}</p>
        </Card>
      )}

      {!loading && !error && reportData.length > 0 && (
        <Card>
          <CardContent className="p-1">
            {applicationName === "estimoprime" ? (
              <>
                {activeTab === "consolidated" && renderTable(renderConsolidatedColumns())}
                {activeTab === "itemwise" && renderTable(renderItemWiseColumns())}
              </>
            ) : (
              renderTable(renderMultiunitColumns())
            )}
          </CardContent>
        </Card>
      )}

      {!loading && !error && reportData.length === 0 && canGenerate && (
        <Card className="text-center p-8 md:p-16 border-dashed">
          <FileSpreadsheet className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2 md:mb-4" />
          <h3 className="text-sm sm:text-base md:text-lg font-semibold">No Data Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            No invoice sales data available for the selected period.
          </p>
        </Card>
      )}
    </div>
  )
}
