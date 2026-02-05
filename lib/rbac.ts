// frontend/lib/rbac.ts

// --- We use the types imported from api.ts for consistency ---
import { ApiUser, ApiLead, ApiMeeting } from "./api";


export function filterLeadsByRole(leads: ApiLead[], user: ApiUser): ApiLead[] {
  // Check against the role from your backend, e.g., "Administrator"
  if (user.role === "Administrator") {
    return leads;
  }

  // --- THIS IS THE CORRECTED LINE ---
  // We filter based on the individual `lead` object's `assigned_to` property
  // and compare it to the user's `username`, as defined by the backend logic.
  return leads.filter((lead) => lead.assigned_to === user.username);
  // --- END CORRECTION ---
}

// --- CORRECTED: Updated to use ApiMeeting and ApiUser types ---
export function filterMeetingsByRole(meetings: ApiMeeting[], user: ApiUser): ApiMeeting[] {
  if (user.role === "Administrator") {
    return meetings;
  }

  // Company users only see meetings assigned to them by username
  return meetings.filter((meeting) => meeting.assigned_to === user.username);
}
// --- END CORRECTION ---

// --- CORRECTED: Updated to use the ApiUser type ---
export function canViewAllData(user: ApiUser): boolean {
  return user.role === "Administrator";
}
// --- END CORRECTION ---

// --- CORRECTED: Updated to use the ApiUser type ---
export function canManageAllLeads(user: ApiUser): boolean {
  return user.role === "Administrator";
}
// --- END CORRECTION ---

// --- CORRECTED: Updated to use the ApiUser type ---
export function canAssignToOthers(user: ApiUser): boolean {
  return user.role === "Administrator";
}
// --- END CORRECTION ---