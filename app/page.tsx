// frontend/app/page.tsx
import { redirect } from "next/navigation"

export default function HomePage() {
  // For now, redirect to login - we'll implement proper auth later
  redirect("/login")
}
