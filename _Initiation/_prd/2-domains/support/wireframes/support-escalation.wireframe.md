# Support Escalation Management Wireframe

**Story IDs:** DOM-SUP-002a, DOM-SUP-002b
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Escalation rules schema | NOT CREATED |
| **Server Functions Required** | Escalation trigger, notification functions | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-002a, DOM-SUP-002b | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Support Types**: Battery performance issues, inverter errors, installation problems, connectivity issues
- **Priority**: low, normal, high, urgent

---

## Overview

Escalation management provides tools for manually and automatically escalating critical issues. This wireframe covers:
- Manual escalation with reason tracking
- Escalation history in issue timeline
- De-escalation workflow
- Automatic escalation rules configuration
- Manager notifications

---

## UI Patterns (Reference Implementation)

### Escalation Status Banner
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Warning-level alert with orange-500 accent for escalated issues
  - Left border accent (4px solid orange-500)
  - Exclamation icon prefix ([!!!])
  - Action buttons for viewing history and de-escalating
  - ARIA live region for screen reader announcements

### Escalate Issue Dialog
- **Pattern**: RE-UI Dialog + Form + Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/textarea.tsx`, `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Modal dialog with focus trap
  - Required escalation reason textarea
  - Radio group for escalation category selection
  - Assignee select dropdown (teams/users)
  - Checkbox group for additional notifications
  - Form validation before enabling submit

### De-escalate Issue Dialog
- **Pattern**: RE-UI Dialog + Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Shows original escalation context (by whom, when, reason)
  - Required de-escalation reason textarea
  - Status dropdown for post-de-escalation state
  - Checkbox for returning to original assignee
  - Confirmation workflow

### Escalation Rules Settings
- **Pattern**: RE-UI Card + Switch + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/switch.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Card-based rule display with active/disabled states
  - Active/Disabled toggle switch
  - Badge for rule status (Active in green, Disabled in gray)
  - Last triggered timestamp and issue reference
  - Edit, Disable, and Delete action buttons

### Add/Edit Escalation Rule Dialog
- **Pattern**: RE-UI Dialog + Form + Multi-Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Dynamic condition builder (field + operator + value)
  - Add/remove condition buttons
  - Checkbox group for escalation actions
  - Nested configuration for action details (assignee, notifications)
  - Active/Inactive toggle switch

### Escalation Timeline Entry
- **Pattern**: RE-UI Custom Timeline Component
- **Reference**: Build on `_reference/.reui-reference/registry/default/ui/card.tsx` for activity cards
- **Features**:
  - Warning-colored icon prefix ([!!!])
  - Timestamp and actor display
  - Escalation reason and category
  - Assignee change indicator (old -> new)
  - Notification recipients list
  - Accessible as ARIA article with semantic labels

---

## Desktop View (1280px+)

### Issue Detail - Escalation Actions

