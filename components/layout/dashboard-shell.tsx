// frontend/components/layout/dashboard-shell.tsx
"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Navbar } from "./navbar"
import { Sidebar, SidebarContent } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { CRMChatbot, FloatingChatbotButton } from "@/components/chatbot/crm-chatbot"
import { ApiUser } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

// Map of routes to page titles
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/leads': 'Leads',
  '/dashboard/create-lead': 'Create Lead',
  '/dashboard/bulk-upload': 'Bulk Upload Leads',
  '/dashboard/leads/recycle-bin': 'Recycle Bin',
  '/dashboard/view-quotations': 'View Quotation',
  '/dashboard/add-quotation': 'Add Quotation',
  '/dashboard/clients': 'Clients',
  '/dashboard/schedule': 'Schedule Events',
  '/dashboard/events': 'Events',
  '/dashboard/activity': 'Activity',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/reports': 'Reports',
  '/dashboard/reports/sales': 'User Performance Report',
  '/dashboard/reports/leads': 'Lead Report',
  '/dashboard/reports/invoice-sales': 'Invoice Sales Report',
  '/dashboard/google-calendar': 'Google Calendar',
  '/dashboard/message-master': 'Message Master',
  '/dashboard/drip-sequence': 'Drip Sequence',
  '/dashboard/masters': 'Masters',
  '/dashboard/profile': 'Profile',
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // Get page title based on current route
  const pageTitle = pageTitles[pathname] || 'INDAS CRM'

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }
    try {
      setUser(JSON.parse(userData))
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error)
      localStorage.removeItem("user")
      router.push("/login")
    }
  }, [router])

  if (!user) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>
  }

  const MobileSidebar = (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>INDAS CRM</SheetTitle>
          {/* <SheetDescription>
                Navigate through the CRM application.
            </SheetDescription> */}
        </SheetHeader>
        <SidebarContent currentUser={user} onItemClick={() => setMobileSidebarOpen(false)} isMobile={true} />
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} pageTitle={pageTitle} isSidebarCollapsed={isSidebarCollapsed}>
        {isMobile && MobileSidebar}
      </Navbar>
      <div className="flex">
        <Sidebar
          currentUser={user}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main
          className={cn(
            "flex-1 overflow-auto transition-all duration-300",
            isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          <div className="pt-1 pl-1 pr-1 pb-20 md:pt-2 md:pb-6 md:px-3 md:pr-3">
            <div className="mx-auto max-w-full">{children}</div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />

      {/* {!isChatbotOpen && <FloatingChatbotButton onClick={() => setIsChatbotOpen(true)} />}

      <CRMChatbot
        currentUser={user}
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      /> */}
    </div>
  )
}