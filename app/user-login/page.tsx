//frontend/app/user-login/page.tsx
"use client"

import React, { useState, useEffect } from "react"
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

export default function UserLoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [showErrorDialog, setShowErrorDialog] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        const storedCompany = localStorage.getItem("companyName")
        if (!storedCompany) {
            router.push("/login")
        } else {
            setCompanyName(storedCompany)
        }
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // Retrieve company password from localStorage
            const companyPassword = localStorage.getItem("companyPassword")

            if (!companyPassword) {
                setErrorMessage("Session expired. Please login again with company credentials.")
                setShowErrorDialog(true)
                setTimeout(() => router.push("/login"), 2000)
                return
            }

            const userData = await api.userAuthenticate(username, password, companyName, companyPassword)
            if (userData && userData.id) {
                localStorage.setItem("user", JSON.stringify(userData))
                // Note: userPassword is NOT stored for security reasons
                toast({ title: "Login Successful", description: `Welcome, ${userData.username}!` })
                router.push("/dashboard")
            } else {
                setErrorMessage("Invalid user credentials. Please check your username and password.")
                setShowErrorDialog(true)
            }
        } catch (err: any) {
            let errorMsg = "An unknown error occurred."

            if (err instanceof Error) {
                errorMsg = err.message
            }

            // Only log to console if it's NOT a known auth error
            if (!errorMsg.includes("API 401") &&
                !errorMsg.includes("Login Failed") &&
                !errorMsg.includes("You are not authorized")) {
                console.error(err)
            }

            if (errorMsg.includes("You are not authorized for this module")) {
                errorMsg = "You are not authorized for this module.";
            } else if (errorMsg.includes("API 401")) {
                errorMsg = "Invalid User Credentials. Please check details.";
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
                    <CardTitle>User Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Company</Label>
                            <Input value={companyName} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>

                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
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