```
+================================================================================+
| < Back to Issues                                                                |
+================================================================================+
| +----------------------------------------------------------------------------+ |
| | [!!!] ISS-1234: Inverter fault code E-12 - critical system error           | |
| |       ===                                                                  | |
| |       ESCALATED                                                            | |
| |                                                                            | |
| |     Customer: Brisbane Solar Co |  Type: Hardware fault  |  Priority: High | |
| |     Assignee: John Doe          |  Status: Escalated  |  Created: Jan 9    | |
| |                                                                            | |
| |     [ Edit Issue ]  [ Assign ]  [ Change Status v ]  [ Actions v ]         | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
|                                                                                 |
| +-- ESCALATION STATUS (role="alert" aria-live="polite") ---------------------+ |
| |                                                                             | |
| |  +== ESCALATED ISSUE ===================================================+  | |
| |  |                                                                       |  | |
| |  |  [!!!] This issue has been escalated                                  |  | |
| |  |                                                                       |  | |
| |  |  Escalated By: Sarah Manager                                          |  | |
| |  |  Escalated At: Jan 10, 2026, 3:45 PM (2 hours ago)                     |  | |
| |  |  Reason: VIP customer - needs priority handling                        |  | |
| |  |                                                                       |  | |
| |  |  Original Assignee: John Doe -> New Assignee: Senior Support Team     |  | |
| |  |                                                                       |  | |
| |  |  [ View Escalation History ]  [ De-escalate Issue ]                   |  | |
| |  |                                                                       |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [Overview] [Activity] [Attachments] [Related]                                   |
|                       =========                                                 |
|                                                                                 |
| +-- ACTIVITY TIMELINE (includes escalation history) --------------------------+ |
| |                                                                             | |
| |  TODAY                                                                      | |
| |  -------                                                                    | |
| |  +-----------------------------------------------------------------------+  | |
| |  | [!!!] ESCALATED                                              3:45 PM |  | |
| |  |                                                                       |  | |
| |  |  Sarah Manager escalated this issue                                   |  | |
| |  |  Reason: VIP customer - needs priority handling                        |  | |
| |  |  Assignee changed from John Doe to Senior Support Team                |  | |
| |  |  Notification sent to: Operations Manager, Support Lead               |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| |  +-----------------------------------------------------------------------+  | |
| |  | [note] Comment                                               2:30 PM |  | |
| |  |                                                                       |  | |
| |  |  John Doe: "Customer is getting frustrated. We need a faster         |  | |
| |  |  resolution. Recommending escalation."                               |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| |  YESTERDAY                                                                  | |
| |  ---------                                                                  | |
| |  +-----------------------------------------------------------------------+  | |
| |  | [+] Issue Created                                            5:00 PM |  | |
| |  |                                                                       |  | |
| |  |  Issue created by John Doe                                            |  | |
| |  |  Type: Claim  |  Priority: Medium                                     |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Escalate Issue Dialog

```
+================================================================+
| Escalate Issue                                            [X]  |
+================================================================+
|                                                                |
|  [!!!] You are about to escalate ISS-1234                      |
|                                                                |
|  Escalating an issue will:                                     |
|  - Mark it as high priority                                    |
|  - Notify managers and senior support                          |
|  - Add to escalated issues queue                               |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Escalation Reason *                                           |
|  +----------------------------------------------------------+  |
|  | VIP customer, response time exceeded...                   |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Reason Category *                                             |
|  +----------------------------------------------------------+  |
|  | ( ) SLA breach imminent                                   |  |
|  | (o) VIP/Priority customer                                 |  |
|  | ( ) Complex technical issue                               |  |
|  | ( ) Customer satisfaction at risk                         |  |
|  | ( ) Repeated issue / Pattern                              |  |
|  | ( ) Other                                                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Reassign To                                                   |
|  +---------------------------------------------- v-----------+  |
|  | Senior Support Team                                       |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Notify Additional People                                      |
|  +----------------------------------------------------------+  |
|  | [x] Operations Manager                                    |  |
|  | [x] Support Lead                                          |  |
|  | [ ] Sales Rep (Account Owner)                             |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Additional Notes (optional)                                   |
|  +----------------------------------------------------------+  |
|  | Customer has threatened to cancel their contract if this |  |
|  | isn't resolved by end of day.                            |  |
|  +----------------------------------------------------------+  |
|                                                                |
|                        ( Cancel )  [ Escalate Issue ]          |
+================================================================+
  Focus trap active
  Escalate button enabled only when reason provided
  aria-labelledby="escalate-dialog-title"
