// frontend/components/layout/navbar.tsx
"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, LogOut, Menu, User } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { ApiUser } from "@/lib/api"
import React from "react"

interface NavbarProps {
  user: ApiUser
  children?: React.ReactNode
  pageTitle?: string
  isSidebarCollapsed?: boolean
}

export function Navbar({ user, children, pageTitle, isSidebarCollapsed = false }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleLogout = () => {
    // Clear all stored credentials and data
    localStorage.clear()
    sessionStorage.clear()
    router.push("/login")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleProposalManagementClick = () => {
    // 1. Ensure this URL is exactly correct for your local VB.NET project.
    const vbNetAppUrl = "http://proposal.indusanalytics.co.in/";

    const params = new URLSearchParams();
    if (user) {
      params.append("username", user.username);
      params.append("email", user.email || "");
      params.append("role", user.role || "user");
      params.append("userId", user.id.toString());
    }

    const finalUrl = `${vbNetAppUrl}?${params.toString()}`;

    // --- THIS IS THE FIX ---
    // Log to the console to confirm the function is running and the URL is correct.
    console.log("Attempting to navigate to external VB.NET application:", finalUrl);

    // Use window.open with '_self' to navigate in the current tab. This is often more reliable
    // than window.location.href for cross-origin navigation, especially from localhost.
    window.open(finalUrl, '_self');
  };

  return (
    <nav className={`sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4 md:flex-1">
          {/* Mobile menu button */}
          <div className="md:hidden">
            {children}
          </div>
          {/* Page title - mobile shows in navbar, desktop shows in navbar too */}
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity md:pointer-events-none">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight cursor-pointer md:cursor-default">{pageTitle || "INDAS CRM"}</h1>
          </Link>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Commented out for now as requested */}
          {/* {user.role === "admin" && user.company_name !== "Amar Ujala" && (
            <Button variant="ghost" size="sm" className="h-8 px-3" onClick={handleProposalManagementClick}>
              Proposal Management
            </Button>
          )} */}

          {/* Theme toggle button */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 sm:h-9 sm:w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{(user.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}