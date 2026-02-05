//frontend/src/app/dashboard/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Calendar, Clock, Users, Phone, FileText, CheckCircle, MessageSquare, User as UserIcon, Monitor, CheckSquare } from "lucide-react"
import { formatDateTime, parseAsUTCDate } from "@/lib/date-format"
import { api, ApiUser, ApiMeeting, type ApiProposalSent, type ApiDemo, type ApiReminder, type ApiActivity, type ApiLead, ApiTask, leadApi } from "@/lib/api"
import { MarkAsDoneModal } from "@/components/activity/mark-as-done-modal"
import { StaleLeadsModal } from "@/components/leads/stale-leads-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface User {
  id: number
  username: string
  email: string
  role: string
  department: string
  usernumber: string
}

interface Lead {
  id: string
  company_name: string
  contacts: any[]
  assigned_to: string
  status: string
  [key: string]: any
}

interface UnifiedTask {
  id: string;
  numericId: number;
  lead_id: number | null;
  proposal_id?: number | null;
  original_lead_id?: number;
  type: 'meeting' | 'demo' | 'reminder' | 'task';
  activity_type_display: string;
  title: string;
  companyName: string;
  contactName: string;
  assignedTo: string;
  startTime: string;
  endTime: string;
  details: string;
  status?: string;
  raw_activity: ApiReminder | ApiMeeting | ApiDemo | ApiTask;
}

const BASE_CHART_CONFIG = {
  new: { label: "New Leads", color: "hsl(220, 85%, 55%)" },
  "New Lead": { label: "New Lead", color: "hsl(220, 85%, 55%)" },
  "Meeting Scheduled": { label: "Meeting Scheduled", color: "hsl(180, 85%, 45%)" },
  "Demo Scheduled": { label: "Demo Scheduled", color: "hsl(195, 90%, 50%)" },
  "Meeting Done": { label: "Meeting Done", color: "hsl(142, 85%, 45%)" },
  "Demo Done": { label: "Demo Done", color: "hsl(280, 80%, 60%)" },
  "Won/Deal Done": { label: "Won/Closed", color: "hsl(120, 85%, 40%)" },
  Lost: { label: "Lost", color: "hsl(0, 90%, 65%)" },
}

const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
};

function DashboardSkeleton() {
  const SkeletonCard = () => <div className="h-full w-full bg-muted rounded-lg animate-pulse"></div>;
  const SkeletonTask = () => (
    <div className="flex items-start gap-3 p-2">
      <div className="h-5 w-5 bg-muted-foreground/20 rounded-md animate-pulse mt-1"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-muted-foreground/20 rounded animate-pulse"></div>
        <div className="h-3 w-1/2 bg-muted-foreground/20 rounded animate-pulse"></div>
      </div>
      <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse"></div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-6 px-3 sm:px-4 md:px-0">
      <div className="mb-3 space-y-2"><div className="h-8 w-48 bg-muted rounded animate-pulse"></div><div className="h-5 w-64 bg-muted rounded animate-pulse"></div></div>
      <Card className="animate-pulse">
        <CardHeader><div className="h-6 w-40 bg-muted rounded"></div><div className="h-4 w-56 bg-muted rounded mt-1"></div></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{[...Array(4)].map((_, i) => (<div key={i} className="space-y-4"><div className="h-6 w-24 bg-muted rounded"></div><div className="space-y-4 rounded-lg border p-2"><div><div className="h-4 w-16 bg-muted rounded mx-2 mb-2"></div><div className="space-y-2 h-48 pr-2"><SkeletonTask /><SkeletonTask /><SkeletonTask /></div></div><div className="pt-2"><div className="h-4 w-20 bg-muted rounded mx-2 mb-2"></div><div className="space-y-2 h-48 pr-2"><SkeletonTask /></div></div></div></div>))}</div>
        </CardContent>
      </Card>
      <div className="grid gap-4 pt-4 grid-cols-1 lg:grid-cols-5"><div className="lg:col-span-2 h-[400px] bg-muted rounded-lg animate-pulse"></div><div className="lg:col-span-3 grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></div>
    </div>
  );
}

