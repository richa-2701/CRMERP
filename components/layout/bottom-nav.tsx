"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ListChecks, Calendar, MessageSquare, CheckSquare } from "lucide-react"

const bottomNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/dashboard/leads", icon: ListChecks },
  { title: "Events", href: "/dashboard/events", icon: Calendar },
  { title: "Activity", href: "/dashboard/activity", icon: MessageSquare },
  { title: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium truncate w-full text-center", isActive && "text-primary")}>
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
