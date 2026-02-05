# Interakt Integration Requirements

## 1. Core Philosophy: CRM-Centric User Management
*   **Source of Truth**: All Users (Clients/Leads) and CRM Users (Staff/Agents) are created, managed, and stored in the **CRM Backend** (SQL Server).
*   **No Explicit User Sync**: We do **not** need to explicitly "sync" or create users in Interakt's dashboard via API as a prerequisite. 
*   **Flow**: The CRM uses the Interakt API solely as a **messaging channel**. When a message/drip is sent to a Client, Interakt handles the delivery based on the phone number provided by the CRM Backend.

---

## 2. Message Master (`/dashboard/message-master`)

### Goal
Manage WhatsApp Templates to ensure they are available for campaigns and drips.

### Key Features
1.  **Template Creation & Management**:
    *   **Create Template**: Users can create new template records in the CRM.
    *   **Sync from Interakt**: Users can click "Sync Templates" to automatically fetch all approved templates from Interakt and populate the CRM list.
2.  **Approval Status**:
    *   Display the **Approval Status** (e.g., *Approved, Pending, Rejected*) for each template.
    *   This status must be visible in the list view so users know which templates are ready for use.
3.  **API Key Management**:
    *   The Interakt API Key is managed securely via the frontend ("Settings" button) and stored in the `MasterData` table. It is **never** hardcoded.

---

## 3. Drip Master (`/dashboard/drip-sequence`)

### Goal
Automate client engagement by creating and assigning message sequences.

### Key Features
1.  **Drip Creation**:
    *   Users can create a **Drip Sequence** (e.g., "Welcome Series").
    *   Users can define **Steps** for the drip (e.g., "Step 1: Send 'Welcome' template immediately", "Step 2: Send 'Follow-up' template after 2 days").
2.  **Assign to Clients**:
    *   Users can assign a Drip Sequence to specific **Clients** (Leads) from the CRM.
    *   Once assigned, the backend automatically manages the schedule and sends messages via Interakt at the correct times.
3.  **View Drips**:
    *   A dashboard view to see all available Drip Sequences.
    *   Ability to view active assignments (which clients are currently in a drip).

---

## 4. Technical Implementation Notes
*   **Backend**: `IndusWebApi` handles all logic.
*   **Database**: 
    *   `Clients` / `Users`: Existing CRM tables.
    *   `MessageMaster`: Stores template metadata.
    *   `DripSequence` / `DripSequenceSteps`: Stores drip definitions.
    *   `LeadDripAssignment`: Tracks which client is on which step of a drip.
*   **Authentication**: All Interakt calls use the Dynamic API Key stored in `MasterData`.
