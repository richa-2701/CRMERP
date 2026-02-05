//frontend/components/reports/report-charts.tsx
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LabelList } from "recharts"
import { ApiReportData } from "@/lib/api"

interface ReportChartsProps {
  reportData: ApiReportData;
}

export function ReportCharts({ reportData }: ReportChartsProps) {
  const totalLeadsInPeriod = useMemo(() => {
    if (!reportData.visualizations.lead_outcome) return 0;
    return reportData.visualizations.lead_outcome.reduce((sum, item) => sum + item.value, 0);
  }, [reportData]);

  const totalTimeSpent = useMemo(() => {
    if (!reportData.visualizations.time_allocation) return 0;
    return reportData.visualizations.time_allocation.reduce((sum, item) => sum + item.value, 0);
  }, [reportData]);

  const leadOutcomeChartConfig = {
    "Deals Won": { label: "Deals Won", color: "hsl(142.1, 76.2%, 41.2%)" },
    "In Progress": { label: "In Progress", color: "hsl(221.2, 83.2%, 53.3%)" },
  };

  const timeAllocationChartConfig = {
    "Meetings": { label: "Meetings", color: "#60a5fa" },
    "Demos": { label: "Demos", color: "#4ade80" },
    "Tasks": { label: "Tasks", color: "#facc15" },
    "Logged Activities": { label: "Logged Activities", color: "#c084fc" },
  };

  return (
    <div id="charts-section" className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Activity Volume</CardTitle>
          <CardDescription>Comparison of key activities performed in the period.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.visualizations.activity_volume} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill="hsl(220, 85%, 55%)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Time Allocation (in minutes)</CardTitle>
          <CardDescription>Breakdown of total time spent on completed activities.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center pb-6">
          <ChartContainer config={timeAllocationChartConfig} className="mx-auto aspect-square h-[200px]">
            <PieChart>
              <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={reportData.visualizations.time_allocation.filter(d => d.value > 0)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={2}>
                {reportData.visualizations.time_allocation.map((entry) => (<Cell key={`cell-${entry.name}`} fill={timeAllocationChartConfig[entry.name as keyof typeof timeAllocationChartConfig]?.color || "#cccccc"} />))}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">{totalTimeSpent.toLocaleString()}</text>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="20" className="fill-muted-foreground text-sm">Total Minutes</text>
            </PieChart>
          </ChartContainer>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-sm font-medium pt-4">
            {reportData.visualizations.time_allocation.map((entry) => (
              entry.value > 0 && (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: timeAllocationChartConfig[entry.name as keyof typeof timeAllocationChartConfig].color }} />
                  {timeAllocationChartConfig[entry.name as keyof typeof timeAllocationChartConfig].label} ({entry.value})
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2 md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Lead Outcome</CardTitle>
          <CardDescription>Status of new leads assigned in this period.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center pb-6">
          <ChartContainer config={leadOutcomeChartConfig} className="mx-auto aspect-square h-[200px]">
            <PieChart>
              <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={reportData.visualizations.lead_outcome.filter(d => d.value > 0)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} strokeWidth={2}>
                {reportData.visualizations.lead_outcome.map((entry) => (<Cell key={`cell-${entry.name}`} fill={leadOutcomeChartConfig[entry.name as keyof typeof leadOutcomeChartConfig]?.color || "#cccccc"} />))}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">{totalLeadsInPeriod.toLocaleString()}</text>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" dy="20" className="fill-muted-foreground text-sm">New Leads</text>
            </PieChart>
          </ChartContainer>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-sm font-medium pt-4">
            {reportData.visualizations.lead_outcome.map((entry) => (
              entry.value > 0 && (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: leadOutcomeChartConfig[entry.name as keyof typeof leadOutcomeChartConfig].color }} />
                  {leadOutcomeChartConfig[entry.name as keyof typeof leadOutcomeChartConfig].label} ({entry.value})
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}