```

### De-escalate Issue Dialog

```
+================================================================+
| De-escalate Issue                                         [X]  |
+================================================================+
|                                                                |
|  Remove the escalation status from ISS-1234                    |
|                                                                |
|  Original escalation:                                          |
|  - By: Sarah Manager                                           |
|  - When: Jan 10, 2026, 3:45 PM                                 |
|  - Reason: VIP customer - needs priority handling              |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  De-escalation Reason *                                        |
|  +----------------------------------------------------------+  |
|  | Issue has been resolved, customer is satisfied...         |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Status After De-escalation *                                  |
|  +---------------------------------------------- v-----------+  |
|  | In Progress                                               |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Return to Original Assignee?                                  |
|  [x] Yes, reassign to: John Doe                               |
|                                                                |
|                      ( Cancel )  [ De-escalate ]               |
+================================================================+
```

### Escalation Rules Settings (Admin)

```
+================================================================================+
| Settings > Support > Escalation Rules                                           |
+================================================================================+
|                                                                                 |
| Escalation Rules                                           [ + Add Rule ]       |
| Configure automatic escalation triggers                                         |
|                                                                                 |
| +-----------------------------------------------------------------------------+ |
| | ACTIVE RULES                                                                | |
| +-----------------------------------------------------------------------------+ |
| |                                                                             | |
| |  +== Rule 1: VIP Customer Auto-Escalation =================================+| |
| |  |                                                                         || |
| |  |  Trigger: When customer has "VIP" tag AND issue priority is "High"      || |
| |  |  Action: Escalate immediately and notify Senior Support Team            || |
| |  |  Last Triggered: 3 hours ago (ISS-1234)                                 || |
| |  |                                                                         || |
| |  |  Status: [====*] Active                [ Edit ]  [ Disable ]            || |
| |  |                                                                         || |
| |  +=========================================================================+| |
| |                                                                             | |
| |  +== Rule 2: Unresponded 24-Hour Escalation ===============================+| |
| |  |                                                                         || |
| |  |  Trigger: When issue is unresponded for > 24 hours                      || |
| |  |  Action: Escalate and notify Support Lead                               || |
| |  |  Last Triggered: Yesterday (ISS-1198)                                   || |
| |  |                                                                         || |
| |  |  Status: [====*] Active                [ Edit ]  [ Disable ]            || |
| |  |                                                                         || |
| |  +=========================================================================+| |
| |                                                                             | |
| |  +== Rule 3: SLA Breach Warning ==========================================+| |
| |  |                                                                         || |
| |  |  Trigger: When SLA has < 1 hour remaining                               || |
| |  |  Action: Send warning notification to assignee and manager              || |
| |  |  Last Triggered: 1 hour ago (ISS-1230)                                  || |
| |  |                                                                         || |
| |  |  Status: [====*] Active                [ Edit ]  [ Disable ]            || |
| |  |                                                                         || |
| |  +=========================================================================+| |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-----------------------------------------------------------------------------+ |
| | DISABLED RULES                                                              | |
| +-----------------------------------------------------------------------------+ |
| |                                                                             | |
| |  +-- Rule 4: After-Hours Escalation (Disabled) ----------------------------+| |
| |  |  Trigger: Any high priority issue created after 6 PM                    || |
| |  |  [ Edit ]  [ Enable ]  [ Delete ]                                       || |
| |  +-------------------------------------------------------------------------+| |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Add/Edit Escalation Rule Dialog

```
+================================================================+
| Add Escalation Rule                                       [X]  |
+================================================================+
|                                                                |
|  Rule Name *                                                   |
|  +----------------------------------------------------------+  |
|  | VIP Customer Auto-Escalation                              |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  ----------------------------------------------------------    |
|  TRIGGER CONDITIONS                                            |
|  ----------------------------------------------------------    |
|                                                                |
|  When ALL of these conditions are met:                         |
|                                                                |
|  +----------------------------------------------------------+  |
|  | Condition 1                                               |  |
|  |                                                           |  |
|  | [ Customer Tag       v] [ equals      v] [ VIP         v]|  |
|  |                                               [Remove]   |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +----------------------------------------------------------+  |
|  | Condition 2                                               |  |
|  |                                                           |  |
|  | [ Issue Priority     v] [ is one of   v] [ High, Urgent ]|  |
|  |                                               [Remove]   |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [ + Add Condition ]                                           |
|                                                                |
|  ----------------------------------------------------------    |
|  ACTIONS                                                       |
|  ----------------------------------------------------------    |
|                                                                |
|  [x] Escalate issue                                            |
|      Assign to: [ Senior Support Team          v]              |
|                                                                |
|  [x] Send notification                                         |
|      To: [ ] Support Lead                                      |
|          [x] Account Owner                                     |
|          [ ] Operations Manager                                |
|                                                                |
|  [ ] Change priority to: [ Urgent                 v]           |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Status: [====*] Active                                        |
|                                                                |
|                          ( Cancel )  [ Save Rule ]             |
+================================================================+
```

---

## Tablet View (768px)

### Escalated Issue Banner

```
+================================================================+
| < Back  |  ISS-1234                           [Edit] [More v]  |
+================================================================+
|                                                                 |
|  +------------------------------------------------------------+|
|  | [!!!] ESCALATED                                             ||
|  | By: Sarah Manager  |  2 hours ago                           ||
|  | Reason: VIP customer - needs priority handling              ||
|  |                                                             ||
|  | [ View History ]  [ De-escalate ]                           ||
|  +------------------------------------------------------------+|
|                                                                 |
|  Defective product - handle replacement                        |
|  Customer: Acme Corp  |  Type: Claim  |  Priority: High        |
|                                                                 |
+================================================================+
```

### Escalation Timeline (Tablet)

