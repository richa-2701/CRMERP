//frontend/app/login/page.tsx
"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function CompanyLoginPage() {
  const [companyName, setCompanyName] = useState("")
  const [companyPassword, setCompanyPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await api.companyAuthenticate(companyName, companyPassword)

      // Store company credentials and application name in localStorage
      localStorage.setItem("companyName", companyName)
      localStorage.setItem("companyPassword", companyPassword)

      // Store application name from response
      if (response?.applicationname) {
        localStorage.setItem("applicationName", response.applicationname)
      }

      toast({ title: "Company verified!", description: "Please log in with your user credentials." })
      router.push("/user-login")

    } catch (err: any) {
      let errorMsg = "An unknown error occurred.";

      if (err instanceof Error) {
        errorMsg = err.message;
      }

      // Only log to console if it's NOT a known auth error
      if (!errorMsg.includes("API 401") &&
        !errorMsg.includes("Login Failed") &&
        !errorMsg.includes("You are not authorized")) {
        console.error(err)
      }

      // Clean up common API errors
      if (errorMsg.includes("You are not authorized for this module")) {
        errorMsg = "You are not authorized for this module.";
      } else if (errorMsg.includes("API 401")) {
        errorMsg = "Invalid Company Credentials. Please check details.";
      } else if (errorMsg.includes("Login Failed")) {
        errorMsg = "Login Failed. Please check your credentials.";
      }

      // Extract message from JSON if present
      const jsonMatch = errorMsg.match(/{\"Message\":\"(.*?)\"}/)
      if (jsonMatch && jsonMatch[1]) {
        errorMsg = jsonMatch[1]
      }

      setErrorMessage(errorMsg)
      setShowErrorDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>Company Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPassword">Company Password</Label>
              <Input
                id="companyPassword"
                type="password"
                value={companyPassword}
                onChange={(e) => setCompanyPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify Company"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Login Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}