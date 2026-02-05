//frontend/components/reports/kpi-card-grid.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Video, ClipboardList, Activity, Star, ThumbsUp, ThumbsDown, Target, Timer } from "lucide-react"
import { ApiReportData } from "@/lib/api"

interface KpiCardGridProps {
  reportData: ApiReportData;
  onCardClick: (title: string, data: any[] | null, dataType: string) => void;
}

const formatDuration = (totalMinutes: number, count: number) => {
  if (count === 0 || !totalMinutes || totalMinutes < 0) return '0 min';
  const avg = totalMinutes / count;
  return `${Math.round(avg)} min`;
};

export function KpiCardGrid({ reportData, onCardClick }: KpiCardGridProps) {
  const kpis = reportData.kpi_summary;

  const cards = [
    { title: "New Leads Assigned", value: kpis.new_leads_assigned, icon: Users, data: reportData.details.new_leads_assigned, dataType: 'NewLead' },
    {
      title: "Meetings Completed", value: kpis.meetings_completed, icon: Users, data: reportData.details.meetings_completed, dataType: 'Meeting',
      subValue: formatDuration(kpis.total_meeting_duration, kpis.meetings_completed), subIcon: Timer, subLabel: "Avg Time"
    },
    {
      title: "Demos Completed", value: kpis.demos_completed, icon: Video, data: reportData.details.demos_completed, dataType: 'Demo',
      subValue: formatDuration(kpis.total_demo_duration, kpis.demos_completed), subIcon: Timer, subLabel: "Avg Time"
    },
    {
      title: "Activities Logged", value: kpis.activities_logged, icon: Activity, data: reportData.details.activities_logged, dataType: 'Activity',
      subValue: formatDuration(kpis.total_activity_duration, kpis.activities_logged), subIcon: Timer, subLabel: "Avg Time"
    },
    {
      title: "Tasks Completed", value: `${kpis.tasks_completed} / ${kpis.tasks_created}`, icon: ClipboardList, data: reportData.details.tasks_completed, dataType: 'Task',
      subValue: formatDuration(kpis.total_task_duration, kpis.tasks_completed), subIcon: Timer, subLabel: "Avg Time"
    },
    { title: "Deals Won", value: kpis.deals_won, icon: ThumbsUp, data: reportData.tables.deals_won, dataType: 'DealWon' },
    { title: "Conversion Rate", value: `${kpis.conversion_rate}%`, icon: Target, isPercentage: true },
  ];

  return (
    <div id="kpi-section" className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map(card => (
        <Card
          key={card.title}
          onClick={() => card.data && onCardClick(card.title, card.data, card.dataType || '')}
          className={card.data ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subValue && card.subIcon && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <card.subIcon className="h-3.5 w-3.5 mr-1" />
                <span>{card.subLabel}: {card.subValue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}