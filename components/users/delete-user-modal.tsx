// frontend/components/users/delete-user-modal.tsx
"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, AlertCircle } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  department?: string
  createdAt?: string
  company_name: string;
}

interface DeleteUserModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  // --- START OF FIX: Change the prop to expect the user's email ---
  onUserDeleted: (userEmail: string) => Promise<void>
  // --- END OF FIX ---
}

export function DeleteUserModal({ user, isOpen, onClose, onUserDeleted }: DeleteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      // --- START OF FIX: Pass the user's email to the parent's handler function ---
      await onUserDeleted(user.email)
      // --- END OF FIX ---
      
      onClose() // Close the modal on success
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete user. Please try again."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action will mark the user as inactive. It can be recovered later from the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">User to be deleted:</h4>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Name:</strong> {user.name}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Role:</strong> {user.role === 'admin' ? 'Admin' : 'User'}
              </p>
              {user.department && (
                <p>
                  <strong>Department:</strong> {user.department}
                </p>
              )}
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Are you sure you want to delete this user?
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}