```
+================================================================+
| [Overview] [Activity] [Attachments] [Related]                   |
|             =========                                           |
+================================================================+
|                                                                 |
|  TODAY                                                          |
|  +------------------------------------------------------------+|
|  | [!!!] ESCALATED                                    3:45 PM ||
|  |                                                             ||
|  | Sarah Manager escalated this issue                          ||
|  | Reason: VIP customer                                        ||
|  | Assigned to: Senior Support Team                            ||
|  +------------------------------------------------------------+|
|                                                                 |
|  +------------------------------------------------------------+|
|  | [note] Comment                                     2:30 PM ||
|  | John Doe: "Customer is getting frustrated..."               ||
|  +------------------------------------------------------------+|
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### Escalated Issue Header

```
+================================+
| < Back          ISS-1234       |
+================================+
|                                |
| +----------------------------+ |
| | [!!!] ESCALATED            | |
| |                            | |
| | VIP customer - priority    | |
| | By Sarah M. - 2h ago       | |
| |                            | |
| | [History] [De-escalate]    | |
| +----------------------------+ |
|                                |
| Defective product              |
| handle replacement needed      |
|                                |
| Acme Corp  |  Claim  |  High   |
| Senior Support  |  Escalated   |
|                                |
| [Edit] [Status v] [More v]     |
|                                |
+================================+
```

### Escalate Bottom Sheet (Mobile)

```
+================================+
| ============================== | <- Drag handle
|                                |
| ESCALATE ISSUE            [X]  |
| =============================== |
|                                |
| Escalating will notify         |
| managers and senior support.   |
|                                |
| Reason *                       |
| +----------------------------+ |
| | VIP customer, needs...     | |
| +----------------------------+ |
|                                |
| Category *                     |
| +----------------------------+ |
| | ( ) SLA breach imminent    | |
| | (o) VIP/Priority customer  | |
| | ( ) Complex technical      | |
| | ( ) Customer satisfaction  | |
| | ( ) Repeated issue         | |
| | ( ) Other                  | |
| +----------------------------+ |
|                                |
| Reassign To                    |
| +----------------------------+ |
| | Senior Support Team     v  | |
| +----------------------------+ |
|                                |
| Notify                         |
| [x] Operations Manager         |
| [x] Support Lead               |
|                                |
| +----------------------------+ |
| |                            | |
| |    [ Escalate Issue ]      | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Escalation Activity Entry (Mobile)

```
+================================+
|                                |
| TODAY                          |
|                                |
| +----------------------------+ |
| | [!!!]                      | |
| | ESCALATED                  | |
| |                     3:45PM | |
| |                            | |
| | Sarah Manager escalated    | |
| |                            | |
| | Reason:                    | |
| | VIP customer - needs       | |
| | priority handling          | |
| |                            | |
| | +------------------------+ | |
| | | John Doe               | | |
| | |     v                  | | |
| | | Senior Support Team    | | |
| | +------------------------+ | |
| |                            | |
| | Notified:                  | |
| | Ops Manager, Support Lead  | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Escalation Badge States

```
+-- NOT ESCALATED (Default) ----------------------+
|  No special badge shown                         |
|  Issue title displayed normally                 |
+-------------------------------------------------+

+-- ESCALATED (Active) ---------------------------+
|  [!!!] Prefix on issue title                    |
|  Background: orange-50 (subtle)                 |
|  Border-left: 4px solid orange-500              |
|  Badge: Orange "ESCALATED" label                |
|  Icon: exclamation-mark-triangle (orange-600)   |
+-------------------------------------------------+

+-- RECENTLY DE-ESCALATED ------------------------+
|  [~] Prefix for 24 hours after de-escalation    |
|  Background: gray-50                            |
|  Badge: Gray "Was Escalated" label              |
+-------------------------------------------------+
```

---

## Loading States

### Escalation Section Loading

```
+-- ESCALATION STATUS (Loading) ----------------------------------------+
|                                                                       |
|  +== ESCALATED ISSUE ===============================================+|
|  |                                                                   ||
|  |  [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]    ||
|  |  [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~]                               ||
|  |  [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]         ||
|  |                                                                   ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

### Escalate Dialog Submitting

```
+================================================================+
| Escalating Issue...                                       [X]  |
+================================================================+
|                                                                |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |     [spinner]  Escalating ISS-1234...                    |  |
|  |                                                          |  |
|  |     - Updating issue status                              |  |
|  |     - Notifying managers                                 |  |
|  |     - Reassigning to Senior Support                      |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [ Cancel ]                                                    |
|                                                                |
+================================================================+
  All form fields disabled
  Cancel still available
```

---

## Empty States

### No Escalation History

```
+-- ESCALATION HISTORY ------------------------------------------------+
|                                                                       |
|                    [illustration]                                     |
|                                                                       |
|              No escalation history                                    |
|                                                                       |
|    This issue has never been escalated.                               |
|                                                                       |
+-----------------------------------------------------------------------+
```

