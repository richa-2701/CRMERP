"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AlertCircle, CheckCircle, User, Lock, Eye, EyeOff } from "lucide-react"

interface UserData {
  id: string
  username: string
  email: string
  role: "admin" | "user" | "Administrator" | "Company User"
  phone?: string
  usernumber?: string
  department?: string
  createdAt?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setFormData({
      name: parsedUser.username || "",
      email: parsedUser.email || "",
      phone: parsedUser.usernumber || "",
      department: parsedUser.department || "",
    })
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedUser: UserData = {
        id: user!.id,
        username: formData.name,
        email: formData.email,
        role: user!.role,
        phone: user!.phone,
        usernumber: formData.phone || user!.usernumber,
        department: formData.department,
        createdAt: user!.createdAt,
      }

      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      setIsEditing(false)
      setSuccess("Profile updated successfully!")
    } catch (err) {
      setError("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      setIsLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user?.username,
          old_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.status === "success") {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setIsChangingPassword(false)
        setSuccess("Password changed successfully!")
      } else {
        setError(data.message || "Failed to change password. Please check your current password.")
      }
    } catch (err) {
      setError("Failed to change password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-2 md:space-y-4 px-3 sm:px-4 md:px-0">
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200 py-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs sm:text-sm">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2 md:gap-4 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-1.5 text-sm sm:text-base md:text-lg">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14">
                <AvatarFallback className="text-sm sm:text-base">{(user.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold truncate">{user.username}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{user.email}</p>
                <Badge
                  variant={user.role === "admin" || user.role === "Administrator" ? "default" : "secondary"}
                  className="mt-0.5 text-[10px] px-1.5 py-0"
                >
                  {user.role === "admin" || user.role === "Administrator" ? "Administrator" : "Company User"}
                </Badge>
              </div>
            </div>

            <Separator className="my-2" />

            {!isEditing ? (
              <div className="space-y-2 md:space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <div>
                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Name</Label>
                    <p className="text-xs sm:text-sm mt-0.5">{user.username}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Email</Label>
                    <p className="text-xs sm:text-sm mt-0.5 truncate">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Phone</Label>
                    <p className="text-xs sm:text-sm mt-0.5">{user.usernumber || user.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Department</Label>
                    <p className="text-xs sm:text-sm mt-0.5">{user.department || "Not provided"}</p>
                  </div>
                </div>
                <Button onClick={() => setIsEditing(true)} className="w-full h-8 text-xs sm:text-sm">
                  Edit Profile
                </Button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-2 md:space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-[10px] sm:text-xs">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-8 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-[10px] sm:text-xs">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-8 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-[10px] sm:text-xs">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-8 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="department" className="text-[10px] sm:text-xs">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="h-8 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <Button type="submit" disabled={isLoading} className="h-8 text-xs sm:text-sm sm:flex-1">
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-8 text-xs sm:text-sm sm:flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-1.5 text-sm sm:text-base md:text-lg">
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isChangingPassword ? (
              <div className="space-y-2 md:space-y-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Keep your account secure by using a strong password and changing it regularly.
                </p>
                <Button onClick={() => setIsChangingPassword(true)} className="w-full h-8 text-xs sm:text-sm">
                  Change Password
                </Button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-2 md:space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="currentPassword" className="text-[10px] sm:text-xs">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      className="pr-9 h-8 text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 px-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("current")}
                    >
                      {showPasswords.current ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-[10px] sm:text-xs">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      className="pr-9 h-8 text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 px-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPasswords.new ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-[10px] sm:text-xs">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      className="pr-9 h-8 text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 px-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("confirm")}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <Button type="submit" disabled={isLoading} className="h-8 text-xs sm:text-sm sm:flex-1">
                    {isLoading ? "Changing..." : "Change Password"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)} className="h-8 text-xs sm:text-sm sm:flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
