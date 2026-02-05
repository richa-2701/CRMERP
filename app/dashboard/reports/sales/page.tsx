//frontend/app/dashboard/reports/sales/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileSpreadsheet, Loader2, Calendar as CalendarIcon, ServerCrash, BarChart2 } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { api, reportApi, ApiUser, ApiReportData, SalesPerson } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx';

import { KpiCardGrid } from "@/components/reports/kpi-card-grid"
import { ReportCharts } from "@/components/reports/report-charts"
import { ReportDetailModal } from "@/components/reports/report-detail-modal"
import { ReportFilters } from "@/components/reports/report-filters"

export default function ReportsPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [reportData, setReportData] = useState<ApiReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; data: any[] | null, dataType: string }>({ title: '', data: null, dataType: '' });

  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() });

  const canGenerate = selectedUserId && dateRange?.from && dateRange?.to;

  const generateReport = useCallback(async () => {
    if (!canGenerate) return;

    // DEBUG LOGGING
    console.log("=== Frontend Report Debug ===");
    console.log("Selected User ID (string):", selectedUserId);
    console.log("Selected User ID (parsed int):", parseInt(selectedUserId));
    console.log("Date Range From:", dateRange?.from);
    console.log("Date Range To:", dateRange?.to);
    console.log("All Salespeople:", salesPersons);
    const selectedPerson = salesPersons.find(sp => {
      const empId = sp.employee_id || sp.employee_i_d;
      return empId?.toString() === selectedUserId;
    });
    console.log("Selected Salesperson Object:", selectedPerson);

    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      const data = await reportApi.getUserPerformanceReport(
        parseInt(selectedUserId),
        format(dateRange!.from!, "yyyy-MM-dd"),
        format(dateRange!.to!, "yyyy-MM-dd")
      );
      setReportData(data);
    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred while fetching report data.";
      setError(errorMessage);
      toast({ title: "Report Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, dateRange, toast, canGenerate, salesPersons]);

  useEffect(() => {
    if (canGenerate) {
      generateReport();
    }
  }, [selectedUserId, dateRange, generateReport, canGenerate]);

  useEffect(() => {
    async function fetchSalesPersons() {
      setInitialLoading(true);
      try {
        const salesPersonList = await api.getSalesPersons();
        // Sort salespeople alphabetically by name
        const sortedSalesPersons = [...salesPersonList].sort((a, b) =>
          a.employee_name.localeCompare(b.employee_name)
        );
        setSalesPersons(sortedSalesPersons);
        // For non-admin users, we need to find their salesperson ID
        // This might need adjustment based on how you map users to salespeople
        if (currentUser?.role !== 'admin' && currentUser?.id) {
          // If current user has a corresponding salesperson record, select it
          // For now, we'll let admin users select manually
          // setSelectedUserId(String(currentUser.id));
        }
      } catch (err) {
        toast({ title: "Error", description: "Could not fetch the list of salespeople.", variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    }
    if (!authLoading) {
      fetchSalesPersons();
    }
  }, [currentUser, authLoading, toast]);


  const handleKpiCardClick = (title: string, data: any[] | null, dataType: string) => {
    if (!data || data.length === 0) {
      toast({ title: "No Data", description: `There are no items to show for "${title}".` });
      return;
    }
    setModalContent({ title, data, dataType });
    setDetailModalOpen(true);
  };

  const handleExportToPDF = async () => {
    if (!reportData || !dateRange?.from || !dateRange?.to) {
      toast({ title: "Cannot Export", description: "Please generate a report before exporting.", variant: "destructive" });
      return;
    }
    setIsPdfExporting(true);
    toast({ title: "Generating PDF...", description: "This may take a moment." });

    try {
      const doc = new jsPDF();
      const selectedSalesPerson = salesPersons.find(sp => {
        const employeeId = sp.employee_id || sp.employee_i_d;
        return employeeId?.toString() === selectedUserId;
      });

      doc.text(`Performance Report for ${selectedSalesPerson?.employee_name || 'N/A'}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`, 14, 26);

      const kpiData = reportData.kpi_summary;
      autoTable(doc, {
        startY: 32,
        head: [['Metric', 'Value']],
        body: [
          ['New Leads Assigned', kpiData.new_leads_assigned],
          ['Meetings Completed', kpiData.meetings_completed],
          ['Demos Completed', kpiData.demos_completed],
          ['Activities Logged', kpiData.activities_logged],
          ['Tasks Completed', kpiData.tasks_completed],
          ['Deals Won', kpiData.deals_won],
          ['Conversion Rate', `${kpiData.conversion_rate}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
      });

      // --- FIXED: Chart Overlap Logic ---
      let currentY = (doc as any).lastAutoTable.finalY + 10;

      const chartsSection = document.getElementById('charts-section');
      if (chartsSection) {
        const canvas = await html2canvas(chartsSection, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Always add a new page for visualizations to ensure clean layout
        doc.addPage();
        currentY = 20;

        doc.text("Visualizations", 14, currentY);
        doc.addImage(imgData, 'PNG', 14, currentY + 5, pdfWidth - 28, pdfHeight);
        currentY += pdfHeight + 15; // Move Y past the image
      }

      if (reportData.tables.deals_won.length > 0) {
        // Check if next table header fits on current page
        if (currentY + 30 > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          currentY = 20;
        }

        autoTable(doc, {
          startY: currentY,
          head: [['Client Name', 'Source', 'Converted Date', 'Time to Close (Days)']],
          body: reportData.tables.deals_won.map(d => [d.company_name, d.source, format(new Date(d.converted_date), "PP"), d.time_to_close]),
          theme: 'grid',
        });
      }

      doc.save(`Report_${selectedSalesPerson?.employee_name}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Success!", description: "Your PDF report has been downloaded." });
    } catch (e) {
      console.error("PDF Export Error:", e);
      toast({ title: "Export Failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleExportSummary = async () => {
    if (!exportDateRange?.from || !exportDateRange?.to) {
      toast({ title: "Date Range Required", description: "Please select a valid date range for the summary export.", variant: "destructive" });
      return;
    }
    setIsExcelExporting(true);
    toast({ title: "Generating Summary...", description: "Fetching data for all users." });
    try {
      const summaryData = await reportApi.exportSummaryReport(format(exportDateRange.from, "yyyy-MM-dd"), format(exportDateRange.to, "yyyy-MM-dd"));
      const worksheet = XLSX.utils.json_to_sheet(summaryData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "User Performance Summary");
      XLSX.writeFile(workbook, `Performance_Summary_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Success!", description: "The summary report has been downloaded." });
    } catch (e) {
      toast({ title: "Export Failed", description: "An error occurred while generating the summary file.", variant: "destructive" });
    } finally {
      setIsExcelExporting(false);
      setIsExportModalOpen(false);
    }
  };

  if (initialLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
      <div className="space-y-3 md:space-y-6 pb-6 px-3 sm:px-4 md:px-0">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-2 md:gap-4">
              {/* Desktop: Show heading */}
              <div className="hidden md:block">
                {/* <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">User Performance Report</CardTitle> */}
                <CardDescription className="text-sm md:text-base">Analyze user performance for a selected time period.</CardDescription>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-2 md:ml-auto">
                {/* Mobile: Show "Reports" text */}
                <CardTitle className="md:hidden text-sm sm:text-base">User Performance Report</CardTitle>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Mobile: Icon-only buttons */}
                  <Button
                    onClick={handleExportToPDF}
                    disabled={!reportData || isPdfExporting || loading}
                    variant="outline"
                    size="icon"
                    className="md:w-auto md:px-4 h-8 w-8 sm:h-9 sm:w-9"
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden md:inline md:ml-2">PDF</span>
                  </Button>
                  {/* Excel Summary Removed per User Request */}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-3 md:px-6">
            <ReportFilters
              salesPersons={salesPersons}
              selectedUserId={selectedUserId}
              onUserChange={setSelectedUserId}
              dateRange={dateRange}
              onDateChange={setDateRange}
              isUserSelectionDisabled={!currentUser || currentUser.role !== 'admin'}
            />
          </CardContent>
        </Card>

        {loading && <div className="text-center p-8 md:p-16 flex flex-col items-center justify-center"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 md:mb-4" /><p className="text-xs sm:text-sm text-muted-foreground">Generating Report...</p></div>}

        {error &&
          <Card className="text-center p-8 md:p-16 bg-destructive/10 border-destructive">
            <ServerCrash className="h-8 w-8 sm:h-12 sm:w-12 text-destructive mx-auto mb-2 md:mb-4" />
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-destructive">Failed to Generate Report</h3>
            <p className="text-xs sm:text-sm text-destructive/80 mt-1">{error}</p>
          </Card>
        }

        {!canGenerate && !loading && !error && (
          <Card className="text-center p-8 md:p-16 border-dashed">
            <BarChart2 className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2 md:mb-4" />
            <h3 className="text-sm sm:text-base md:text-lg font-semibold">Ready to generate a report</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Select a user and date range to begin.</p>
          </Card>
        )}

        {reportData && !loading && (
          <div className="space-y-3 md:space-y-6">
            <KpiCardGrid reportData={reportData} onCardClick={handleKpiCardClick} />
            <ReportCharts reportData={reportData} />
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-sm sm:text-base md:text-lg">Deals Won Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">A list of all leads converted to clients in this period.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader><TableRow><TableHead>Client Name</TableHead><TableHead>Source</TableHead><TableHead>Converted Date</TableHead><TableHead className="text-right">Time to Close (Days)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {reportData.tables.deals_won.length > 0 ? (
                        reportData.tables.deals_won.map((deal) => (
                          <TableRow key={deal.client_id}>
                            <TableCell className="font-medium">{deal.company_name}</TableCell>
                            <TableCell>{deal.source}</TableCell>
                            <TableCell>{format(new Date(deal.converted_date), "LLL dd, y")}</TableCell>
                            <TableCell className="text-right">{deal.time_to_close}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No deals were won in this period.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2 px-3 pb-3">
                  {reportData.tables.deals_won.length > 0 ? (
                    reportData.tables.deals_won.map((deal) => (
                      <div key={deal.client_id} className="border rounded-lg p-2.5 space-y-1.5 bg-card">
                        <div className="font-medium text-sm truncate">{deal.company_name}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Source:</span>
                            <p className="font-medium truncate mt-0.5">{deal.source}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time to Close:</span>
                            <p className="font-medium truncate mt-0.5">{deal.time_to_close} days</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Converted:</span>
                            <p className="font-medium truncate mt-0.5">{format(new Date(deal.converted_date), "LLL dd, y")}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">No deals were won in this period.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={modalContent.title}
        data={modalContent.data}
        dataType={modalContent.dataType}
      />

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Summary Report</DialogTitle>
            <DialogDescription>Select a date range for the user performance summary export.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportDateRange?.from ? (exportDateRange.to ? `${format(exportDateRange.from, "LLL dd, y")} - ${format(exportDateRange.to, "LLL dd, y")}` : format(exportDateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={exportDateRange} onSelect={setExportDateRange} initialFocus numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExportSummary} disabled={isExcelExporting || !exportDateRange?.from}>
              {isExcelExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export to Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}