function TaskTypeIcon({ type }: { type: string }) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("meeting")) return <Users className="h-4 w-4 text-blue-500 mt-1" />;
  if (lowerType.includes("demo")) return <Monitor className="h-4 w-4 text-purple-500 mt-1" />;
  if (lowerType.includes("follow-up") || lowerType.includes("call")) return <Phone className="h-4 w-4 text-green-500 mt-1" />;
  if (lowerType === 'task') return <CheckSquare className="h-4 w-4 text-orange-500 mt-1" />;
  if (lowerType.includes("whatsapp")) return <MessageSquare className="h-4 w-4 text-teal-500 mt-1" />;
  return <CheckCircle className="h-4 w-4 text-gray-500 mt-1" />;
}

// Compact Task Card for mobile (used in overdue section on small screens)
function CompactTaskCard({ task, onClick, isOverdue = false }: { task: UnifiedTask; onClick: () => void; isOverdue?: boolean }) {
  const timeString = task.endTime && parseAsUTCDate(task.startTime)!.getTime() !== parseAsUTCDate(task.endTime)!.getTime()
    ? `${formatDateTime(task.startTime).split(',')[2]} - ${formatDateTime(task.endTime).split(',')[2]}`
    : formatDateTime(task.startTime).split(',')[2];

  return (
    <div
      key={task.id}
      className="flex items-start gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 transition-colors text-sm"
      onClick={onClick}
    >
      <TaskTypeIcon type={task.type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-semibold truncate text-xs leading-tight" title={task.companyName}>{task.companyName}</p>
        <p className="text-[10px] text-primary font-medium truncate leading-tight" title={task.activity_type_display}>{task.activity_type_display}</p>
        <p className={`text-[10px] font-medium leading-tight ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
          {timeString}
        </p>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, isUpcoming = false, isOverdue = false }: { task: UnifiedTask; onClick: () => void; isUpcoming?: boolean; isOverdue?: boolean }) {
  const timeString = task.endTime && parseAsUTCDate(task.startTime)!.getTime() !== parseAsUTCDate(task.endTime)!.getTime()
    ? `${formatDateTime(task.startTime).split(',')[2]} - ${formatDateTime(task.endTime).split(',')[2]}`
    : formatDateTime(task.startTime).split(',')[2];

  const dateString = formatDateTime(task.startTime).split(',').slice(0, 2).join(',');

  return (
    <div key={task.id} className="flex items-start gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <TaskTypeIcon type={task.type} />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold truncate text-sm leading-tight" title={task.companyName}>{task.companyName}</p>
        <p className="text-xs text-primary font-medium truncate leading-tight" title={task.activity_type_display}>{task.activity_type_display}</p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {task.type !== 'task' && <div className="flex items-center gap-1.5"><UserIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate" title={task.contactName}>{task.contactName || 'N/A'}</span></div>}
          <div className="flex items-center gap-1.5"><Users className="h-3 w-3 flex-shrink-0" /><span className="truncate" title={task.assignedTo}>{task.assignedTo}</span></div>
          {task.type === 'task' && task.status && <div className="flex items-center gap-1.5 font-medium">{task.status === 'Pending' ? <Clock className="h-3 w-3 text-yellow-500" /> : <CheckCircle className="h-3 w-3 text-blue-500" />}<span>{task.status}</span></div>}
          <div className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
            {isUpcoming || isOverdue ? (
              <div className="space-y-0.5">
                <div>{dateString}</div>
                <div className={`font-normal text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{timeString}</div>
              </div>
            ) : (<span>{timeString}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [allUnifiedTasks, setAllUnifiedTasks] = useState<UnifiedTask[]>([])
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [totalDemos, setTotalDemos] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [leadStatusData, setLeadStatusData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dynamicChartConfig, setDynamicChartConfig] = useState(BASE_CHART_CONFIG);

  const [activityToComplete, setActivityToComplete] = useState<ApiReminder | null>(null);
  const [isDoneModalOpen, setDoneModalOpen] = useState(false);
  const [taskToTakeActionOn, setTaskToTakeActionOn] = useState<ApiTask | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<UnifiedTask | null>(null);
  const [isTaskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);

  // Stale Leads State
  const [staleLeads, setStaleLeads] = useState<any[]>([])
  const [isStaleLeadsModalOpen, setStaleLeadsModalOpen] = useState(false)

  const loadDashboardData = useCallback(async (currentUser: User) => {
    try {
      setLoading(true);
      const [leadsData, allMeetings, allDemos, allReminders, usersData, allTasksData, staleLeadsData, allProposals] = await Promise.all([
        api.getAllLeads(),
        api.getAllMeetings(),
        api.getAllDemos(),
        api.getAllReminders().catch(err => {
          console.warn("Failed to fetch reminders, defaulting to empty list:", err);
          return [];
        }),
        api.getUsers(),
        api.getTasksForUser(currentUser.id),
        leadApi.getStaleLeads().catch(err => {
          console.warn("Failed to fetch stale leads:", err);
          return [];
        }),
        api.getAllProposals().catch(err => {
          console.warn("Failed to fetch proposals:", err);
          return [];
        })
      ]);

      if (staleLeadsData && staleLeadsData.length > 0) {
        setStaleLeads(staleLeadsData);
        setStaleLeadsModalOpen(true);
      }

      const userMap = new Map<string, string>((usersData || []).map(user => [user.usernumber, user.username]));
      const proposalsMap = new Map((allProposals || []).map(p => [p.id, p]));


      const filteredLeads = currentUser.role === "admin" ? leadsData : leadsData.filter(lead => lead.assigned_to === currentUser.username || lead.AssignedTo === currentUser.username || lead.SalesPersonName === currentUser.username);

      // Normalize leads data to handle LedgerMaster structure
      // Main lead: LedgerGroupID = 1, has LedgerName (company name)
      // Consignees: LedgerGroupID = 4, has LedgerName (contact name), linked via RefClientID
      const normalizedLeads = filteredLeads.map(lead => {
        // Parse contacts JSON string if it exists
        let contactsArray: any[] = [];
        try {
          const contactsRaw = lead.contacts || lead.Contacts;
          if (typeof contactsRaw === 'string') {
            contactsArray = JSON.parse(contactsRaw);
          } else if (Array.isArray(contactsRaw)) {
            contactsArray = contactsRaw;
          }
        } catch (e) {
          console.warn(`Failed to parse contacts for lead ${lead.LedgerID}:`, e);
        }

        // Map consignee LedgerName to contact_name
        const normalizedContacts = contactsArray.map((c: any) => ({
          ...c,
          contact_name: c.LedgerName || c.MailingName || c.ledger_name || c.mailing_name || "N/A"
        }));

        return {
          ...lead,
          id: String(lead.LedgerID || lead.ledger_id || lead.id),
          company_name: lead.LedgerName || lead.ledger_name || lead.MailingName || "Unknown Company",
          contacts: normalizedContacts
        };
      });

      setLeads(normalizedLeads);

      // Create map with normalized data
      // Use string keys for robust lookup since IDs might be numbers or strings
      const leadsMap = new Map<string, ApiLead>(normalizedLeads.map((lead: any) => [String(lead.id), lead]));

      const pendingMeetings = allMeetings.filter(e => e.phase === "Scheduled" || e.phase === "Pending" || e.phase === "Rescheduled");
      const pendingDemos = allDemos.filter(e => e.phase === "Scheduled" || e.phase === "Pending" || e.phase === "Rescheduled");
      const pendingReminders = allReminders.filter(a => ['pending', 'sent', 'failed', 'notified'].includes(a.status.toLowerCase()) && !a.is_hidden_from_activity_log);
      const pendingTasks = allTasksData.filter(t => t.status !== 'Completed');

      const combinedTasks: UnifiedTask[] = [];

      pendingMeetings.forEach(m => {
        const leadIdKey = String(m.lead_id || "");
        const parent = leadIdKey ? leadsMap.get(leadIdKey) : m.proposal_id ? proposalsMap.get(m.proposal_id) : undefined;

        combinedTasks.push({ id: `meeting-${m.id}`, numericId: m.id, lead_id: m.lead_id, proposal_id: m.proposal_id, original_lead_id: (parent as ApiProposalSent)?.original_lead_id, type: 'meeting', title: "Meeting", activity_type_display: m.meeting_type || "General Meeting", companyName: parent?.company_name || 'Unknown', contactName: (parent as any)?.contacts?.[0]?.contact_name || 'N/A', assignedTo: userMap.get(m.assigned_to) || m.assigned_to, startTime: m.event_time, endTime: m.event_end_time, details: `Scheduled meeting.`, raw_activity: m });
      });

      pendingDemos.forEach(d => {
        const leadIdKey = String(d.lead_id || "");
        const parent = leadIdKey ? leadsMap.get(leadIdKey) : d.proposal_id ? proposalsMap.get(d.proposal_id) : undefined;
        combinedTasks.push({ id: `demo-${d.id}`, numericId: d.id, lead_id: d.lead_id, proposal_id: d.proposal_id, original_lead_id: (parent as ApiProposalSent)?.original_lead_id, type: 'demo', title: "Demo", activity_type_display: "Product Demo", companyName: parent?.company_name || 'Unknown', contactName: (parent as any)?.contacts?.[0]?.contact_name || 'N/A', assignedTo: userMap.get(d.assigned_to) || d.assigned_to, startTime: d.start_time, endTime: d.event_end_time, details: `Scheduled demo.`, raw_activity: d });
      });

      pendingReminders.forEach(a => {
        const leadIdKey = String(a.lead_id || "");
        const lead = leadsMap.get(leadIdKey);
        if (lead) combinedTasks.push({ id: `reminder-${a.id}`, numericId: a.id, lead_id: a.lead_id, type: 'reminder', title: a.activity_type || "Reminder", activity_type_display: a.message, companyName: lead.company_name, contactName: lead.contacts?.[0]?.contact_name || 'N/A', assignedTo: userMap.get(a.assigned_to) || a.assigned_to, startTime: a.remind_time, endTime: a.remind_time, details: a.message, raw_activity: a });
      });

      pendingTasks.forEach(t => {
        combinedTasks.push({ id: `task-${t.id}`, numericId: t.id, lead_id: t.lead_ids ? parseInt(t.lead_ids.split(',')[0]) : null, type: 'task', title: "Task", activity_type_display: t.title, companyName: t.company_names || 'General Task', contactName: 'N/A', assignedTo: t.assigned_to_username, startTime: t.due_date, endTime: t.due_date, details: t.details || 'No details provided.', status: t.status, raw_activity: t });
      });

      combinedTasks.sort((a, b) => parseAsUTCDate(a.startTime)!.getTime() - parseAsUTCDate(b.startTime)!.getTime());
      setAllUnifiedTasks(combinedTasks);

      setTotalMeetings(allMeetings.length);
      setTotalDemos(allDemos.length);
      setTotalTasks(allTasksData.length);

      const statusCounts = filteredLeads.reduce((acc, lead) => {
        let status = lead.LeadStatus || lead.Status || lead.status || "Unknown";
        if (status === "New") status = "New Lead";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const finalChartConfig = { ...BASE_CHART_CONFIG };
      const chartData = Object.entries(statusCounts).map(([status, count]) => {
        if (!finalChartConfig[status as keyof typeof finalChartConfig]) finalChartConfig[status as keyof typeof finalChartConfig] = { label: status, color: generateColorFromString(status) };
        return { name: status, value: count, fill: finalChartConfig[status as keyof typeof finalChartConfig].color, label: finalChartConfig[status as keyof typeof finalChartConfig].label };
      });
      setLeadStatusData(chartData);
      setDynamicChartConfig(finalChartConfig);
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Failed to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) { setLoading(false); router.push("/login"); return; }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadDashboardData(parsedUser);
  }, [loadDashboardData, router]);

  const handleSuccess = () => {
    setDoneModalOpen(false);
    if (user) loadDashboardData(user);
  }

  const handleStartTask = async (taskId: number) => {
    try {
      await api.updateTaskStatus(taskId, 'In Progress');
      toast.success("Task is now in progress.");
      if (user) loadDashboardData(user);
    } catch (error: any) {
      toast.error("Failed to start task.", { description: error.message });
    }
  };

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.type === 'meeting' || task.type === 'demo') {
      const leadIdForNav = task.original_lead_id || task.lead_id;
      if (leadIdForNav) router.push(`/dashboard/post-${task.type}?leadId=${leadIdForNav}&${task.type}Id=${task.numericId}`);
    } else if (task.type === 'reminder') {
      setActivityToComplete(task.raw_activity as ApiReminder);
      setDoneModalOpen(true);
    } else if (task.type === 'task') {
      const rawTask = task.raw_activity as ApiTask;
      if (rawTask.status === 'Pending') {
        setTaskToTakeActionOn(rawTask);
        setTaskModalOpen(true);
      } else if (rawTask.status === 'In Progress') {
        router.push('/dashboard/tasks');
      }
    }
  };

  const handleCompactTaskClick = (task: UnifiedTask) => {
    // For compact cards, show details modal first
    setSelectedTaskForDetails(task);
    setTaskDetailsModalOpen(true);
  };

  const handleMarkStaleLeadLost = async (leadId: number, reason: string) => {
    try {
      await leadApi.markLeadAsLost(leadId, reason);
      toast.success("Lead marked as lost");
      setStaleLeads(prev => {
        const remaining = prev.filter(l => l.LedgerID !== leadId);
        if (remaining.length === 0) {
          setStaleLeadsModalOpen(false);
        }
        return remaining;
      });
    } catch (error) {
      console.error("Failed to mark lead as lost:", error);
      toast.error("Failed to mark lead as lost");
    }
  };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfNextWeek = new Date(todayStart); endOfNextWeek.setDate(endOfNextWeek.getDate() + 7); endOfNextWeek.setHours(23, 59, 59, 999);

  const overdueTasks = allUnifiedTasks.filter(task => parseAsUTCDate(task.startTime)! < todayStart).sort((a, b) => parseAsUTCDate(b.startTime)!.getTime() - parseAsUTCDate(a.startTime)!.getTime());
  const todaysTasks = allUnifiedTasks.filter(task => { const d = parseAsUTCDate(task.startTime)!; return d >= todayStart && d <= endOfToday; });
  const upcomingTasks = allUnifiedTasks.filter(task => { const d = parseAsUTCDate(task.startTime)!; return d >= tomorrow && d <= endOfNextWeek; });

  const overdueMeetings = overdueTasks.filter(t => t.type === 'meeting');
  const overdueDemos = overdueTasks.filter(t => t.type === 'demo');
  const overdueActivities = overdueTasks.filter(t => t.type === 'reminder');
  const overdueSystemTasks = overdueTasks.filter(t => t.type === 'task');

  const todaysMeetings = todaysTasks.filter(t => t.type === 'meeting');
  const todaysDemos = todaysTasks.filter(t => t.type === 'demo');
  const todaysActivities = todaysTasks.filter(t => t.type === 'reminder');
  const todaysSystemTasks = todaysTasks.filter(t => t.type === 'task');

  const upcomingMeetings = upcomingTasks.filter(t => t.type === 'meeting');
  const upcomingDemos = upcomingTasks.filter(t => t.type === 'demo');
  const upcomingActivities = upcomingTasks.filter(t => t.type === 'reminder');
  const upcomingSystemTasks = upcomingTasks.filter(t => t.type === 'task');

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <div className="space-y-3 md:space-y-4 pb-6 px-3 sm:px-4 md:px-0">
        {/* Page title - hidden on mobile, shown on desktop */}
        <div className="mb-1 md:mb-2 hidden md:block">
          {/* <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1> */}
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Welcome back, {user.username}!{user.role === "admin" ? " (Admin)" : ""}</p>
        </div>
        {overdueTasks.length > 0 && (
          <Card className="border-red-500/50"><CardHeader className="pb-3 md:pb-6"><CardTitle className="text-red-600 text-base sm:text-lg md:text-xl">Overdue Items</CardTitle><CardDescription className="text-xs sm:text-sm">These items require your immediate attention.</CardDescription></CardHeader>
            <CardContent>
              {/* Mobile & Tablet: 2x2 grid - Row 1: Meetings & Demos, Row 2: Activities & Tasks */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
                {/* Row 1: Meetings */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    <h3 className="text-sm sm:text-base font-semibold">Meetings</h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 rounded-lg border p-1.5 sm:p-2 h-48 sm:h-56 overflow-y-auto pr-1">
                    {overdueMeetings.length > 0 ? overdueMeetings.map((task) => (
                      <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No overdue meetings.</p>
                    )}
                  </div>
                </div>

                {/* Row 1: Demos */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                    <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                    <h3 className="text-sm sm:text-base font-semibold">Demos</h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 rounded-lg border p-1.5 sm:p-2 h-48 sm:h-56 overflow-y-auto pr-1">
                    {overdueDemos.length > 0 ? overdueDemos.map((task) => (
                      <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No overdue demos.</p>
                    )}
                  </div>
                </div>

                {/* Row 2: Activities */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    <h3 className="text-sm sm:text-base font-semibold">Activities</h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 rounded-lg border p-1.5 sm:p-2 h-48 sm:h-56 overflow-y-auto pr-1">
                    {overdueActivities.length > 0 ? overdueActivities.map((task) => (
                      <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No overdue activities.</p>
                    )}
                  </div>
                </div>

                {/* Row 2: Tasks */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                    <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                    <h3 className="text-sm sm:text-base font-semibold">Tasks</h3>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 rounded-lg border p-1.5 sm:p-2 h-48 sm:h-56 overflow-y-auto pr-1">
                    {overdueSystemTasks.length > 0 ? overdueSystemTasks.map((task) => (
                      <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No overdue tasks.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop: 4-column grid (Original Layout) */}
              <div className="hidden md:grid grid-cols-4 gap-4 lg:gap-6">
                {/* Column 1: Meetings */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h3 className="text-base lg:text-lg font-semibold">Meetings</h3>
                  </div>
                  <div className="space-y-2 rounded-lg border p-2 h-80 overflow-y-auto pr-2">
                    {overdueMeetings.length > 0 ? overdueMeetings.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No overdue meetings.</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Demos */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Monitor className="h-5 w-5 text-purple-500" />
                    <h3 className="text-base lg:text-lg font-semibold">Demos</h3>
                  </div>
                  <div className="space-y-2 rounded-lg border p-2 h-80 overflow-y-auto pr-2">
                    {overdueDemos.length > 0 ? overdueDemos.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No overdue demos.</p>
                    )}
                  </div>
                </div>

                {/* Column 3: Activities */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Phone className="h-5 w-5 text-green-500" />
                    <h3 className="text-base lg:text-lg font-semibold">Activities</h3>
                  </div>
                  <div className="space-y-2 rounded-lg border p-2 h-80 overflow-y-auto pr-2">
                    {overdueActivities.length > 0 ? overdueActivities.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No overdue activities.</p>
                    )}
                  </div>
                </div>

                {/* Column 4: Tasks */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <CheckSquare className="h-5 w-5 text-orange-500" />
                    <h3 className="text-base lg:text-lg font-semibold">Tasks</h3>
                  </div>
                  <div className="space-y-2 rounded-lg border p-2 h-80 overflow-y-auto pr-2">
                    {overdueSystemTasks.length > 0 ? overdueSystemTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isOverdue />
                    )) : (
                      <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No overdue tasks.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-3 md:pb-6"><CardTitle className="text-base sm:text-lg md:text-xl">Today & Upcoming</CardTitle><CardDescription className="text-xs sm:text-sm">Click on any item to take action.</CardDescription></CardHeader>
          <CardContent>
            {/* Mobile & Tablet: 2x2 grid - Row 1: Meetings & Demos, Row 2: Activities & Tasks */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:hidden">
              {/* Row 1: Meetings */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  <h3 className="text-sm sm:text-base font-semibold">Meetings</h3>
                </div>
                <div className="space-y-2 sm:space-y-3 rounded-lg border p-1.5 sm:p-2">
                  <div>
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {todaysMeetings.length > 0 ? todaysMeetings.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No meetings today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {upcomingMeetings.length > 0 ? upcomingMeetings.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No upcoming meetings.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 1: Demos */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                  <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                  <h3 className="text-sm sm:text-base font-semibold">Demos</h3>
                </div>
                <div className="space-y-2 sm:space-y-3 rounded-lg border p-1.5 sm:p-2">
                  <div>
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {todaysDemos.length > 0 ? todaysDemos.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No demos today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {upcomingDemos.length > 0 ? upcomingDemos.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No upcoming demos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Activities */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                  <h3 className="text-sm sm:text-base font-semibold">Activities</h3>
                </div>
                <div className="space-y-2 sm:space-y-3 rounded-lg border p-1.5 sm:p-2">
                  <div>
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {todaysActivities.length > 0 ? todaysActivities.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No activities today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {upcomingActivities.length > 0 ? upcomingActivities.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No upcoming activities.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Tasks */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                  <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                  <h3 className="text-sm sm:text-base font-semibold">Tasks</h3>
                </div>
                <div className="space-y-2 sm:space-y-3 rounded-lg border p-1.5 sm:p-2">
                  <div>
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {todaysSystemTasks.length > 0 ? todaysSystemTasks.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No tasks due today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <h4 className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-1.5 h-32 sm:h-40 overflow-y-auto pr-1">
                      {upcomingSystemTasks.length > 0 ? upcomingSystemTasks.map((task) => (
                        <CompactTaskCard key={task.id} task={task} onClick={() => handleCompactTaskClick(task)} />
                      )) : (
                        <p className="p-1.5 h-full flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground text-center">No upcoming tasks.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: 4-column grid (Original Layout) */}
            <div className="hidden md:grid grid-cols-4 gap-4 lg:gap-6">
              {/* Column 1: Meetings */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base lg:text-lg font-semibold">Meetings</h3>
                </div>
                <div className="space-y-3 md:space-y-4 rounded-lg border p-2">
                  <div>
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {todaysMeetings.length > 0 ? todaysMeetings.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No meetings today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {upcomingMeetings.length > 0 ? upcomingMeetings.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isUpcoming />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No upcoming meetings.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Demos */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Monitor className="h-5 w-5 text-purple-500" />
                  <h3 className="text-base lg:text-lg font-semibold">Demos</h3>
                </div>
                <div className="space-y-3 md:space-y-4 rounded-lg border p-2">
                  <div>
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {todaysDemos.length > 0 ? todaysDemos.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No demos today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {upcomingDemos.length > 0 ? upcomingDemos.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isUpcoming />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No upcoming demos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Activities */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Phone className="h-5 w-5 text-green-500" />
                  <h3 className="text-base lg:text-lg font-semibold">Activities</h3>
                </div>
                <div className="space-y-3 md:space-y-4 rounded-lg border p-2">
                  <div>
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {todaysActivities.length > 0 ? todaysActivities.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No activities today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {upcomingActivities.length > 0 ? upcomingActivities.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isUpcoming />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No upcoming activities.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 4: Tasks */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <CheckSquare className="h-5 w-5 text-orange-500" />
                  <h3 className="text-base lg:text-lg font-semibold">Tasks</h3>
                </div>
                <div className="space-y-3 md:space-y-4 rounded-lg border p-2">
                  <div>
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Today</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {todaysSystemTasks.length > 0 ? todaysSystemTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No tasks due today.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="px-2 pb-2 text-xs sm:text-sm font-semibold text-muted-foreground">Upcoming</h4>
                    <div className="space-y-2 h-40 sm:h-48 overflow-y-auto pr-2">
                      {upcomingSystemTasks.length > 0 ? upcomingSystemTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} isUpcoming />
                      )) : (
                        <p className="p-2 h-full flex items-center justify-center text-xs text-muted-foreground">No upcoming tasks.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 pt-2 md:pt-4 grid-cols-1 lg:grid-cols-5">
          <Card className="lg:col-span-2">{/* Lead Status Chart */}
            <CardHeader className="pb-2 md:pb-3"><CardTitle className="text-sm sm:text-base md:text-lg">Lead Status Distribution</CardTitle><CardDescription className="text-xs sm:block">{user.role === "admin" ? "Distribution of all leads" : "Distribution of your leads"}</CardDescription></CardHeader>
            <CardContent className="pb-3 md:pb-2"><div className="flex flex-col sm:flex-row lg:flex-col gap-4"><ChartContainer config={dynamicChartConfig} className="mx-auto aspect-square max-h-[180px] sm:max-h-[200px] md:max-h-[250px] w-full sm:w-1/2 lg:w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><ChartTooltip cursor={false} content={({ active, payload }) => { if (active && payload && payload.length) { const data = payload[0].payload; return (<div className="p-2 text-sm bg-background border rounded-lg shadow-lg">{data.label}: <span className="font-bold">{data.value}</span></div>); } return null; }} /><Pie data={leadStatusData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2}>{leadStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie></PieChart></ResponsiveContainer></ChartContainer><div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-x-3 gap-y-1 sm:w-1/2 lg:w-full">{leadStatusData.map((item) => (<div key={item.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5 min-w-0"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} /> <span className="truncate">{item.label}</span></div><span className="font-bold flex-shrink-0 ml-1">{item.value}</span></div>))}</div></div></CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-3">{/* Summary Cards */}
            <Link href="/dashboard/leads" className="block"><Card className="h-full transition-colors cursor-pointer hover:bg-muted/50"><CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium">{user.role === "admin" ? "Total Leads" : "My Leads"}</CardTitle><Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" /></CardHeader><CardContent className="pb-2"><div className="text-xl sm:text-2xl font-bold">{leads.length}</div><p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{user.role === "admin" ? "All leads in system" : "Leads assigned to you"}</p></CardContent></Card></Link>
            <Link href="/dashboard/tasks" className="block"><Card className="h-full transition-colors cursor-pointer hover:bg-muted/50"><CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium">My Tasks</CardTitle><CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" /></CardHeader><CardContent className="pb-2"><div className="text-xl sm:text-2xl font-bold">{totalTasks}</div><p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">Total assigned tasks</p></CardContent></Card></Link>
            <Link href="/dashboard/events" className="block"><Card className="h-full transition-colors cursor-pointer hover:bg-muted/50"><CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium">Events</CardTitle><Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" /></CardHeader><CardContent className="pb-2"><div className="flex divide-x"><div className="flex-1 pr-2 sm:pr-3"><div className="text-xl sm:text-2xl font-bold">{totalMeetings}</div><p className="text-[10px] sm:text-xs text-muted-foreground">Meetings</p></div><div className="flex-1 pl-2 sm:pl-3"><div className="text-xl sm:text-2xl font-bold">{totalDemos}</div><p className="text-[10px] sm:text-xs text-muted-foreground">Demos</p></div></div></CardContent></Card></Link>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle><Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" /></CardHeader><CardContent className="pb-2"><div className="text-xl sm:text-2xl font-bold">{leads.length > 0 ? `${((leads.filter((l) => { const s = l.LeadStatus || l.Status || l.status || ""; return s === "Won" || s === "Won/Deal Done"; }).length / leads.length) * 100).toFixed(1)}%` : "0%"}</div><p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">Based on your leads</p></CardContent></Card>
          </div>
        </div>
      </div>
      <MarkAsDoneModal activity={activityToComplete as any} currentUser={user} isOpen={isDoneModalOpen} onClose={() => setDoneModalOpen(false)} onSuccess={handleSuccess} />

      {/* Task Details Modal */}
      {selectedTaskForDetails && (
        <AlertDialog open={isTaskDetailsModalOpen} onOpenChange={setTaskDetailsModalOpen}>
          <AlertDialogContent className="max-w-sm sm:max-w-md">
            <AlertDialogHeader className="pb-2">
              <div className="flex items-start gap-2">
                <TaskTypeIcon type={selectedTaskForDetails.type} />
                <div className="flex-1 min-w-0">
                  <AlertDialogTitle className="text-base sm:text-lg leading-tight">{selectedTaskForDetails.companyName}</AlertDialogTitle>
                  <p className="text-xs sm:text-sm text-primary font-medium mt-0.5">{selectedTaskForDetails.activity_type_display}</p>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs sm:text-sm py-2">
                <div className="flex items-start gap-2">
                  <p className="font-semibold text-foreground min-w-[80px]">Date & Time:</p>
                  <p className="text-muted-foreground flex-1">{formatDateTime(selectedTaskForDetails.startTime)}</p>
                </div>
                {selectedTaskForDetails.type !== 'task' && (
                  <div className="flex items-start gap-2">
                    <p className="font-semibold text-foreground min-w-[80px]">Contact:</p>
                    <p className="text-muted-foreground flex-1 truncate">{selectedTaskForDetails.contactName || 'N/A'}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <p className="font-semibold text-foreground min-w-[80px]">Assigned To:</p>
                  <p className="text-muted-foreground flex-1">{selectedTaskForDetails.assignedTo}</p>
                </div>
                {selectedTaskForDetails.type === 'task' && selectedTaskForDetails.status && (
                  <div className="flex items-start gap-2">
                    <p className="font-semibold text-foreground min-w-[80px]">Status:</p>
                    <p className="text-muted-foreground flex-1">{selectedTaskForDetails.status}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <p className="font-semibold text-foreground min-w-[80px]">Details:</p>
                  <p className="text-muted-foreground flex-1">{selectedTaskForDetails.details}</p>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
              <AlertDialogCancel onClick={() => setTaskDetailsModalOpen(false)} className="mt-0">Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setTaskDetailsModalOpen(false); handleTaskClick(selectedTaskForDetails); }}>Take Action</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {taskToTakeActionOn && (
        <AlertDialog open={isTaskModalOpen} onOpenChange={setTaskModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Task: {taskToTakeActionOn.title}</AlertDialogTitle>
              <AlertDialogDescription>This task is currently 'Pending'. What would you like to do?<br /><span className="block mt-2 font-semibold">Details:</span> {taskToTakeActionOn.details || "N/A"}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { handleStartTask(taskToTakeActionOn.id); setTaskModalOpen(false); }} className="bg-blue-600 hover:bg-blue-700">Start Task (In Progress)</AlertDialogAction>
              <AlertDialogAction onClick={() => router.push('/dashboard/tasks')}>Complete Task</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <StaleLeadsModal
        isOpen={isStaleLeadsModalOpen}
        onClose={() => setStaleLeadsModalOpen(false)}
        leads={staleLeads}
        onMarkLost={handleMarkStaleLeadLost}
      />
    </>
  )
}