### No Escalation Rules

```
+===============================================================+
|                                                               |
| ESCALATION RULES                            [ + Add Rule ]    |
|                                                               |
+===============================================================+
|                                                               |
|                    [illustration]                             |
|                                                               |
|           No escalation rules configured                      |
|                                                               |
|    Create rules to automatically escalate issues              |
|    based on time, customer type, or priority.                 |
|                                                               |
|    [ + Create First Rule ]                                    |
|                                                               |
+===============================================================+
```

---

## Error States

### Failed to Escalate

```
+================================================================+
| [!] Escalation Failed                                          |
+================================================================+
|                                                                |
|  Could not escalate ISS-1234.                                  |
|                                                                |
|  Error: Unable to notify Senior Support Team.                  |
|  The assignee may not have been updated.                       |
|                                                                |
|  [ Dismiss ]  [ Try Again ]                                    |
|                                                                |
+================================================================+
  Toast or inline error
  role="alert"
  aria-live="assertive"
```

### Rule Save Failed

```
+================================================================+
| [!] Failed to Save Rule                                        |
+================================================================+
|                                                                |
|  Could not save the escalation rule.                           |
|  Please check the conditions and try again.                    |
|                                                                |
|  Error: Invalid condition combination.                         |
|                                                                |
|  [ Dismiss ]  [ Try Again ]                                    |
|                                                                |
+================================================================+
```

---

## Success States

### Escalation Success

```
+================================================================+
| [success] Issue Escalated                              [Undo]  |
|                                                                |
| ISS-1234 has been escalated. Notifications sent to:            |
| Operations Manager, Support Lead                               |
|                                                                |
+================================================================+
  Toast notification
  5-second Undo battery
  aria-live="polite"
```

### De-escalation Success

```
+================================================================+
| [success] Issue De-escalated                                   |
|                                                                |
| ISS-1234 has been de-escalated and returned to John Doe.       |
|                                                                |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Escalated Issue Banner
<section
  role="alert"
  aria-label="Escalation status for issue ISS-1234"
  className="escalation-banner"
>
  <div aria-live="polite">
    This issue has been escalated by Sarah Manager.
    Reason: VIP customer - needs priority handling.
  </div>
</section>

// Escalate Dialog
<dialog
  role="dialog"
  aria-labelledby="escalate-dialog-title"
  aria-describedby="escalate-dialog-description"
  aria-modal="true"
>
  <h2 id="escalate-dialog-title">Escalate Issue</h2>
  <p id="escalate-dialog-description">
    Escalating will mark this issue as high priority and notify managers.
  </p>
  <!-- Form fields -->
</dialog>

// Escalation Timeline Entry
<article
  role="article"
  aria-label="Escalation event on January 10th at 3:45 PM"
>
  <header>
    <span aria-hidden="true">[!!!]</span>
    <h4>Issue Escalated</h4>
    <time datetime="2026-01-10T15:45:00">3:45 PM</time>
  </header>
  <p>Sarah Manager escalated this issue. Reason: VIP customer.</p>
</article>

// Escalation Rules List
<div role="list" aria-label="Escalation rules">
  <article role="listitem" aria-label="Rule: VIP Customer Auto-Escalation, Active">
    <!-- Rule content -->
  </article>
</div>
```

### Keyboard Navigation

```
Issue Detail (Escalated Issue):
1. Tab to escalation banner
2. Tab to "View History" button
3. Tab to "De-escalate" button
4. Tab to navigation tabs
5. Tab to timeline entries

Escalate Dialog:
1. Focus moves to dialog on open
2. Tab through: Reason field -> Category options -> Assignee select
3. Tab to notification checkboxes
4. Tab to Notes field
5. Tab to Cancel -> Escalate buttons
6. Escape closes dialog
7. Focus returns to trigger button

Rules Settings:
1. Tab to "Add Rule" button
2. Tab to each rule card
3. Enter on rule: opens edit modal
4. Tab to Edit -> Disable/Enable buttons within card
```

### Screen Reader Announcements

```
On escalation:
  "Issue ISS-1234 has been escalated. Assigned to Senior Support Team.
   Notifications sent to Operations Manager and Support Lead."

On de-escalation:
  "Issue ISS-1234 has been de-escalated and returned to John Doe.
   Status changed to In Progress."

On automatic escalation:
  "Alert: Issue ISS-1256 has been automatically escalated due to rule:
   VIP Customer Auto-Escalation."

On entering escalated issue:
  "Issue ISS-1234, Defective product. This issue is currently escalated.
   Escalated by Sarah Manager 2 hours ago. Reason: VIP customer."
```

