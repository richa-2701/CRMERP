//New Folder/frontend/components/layout/sidebar.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Menu,
  Calendar,
  FileText,
  Mail,
  Workflow,
  MessageSquare,
  Upload,
  UploadCloud,
  ListChecks,
  Database,
  Calendar as CalendarIcon,
  Briefcase,
  BarChartHorizontal,
  ChevronRight,
  ChevronLeft,
  Users,
  ChevronDown,
  Trash2,
  CheckSquare, // <-- NEW: Icon for Tasks
  FileSpreadsheet // <-- NEW: Icon for Invoice Sales Report
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiUser } from "@/lib/api"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"

interface SidebarProps {
  currentUser: ApiUser
  isCollapsed?: boolean
  onToggle?: () => void
  onItemClick?: () => void
  isMobile?: boolean
}

interface NavLink {
  type: 'link';
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly: boolean;
}

interface NavGroup {
  type: 'group';
  title: string;
  icon: React.ElementType;
  adminOnly: boolean;
  children: {
    title: string;
    href: string;
    icon: React.ElementType;
  }[];
}

type NavItem = NavLink | NavGroup;

const navigationConfig: NavItem[] = [
  { type: 'link', title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  {
    type: 'group',
    title: "Leads",
    icon: ListChecks,
    adminOnly: false,
    children: [
      { title: "Leads", href: "/dashboard/leads", icon: ListChecks },
      { title: "Create Lead", href: "/dashboard/create-lead", icon: Menu },
      { title: "Pipeline", href: "/dashboard/pipeline", icon: Workflow },
      // { title: "Bulk Upload Leads", href: "/dashboard/bulk-upload", icon: UploadCloud },
      { title: "Recycle Bin", href: "/dashboard/leads/recycle-bin", icon: Trash2 },
    ]
  },
  { type: 'link', title: "Clients", href: "/dashboard/clients", icon: Briefcase, adminOnly: false },
  {
    type: 'group',
    title: "Events",
    icon: Users,
    adminOnly: false,
    children: [
      { title: "Schedule Events", href: "/dashboard/schedule", icon: Calendar },
      { title: "Events", href: "/dashboard/events", icon: FileText },
    ]
  },
  // { type: 'link', title: "Activity", href: "/dashboard/activity", icon: MessageSquare, adminOnly: false },

  {
    type: 'group',
    title: "Activity Management",
    icon: Users,
    adminOnly: false,
    children: [
      { title: "Activity", href: "/dashboard/activity", icon: MessageSquare },
      { title: "Sales Enquiry", href: "https://estimocrmtest.indusanalytics.co.in/Enquiry.aspx", icon: FileText },
      { title: "Proposal Send", href: "https://estimocrmtest.indusanalytics.co.in/BookingPanel.aspx", icon: FileText },
    ]
  },

  { type: 'link', title: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, adminOnly: false }, // <-- NEW: Tasks Link
  {
    type: 'group',
    title: "Reports",
    icon: BarChartHorizontal,
    adminOnly: true,
    children: [
      { title: "Sales Person Report", href: "/dashboard/reports/sales", icon: BarChartHorizontal },
      { title: "Lead Report", href: "/dashboard/reports/leads", icon: Users },
      { title: "Invoice Sales Report", href: "/dashboard/reports/invoice-sales", icon: FileSpreadsheet },
    ]
  },
  { type: 'link', title: "Google Calendar", href: "/dashboard/google-calendar", icon: CalendarIcon, adminOnly: false },
  {
    type: 'group',
    title: "Drip Sequence",
    icon: Workflow,
    adminOnly: false,
    children: [
      { title: "Message Master", href: "/dashboard/message-master", icon: Mail },
      { title: "Drip Master", href: "/dashboard/drip-sequence", icon: Workflow },
      { title: "Drip Status Log", href: "/dashboard/drip-status", icon: ListChecks },
    ]
  },
  { type: 'link', title: "Masters", href: "/dashboard/masters", icon: Database, adminOnly: true },
]

// Ankit-dev 22-Dec-2025 New method to get sales enquiry (DYNAMIC ERP URL BASED ON APPLICATION NAME)
function getErpBaseUrl(applicationName: string) {
  if (applicationName?.toLowerCase() === "multiunit") {
    return "https://testestimomultiunit.indusanalytics.co.in";
  }
  return "https://estimocrmtest.indusanalytics.co.in";
}

function handleSalesEnquiryClick(e: React.MouseEvent) {
  e.preventDefault();

  // Note: This feature requires user password which is no longer stored for security reasons
  alert("Sales Enquiry feature is currently unavailable. Please contact your administrator.");
  return;

  /* Original code - disabled for security
  const companyName = localStorage.getItem("companyName");
  const companyPassword = localStorage.getItem("companyPassword");
  const applicationName = localStorage.getItem("applicationName");
  const userStr = localStorage.getItem("user");

  let username = "";
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      username = user.username;
    } catch (err) {
      console.error("Error parsing user from localstorage", err);
    }
  }

  if (!companyName || !companyPassword || !username || !applicationName) {
    alert("Missing login credentials. Please login again.");
    return;
  }

  const erpBaseUrl = getErpBaseUrl(applicationName);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${erpBaseUrl}/Enquiry.aspx`;
  form.style.display = "none";

  const fields = {
    cname: companyName,
    cpwd: companyPassword,
    uid: username,
    upwd: "", // userPassword removed for security
    appname: applicationName
  };

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  */
}

function handleQuotationClick(e: React.MouseEvent) {
  e.preventDefault();

  // Note: This feature requires user password which is no longer stored for security reasons
  alert("Proposal Send feature is currently unavailable. Please contact your administrator.");
  return;

  /* Original code - disabled for security
  const companyName = localStorage.getItem("companyName");
  const companyPassword = localStorage.getItem("companyPassword");
  const applicationName = localStorage.getItem("applicationName");
  const userStr = localStorage.getItem("user");

  let username = "";
  if (userStr) {
    const user = JSON.parse(userStr);
    username = user.username;
  }

  if (!companyName || !companyPassword || !username || !applicationName) {
    alert("Missing login credentials. Please login again.");
    return;
  }

  const erpBaseUrl = getErpBaseUrl(applicationName);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${erpBaseUrl}/BookingPanel.aspx`;
  form.style.display = "none";

  const fields = {
    cname: companyName,
    cpwd: companyPassword,
    uid: username,
    upwd: "", // userPassword removed for security
    appname: applicationName
  };

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  */
}

function CollapsibleNavGroup({ group, isCollapsed, onItemClick }: { group: NavGroup; isCollapsed?: boolean; onItemClick?: () => void }) {
  const pathname = usePathname();
  const isGroupActive = group.children.some(child => pathname.startsWith(child.href));

  const [isOpen, setIsOpen] = useState(isGroupActive);

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium justify-center",
              isGroupActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}>
              <group.icon className="h-4 w-4 shrink-0" />
              <span className="sr-only">{group.title}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold mb-1">{group.title}</p>
            {group.children.map(child => <p key={child.href}>{child.title}</p>)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer w-full",
          isGroupActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}>
          <div className="flex items-center space-x-3">
            <group.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{group.title}</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="py-1 space-y-1">
        {group.children.map((child) => {
          const isActive = pathname === child.href;

          if (child.title === "Sales Enquiry") {
            return (
              <div
                key={child.href}
                onClick={(e) => {
                  if (onItemClick) onItemClick();
                  handleSalesEnquiryClick(e);
                }}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors pl-10 pr-3 cursor-pointer",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <child.icon className="mr-3 h-4 w-4 shrink-0" />
                <span className="truncate">{child.title}</span>
              </div>
            );
          }

          if (child.title === "Proposal Send") {
            return (
              <div
                key={child.href}
                onClick={(e) => {
                  if (onItemClick) onItemClick();
                  handleQuotationClick(e);
                }}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors pl-10 pr-3 cursor-pointer",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <child.icon className="mr-3 h-4 w-4 shrink-0" />
                <span className="truncate">{child.title}</span>
              </div>
            );
          }

          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors pl-10 pr-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <child.icon className="mr-3 h-4 w-4 shrink-0" />
              <span className="truncate">{child.title}</span>
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible >
  );
}

export function SidebarContent({ currentUser, onItemClick, isCollapsed = false, isMobile = false }: SidebarProps) {
  const pathname = usePathname()

  // Items that appear in bottom nav (exclude from mobile sidebar)
  const bottomNavItems = ['Dashboard', 'Leads', 'Events', 'Activity', 'Tasks']

  const accessibleNavItems = navigationConfig.filter(item => {
    // Filter by admin role
    if (item.adminOnly && currentUser.role !== 'admin') return false

    // On mobile, exclude items that are in bottom nav
    if (isMobile && item.type === 'link' && bottomNavItems.includes(item.title)) return false

    return true
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto py-4 custom-scrollbar">
        <nav className="space-y-1 px-3">
          {accessibleNavItems.map((item) => {
            if (item.type === 'group') {
              const accessibleChildren = item.adminOnly && currentUser.role !== 'admin'
                ? []
                : item.children;
              if (accessibleChildren.length === 0) return null;

              const groupToRender = { ...item, children: accessibleChildren };
              return <CollapsibleNavGroup key={item.title} group={groupToRender} isCollapsed={isCollapsed} onItemClick={onItemClick} />;
            }

            const Icon = item.icon
            const isActive = pathname === item.href
            const linkContent = (
              <Link key={item.href} href={item.href} onClick={onItemClick}
                className={cn("flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isCollapsed ? "justify-center" : "space-x-3", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            )

            if (isCollapsed) {
              return (
                <TooltipProvider key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right"><p>{item.title}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            }

            return linkContent
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{(currentUser.username || "U").charAt(0).toUpperCase()}</div>
          {!isCollapsed && (<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{currentUser.username}</p><p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p></div>)}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ currentUser, isCollapsed = false, onToggle }: SidebarProps) {
  return (
    <aside className={cn("hidden md:fixed md:inset-y-0 md:flex md:flex-col md:z-30 transition-all duration-300", isCollapsed ? "md:w-16" : "md:w-64")}>
      <div className="flex flex-col flex-1 min-h-0 border-r bg-card">
        {/* Sidebar Header - matching navbar height */}
        {!isCollapsed && (
          <div className="flex items-center justify-center h-16 border-b bg-card flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight">INDAS CRM</h1>
          </div>
        )}

        <SidebarContent currentUser={currentUser} isCollapsed={isCollapsed} />
      </div>
      <Button variant="ghost" size="icon" onClick={onToggle} className="absolute -right-3 top-20 z-40 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent">
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        <span className="sr-only">Toggle sidebar</span>
      </Button>
    </aside>
  )
}