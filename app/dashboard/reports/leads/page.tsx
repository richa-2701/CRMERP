//frontend/app/dashboard/reports/leads/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar as CalendarIcon, Loader2, TrendingUp, TrendingDown, Users, UserX, AlertCircle } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { reportApi } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

interface LeadReportSummary {
  TotalLeads: number
  ConvertedLeads: number
  LostLeads: number
  NotConvertedLeads: number
  ConversionRate: number
}

interface StatusDistribution {
  Status: string
  Count: number
}

interface LostLead {
  id: number
  company_name: string
  assigned_to: string
  reason: string
  lost_date: string
  contact_phone: string
  contact_email: string
}

interface NotConvertedLead {
  id: number
  company_name: string
  assigned_to: string
  status: string
  created_date: string
  days_old: number
  contact_phone: string
  contact_email: string
}

interface LostReasonSummary {
  Reason: string
  Count: number
}

export default function LeadReportPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<LeadReportSummary | null>(null)
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([])
  const [lostLeads, setLostLeads] = useState<LostLead[]>([])
  const [notConvertedLeads, setNotConvertedLeads] = useState<NotConvertedLead[]>([])
  const [lostReasonsSummary, setLostReasonsSummary] = useState<LostReasonSummary[]>([])

  const generateReport = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd")
      const endDate = format(dateRange.to, "yyyy-MM-dd")

      const response = await reportApi.getLeadReport(startDate, endDate)

      // Parse the response which is a serialized DataSet
      const dataSet = typeof response === 'string' ? JSON.parse(response) : response

      // Extract tables from DataSet
      const summaryData = dataSet.Summary?.[0] || dataSet.Table?.[0]
      const statusDist = dataSet.StatusDistribution || dataSet.Table1 || []
      const lostLeadsData = dataSet.LostLeads || dataSet.Table2 || []
      const notConvertedData = dataSet.NotConvertedLeads || dataSet.Table3 || []
      const lostReasonsData = dataSet.LostReasonsSummary || dataSet.Table4 || []

      setSummary(summaryData)
      setStatusDistribution(statusDist)
      setLostLeads(lostLeadsData)
      setNotConvertedLeads(notConvertedData)
      setLostReasonsSummary(lostReasonsData)

      toast({
        title: "Report Generated",
        description: `Lead report generated for ${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
      })
    } catch (error: any) {
      toast({
        title: "Error Generating Report",
        description: error.message || "Failed to generate lead report",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange, toast])

  useEffect(() => {
    if (currentUser && dateRange?.from && dateRange?.to) {
      generateReport()
    }
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* <h1 className="text-3xl font-bold tracking-tight">Lead Report</h1> */}
          {/* <p className="text-muted-foreground mt-1">
            Analyze lead performance, conversions, and lost opportunities
          </p> */}
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={generateReport} disabled={loading || !dateRange?.from || !dateRange?.to}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.TotalLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.ConvertedLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">Won deals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lost Leads</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.LostLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">Marked as lost</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Not Converted (30+ days)</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summary.NotConvertedLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">Still pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.ConversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Success rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart: Lead Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
                <CardDescription>Breakdown of leads by status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.Status}: ${entry.Count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="Count"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart: Lost Reasons */}
            <Card>
              <CardHeader>
                <CardTitle>Top Lost Reasons</CardTitle>
                <CardDescription>Why leads were marked as lost</CardDescription>
              </CardHeader>
              <CardContent>
                {lostReasonsSummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={lostReasonsSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="Reason" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="Count" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No lost leads</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lost Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lost Leads ({lostLeads.length})</CardTitle>
              <CardDescription>Leads that were marked as lost with reasons</CardDescription>
            </CardHeader>
            <CardContent>
              {lostLeads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Lost Date</TableHead>
                        <TableHead>Contact Phone</TableHead>
                        <TableHead>Contact Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lostLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.assigned_to || "N/A"}</TableCell>
                          <TableCell>{lead.reason}</TableCell>
                          <TableCell>{lead.lost_date}</TableCell>
                          <TableCell>{lead.contact_phone || "N/A"}</TableCell>
                          <TableCell>{lead.contact_email || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No lost leads in this period</p>
              )}
            </CardContent>
          </Card>

          {/* Not Converted Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Not Converted Leads (30+ Days Old) ({notConvertedLeads.length})</CardTitle>
              <CardDescription>Leads created over a month ago that haven't converted</CardDescription>
            </CardHeader>
            <CardContent>
              {notConvertedLeads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Days Old</TableHead>
                        <TableHead>Contact Phone</TableHead>
                        <TableHead>Contact Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notConvertedLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.assigned_to || "N/A"}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              lead.status === "New" && "bg-blue-100 text-blue-800",
                              lead.status === "In Progress" && "bg-yellow-100 text-yellow-800",
                              lead.status === "Not Interested" && "bg-gray-100 text-gray-800"
                            )}>
                              {lead.status}
                            </span>
                          </TableCell>
                          <TableCell>{lead.created_date}</TableCell>
                          <TableCell>
                            <span className="font-medium text-orange-600">{lead.days_old} days</span>
                          </TableCell>
                          <TableCell>{lead.contact_phone || "N/A"}</TableCell>
                          <TableCell>{lead.contact_email || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No old unconverted leads</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!summary && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No data yet</p>
            <p className="text-sm text-muted-foreground mt-2">Select a date range and click "Generate Report"</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
