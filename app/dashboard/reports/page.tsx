//frontend/app/dashboard/reports/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ReportsIndexPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Sales Person Report by default
    router.replace("/dashboard/reports/sales")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to reports...</p>
    </div>
  )
}