---

## Animation Choreography

### Escalation Banner Entry

```
FRAME 1 (0ms):
  Banner height: 0
  Opacity: 0

FRAME 2 (150ms):
  Banner height: auto
  Opacity: 0.5
  Slide down effect

FRAME 3 (300ms):
  Full height
  Opacity: 1
  Icon pulses once

Duration: 300ms
Easing: ease-out
```

### Escalate Button Press

```
On Click:
  Button scales to 0.95
  Background darkens
  Icon rotates 15deg

On Success:
  Green checkmark replaces content (150ms)
  Button expands briefly (scale 1.05)
  Returns to normal

Duration: 500ms total
Haptic: medium (mobile)
```

### Timeline Entry Addition

```
New Entry Animation:

FRAME 1: Entry off-screen above timeline
FRAME 2: Slides down into position
FRAME 3: Fades in fully
FRAME 4: Subtle highlight pulse

Duration: 350ms
Easing: spring(1, 80, 10)
```

---

## Component Props Interface

```typescript
// Escalation Status Banner
interface EscalationBannerProps {
  isEscalated: boolean;
  escalatedBy?: {
    id: string;
    name: string;
  };
  escalatedAt?: Date;
  reason?: string;
  category?: EscalationCategory;
  onViewHistory?: () => void;
  onDeEscalate?: () => void;
  isLoading?: boolean;
}

type EscalationCategory =
  | 'sla_breach'
  | 'vip_customer'
  | 'complex_technical'
  | 'customer_satisfaction'
  | 'repeated_issue'
  | 'other';

// Escalate Issue Dialog
interface EscalateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueSummary: string;
  onEscalate: (data: EscalateIssueData) => Promise<void>;
  assignees: Array<{ id: string; name: string; type: 'user' | 'team' }>;
  notifyOptions: Array<{ id: string; name: string; role: string }>;
  isSubmitting?: boolean;
}

interface EscalateIssueData {
  reason: string;
  category: EscalationCategory;
  assignToId?: string;
  notifyUserIds: string[];
  additionalNotes?: string;
}

// De-escalate Issue Dialog
interface DeEscalateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  originalEscalation: {
    by: string;
    at: Date;
    reason: string;
  };
  onDeEscalate: (data: DeEscalateIssueData) => Promise<void>;
  originalAssignee?: { id: string; name: string };
  statusOptions: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
}

interface DeEscalateIssueData {
  reason: string;
  newStatus: string;
  returnToOriginalAssignee: boolean;
}

// Escalation Timeline Entry
interface EscalationActivityProps {
  type: 'escalated' | 'de_escalated' | 'auto_escalated';
  actor: { id: string; name: string } | 'system';
  timestamp: Date;
  reason: string;
  category?: EscalationCategory;
  previousAssignee?: string;
  newAssignee?: string;
  notifiedUsers?: string[];
  ruleName?: string; // For auto-escalation
}

// Escalation Rule
interface EscalationRuleProps {
  id: string;
  name: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  isActive: boolean;
  lastTriggered?: {
    at: Date;
    issueId: string;
  };
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete?: () => void;
}

interface EscalationCondition {
  field: 'customer_tag' | 'priority' | 'type' | 'age_hours' | 'sla_remaining';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_one_of';
  value: string | string[] | number;
}

interface EscalationAction {
  type: 'escalate' | 'notify' | 'change_priority' | 'assign';
  config: {
    assignToId?: string;
    notifyUserIds?: string[];
    newPriority?: string;
  };
}

// Escalation Rules List
interface EscalationRulesListProps {
  rules: EscalationRuleProps[];
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, active: boolean) => void;
  onDeleteRule: (ruleId: string) => void;
  isLoading?: boolean;
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Escalation banner render | < 100ms | From data load to display |
| Escalate action | < 2s | From submit to success confirmation |
| De-escalate action | < 1s | From submit to success |
| Rule evaluation | < 100ms | Per rule per issue |
| Rules list load | < 500ms | Settings page |

---

## Related Wireframes

- [Support Dashboard](./support-dashboard.wireframe.md) - Escalated issues widget
- [Issue Detail](./support-issue-detail.wireframe.md) - Full issue view
- [SLA Tracking](./support-sla-tracking.wireframe.md) - SLA integration with escalation

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
