# Wireframe: DOM-USER-003c - Delegation UI

## Story Reference

- **Story ID**: DOM-USER-003c
- **Name**: Delegation UI
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Form section in Settings with Alert banner

## Overview

UI for setting up and viewing delegations (out of office). Includes delegation form in user settings, delegate user picker, date range selector, delegation indicator badge on user profile, and active delegation alert banner on dashboard. Allows users to delegate their tasks/notifications to another team member during absences.

## UI Patterns (Reference Implementation)

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Delegation setup form with validation
  - Date range picker integration
  - Reason textarea with character limit
  - Delegated items checkbox group

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Delegate user selector with search
  - Avatar and role display in dropdown options
  - Validation for selecting available delegates

### Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Active delegation banner on dashboard
  - "You're covering for X" alert for delegates
  - Warning variant for delegation status
  - Action buttons for ending delegation early

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - "Away: Jan 15-22" badge on user profile
  - Delegation status indicator
  - Tooltip showing full delegation details

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `userDelegations` | NOT CREATED |
| **Server Functions Required** | `createDelegation`, `updateDelegation`, `cancelDelegation`, `getDelegations`, `getActiveDelegation` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-USER-003a, DOM-USER-003b | PENDING |

### Existing Schema Available
- `users` in `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- Delegation allows sales reps and installers to hand off responsibilities during leave periods
- Critical for ensuring customer follow-ups are not missed during team absences
- Supports Australian leave patterns (annual leave, sick leave, public holidays)

---

## Mobile Wireframe (375px)

### User Settings - Delegation Section (Mobile)

```
+----------------------------------------+
| <- Settings                            |
+----------------------------------------+
| My Profile                             |
+----------------------------------------+
| [Profile] [Notifications] [Delegation] |
|                           ^^^^^^^^^^^  |
+----------------------------------------+
|                                        |
| Delegation Settings                    |
| --------------------------------       |
|                                        |
| Set up a delegate to handle your       |
| tasks and notifications while          |
| you're away.                           |
|                                        |
| +------------------------------------+ |
| | Current Status                     | |
| | No active delegation               | |
| +------------------------------------+ |
|                                        |
| --------------------------------       |
|                                        |
| Set Up Delegation                      |
|                                        |
| Delegate To *                          |
| +----------------------------------v + |
| | Select a team member...            | |
| +------------------------------------+ |
|                                        |
| Start Date *                           |
| +------------------------------------+ |
| | Jan 15, 2026                    [c]| |
| +------------------------------------+ |
|                                        |
| End Date *                             |
| +------------------------------------+ |
| | Jan 22, 2026                    [c]| |
| +------------------------------------+ |
|                                        |
| Reason                                 |
| +------------------------------------+ |
| | Annual leave - vacation trip       | |
| |                                    | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| |      [Set Up Delegation]           | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
```

### Active Delegation View (Mobile)

```
+----------------------------------------+
| <- Settings                            |
+----------------------------------------+
| My Profile                             |
+----------------------------------------+
| [Profile] [Notifications] [Delegation] |
|                           ^^^^^^^^^^^  |
+----------------------------------------+
|                                        |
| Delegation Settings                    |
| --------------------------------       |
|                                        |
| +------------------------------------+ |
| | [!] Active Delegation              | |
| |                                    | |
| | You have delegated to:             | |
| | [Avatar] Sarah Johnson             | |
| |                                    | |
| | Period:                            | |
| | Jan 15 - Jan 22, 2026 (7 days)     | |
| |                                    | |
| | Reason:                            | |
| | Annual leave - vacation trip       | |
| |                                    | |
| | [Edit Delegation] [Cancel]         | |
| +------------------------------------+ |
|                                        |
| --------------------------------       |
|                                        |
| Delegation History                     |
|                                        |
| +------------------------------------+ |
| | Dec 20-27, 2025                    | |
| | Delegate: Mike Chen                | |
| | Reason: Holiday break              | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | Nov 5-8, 2025                      | |
| | Delegate: Emily Davis              | |
| | Reason: Conference attendance      | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
```

### Delegate User Picker (Mobile)

```
+----------------------------------------+
| Select Delegate                  [X]   |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [Search team members...         ]  | |
| +------------------------------------+ |
|                                        |
| Available Delegates:                   |
|                                        |
| +------------------------------------+ |
| | [Avatar] Sarah Johnson             | |
| | sarah@company.com                  | |
| | Sales Manager                      | |
| |                              [>]   | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] Mike Chen                 | |
| | mike@company.com                   | |
| | Operations Lead                    | |
| |                              [>]   | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] Emily Davis               | |
| | emily@company.com                  | |
| | Sales Rep                          | |
| |                              [>]   | |
| +------------------------------------+ |
|                                        |
| Note: Your delegate will receive       |
| all task notifications and can act     |
| on your behalf during your absence.    |
|                                        |
+----------------------------------------+
```

### Dashboard - Delegation Alert Banner (Mobile)

```
+----------------------------------------+
| Dashboard                      [Bell]  |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [!] You're Away                    | |
| | ---------------------------------- | |
| | Sarah Johnson is handling your     | |
| | tasks until Jan 22, 2026.          | |
| |                                    | |
| | (End Early)        (View Details)  | |
| +------------------------------------+ |
|                                        |
| Welcome Back, John!                    |
| --------------------------------       |
| ...                                    |
+----------------------------------------+

DELEGATE'S VIEW:
+----------------------------------------+
| Dashboard                      [Bell]  |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [info] Delegated Tasks             | |
| | ---------------------------------- | |
| | You're covering for John Smith     | |
| | Jan 15 - Jan 22, 2026              | |
| |                                    | |
| | (View Assigned Tasks)              | |
| +------------------------------------+ |
|                                        |
| Welcome, Sarah!                        |
| --------------------------------       |
| ...                                    |
+----------------------------------------+
```

### User Profile - Delegation Badge (Mobile)

```
+----------------------------------------+
| <- Users                               |
+----------------------------------------+
|                                        |
|   +----------------------------------+ |
|   |       [Avatar]                   | |
|   |     John Smith                   | |
|   |     john@company.com             | |
|   |     [Admin] [Active]             | |
|   |                                  | |
|   |     [Away: Jan 15-22]            | |
|   |     Delegate: Sarah Johnson      | |
|   +----------------------------------+ |
|                                        |
+----------------------------------------+
```

### Delegated Tasks View (Mobile)

```
+----------------------------------------+
| <- Dashboard                           |
+----------------------------------------+
| Tasks Delegated to You                 |
| John Smith's tasks during their absence|
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [!] Follow up: Acme Corp           | |
| | Due: Jan 16, 2026                  | |
| | Priority: High                     | |
| |                                    | |
| | Original owner: John Smith         | |
| |                     [View] [Done]  | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [ ] Review quote #QT-5678          | |
| | Due: Jan 18, 2026                  | |
| | Priority: Medium                   | |
| |                                    | |
| | Original owner: John Smith         | |
| |                     [View] [Done]  | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [ ] Call Beta Industries           | |
| | Due: Jan 20, 2026                  | |
| | Priority: Normal                   | |
| |                                    | |
| | Original owner: John Smith         | |
| |                     [View] [Done]  | |
| +------------------------------------+ |
|                                        |
| Showing 3 active tasks                 |
|                                        |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### User Settings - Delegation Section (Tablet)

```
+----------------------------------------------------------------+
| <- Settings                                                     |
+----------------------------------------------------------------+
| [Profile]    [Notifications]    [Delegation]                    |
|                                 ^^^^^^^^^^^^                    |
+----------------------------------------------------------------+
|                                                                 |
| Delegation Settings                                             |
| ----------------------------------------------------------------|
|                                                                 |
| Set up a delegate to handle your tasks and notifications        |
| while you're away from work.                                    |
|                                                                 |
| +-------------------------------------------------------------+ |
| | Current Status                                              | |
| | ----------------------------------------------------------- | |
| |                                                             | |
| | [*] Active Delegation                                       | |
| |                                                             | |
| | Delegate: [Avatar] Sarah Johnson (Sales Manager)            | |
| | Period: Jan 15 - Jan 22, 2026 (7 days remaining)            | |
| | Reason: Annual leave - vacation trip                        | |
| |                                                             | |
| |                     [Edit Delegation]    [Cancel Delegation]| |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | Delegation History                                          | |
| | ----------------------------------------------------------- | |
| |                                                             | |
| | Date Range          | Delegate      | Reason               | |
| | --------------------|---------------|--------------------  | |
| | Dec 20-27, 2025     | Mike Chen     | Holiday break        | |
| | Nov 5-8, 2025       | Emily Davis   | Conference           | |
| | Oct 1-3, 2025       | Sarah Johnson | Medical leave        | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
```

### Delegation Form - Two Column Layout (Tablet)

```
+----------------------------------------------------------------+
| Set Up Delegation                                               |
+----------------------------------------------------------------+
|                                                                 |
| +----------------------------+ +-----------------------------+  |
| |                            | |                             |  |
| | Delegate To *              | | Delegation Period *         |  |
| | +----------------------v+  | |                             |  |
| | | [Av] Sarah Johnson   |   | | Start Date      End Date   |  |
| | | Sales Manager        |   | | +-----------+ +-----------+|  |
| | +----------------------+   | | |Jan 15,2026| |Jan 22,2026||  |
| |                            | | +-----------+ +-----------+|  |
| +----------------------------+ |                             |  |
|                                | Duration: 7 days            |  |
|                                +-----------------------------+  |
|                                                                 |
| Reason for Delegation                                           |
| +-------------------------------------------------------------+ |
| | Annual leave - vacation trip                                | |
| |                                                             | |
| +-------------------------------------------------------------+ |
| Optional: Helps your delegate understand the context            |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | What will be delegated:                                     | |
| | [x] Task notifications                                      | |
| | [x] Approval requests                                       | |
| | [x] Customer inquiries                                      | |
| | [ ] Administrative alerts                                   | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                              (Cancel)     [Set Up Delegation]   |
|                                                                 |
+----------------------------------------------------------------+
```

### Dashboard Alert Banners (Tablet)

```
DELEGATOR'S VIEW:
+----------------------------------------------------------------+
| Dashboard                                              [Bell]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [!] You're Currently Away                                   | |
| | ----------------------------------------------------------- | |
| |                                                             | |
| | Your tasks are being handled by Sarah Johnson               | |
| | until January 22, 2026 (5 days remaining)                   | |
| |                                                             | |
| |                    (End Delegation Early)   (View Details)  | |
| +-------------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+

DELEGATE'S VIEW:
+----------------------------------------------------------------+
| Dashboard                                              [Bell]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [info] You're Covering for John Smith                       | |
| | ----------------------------------------------------------- | |
| |                                                             | |
| | Period: Jan 15 - Jan 22, 2026                               | |
| | Active tasks: 5 | Notifications: 12                         | |
| |                                                             | |
| |                        (View Delegated Tasks)               | |
| +-------------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### User Settings - Delegation Section (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Profile|  Delegation Settings                                                             |
| -----  |  ------------------------------------------------------------------------------- |
| Notif. |                                                                                  |
| -----  |  Set up a delegate to handle your tasks and notifications while you're away.    |
| Deleg. |                                                                                  |
| <----  |  +----------------------------------------------------------------------------+ |
| Secur. |  |                                                                            | |
|        |  |  Current Status                                                            | |
|        |  |  ------------------------------------------------------------------------ | |
|        |  |                                                                            | |
|        |  |  [*] Active Delegation                                Jan 15 - Jan 22     | |
|        |  |                                                                            | |
|        |  |  +---------------------------+  +--------------------------------------+   | |
|        |  |  |                           |  |                                      |   | |
|        |  |  |  Delegate                 |  |  Details                             |   | |
|        |  |  |  [Avatar]                 |  |                                      |   | |
|        |  |  |  Sarah Johnson            |  |  Start: January 15, 2026             |   | |
|        |  |  |  Sales Manager            |  |  End: January 22, 2026               |   | |
|        |  |  |  sarah@company.com        |  |  Duration: 7 days                    |   | |
|        |  |  |                           |  |  Days remaining: 5                   |   | |
|        |  |  +---------------------------+  |                                      |   | |
|        |  |                                 |  Reason:                             |   | |
|        |  |                                 |  Annual leave - vacation trip        |   | |
|        |  |                                 |                                      |   | |
|        |  |                                 +--------------------------------------+   | |
|        |  |                                                                            | |
|        |  |                           [Edit Delegation]    [Cancel Delegation]         | |
|        |  |                                                                            | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                  |
|        |  +----------------------------------------------------------------------------+ |
|        |  |                                                                            | |
|        |  |  Delegation History                                                        | |
|        |  |  ------------------------------------------------------------------------ | |
|        |  |                                                                            | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |  | Date Range        | Delegate        | Reason            | Status     | | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |  | Dec 20-27, 2025   | Mike Chen       | Holiday break     | Completed  | | |
|        |  |  | Nov 5-8, 2025     | Emily Davis     | Conference        | Completed  | | |
|        |  |  | Oct 1-3, 2025     | Sarah Johnson   | Medical leave     | Completed  | | |
|        |  |  +----------------------------------------------------------------------+ | |
|        |  |                                                                            | |
|        |  +----------------------------------------------------------------------------+ |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Set Up Delegation Form (Desktop)

```
+-------------------------------------------------------------------------------------------+
| Set Up Delegation                                                                         |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  +-------------------------------+  +-------------------------------------------+   | |
|  |  |                               |  |                                           |   | |
|  |  |  Delegate To *                |  |  Delegation Period *                      |   | |
|  |  |                               |  |                                           |   | |
|  |  |  +-------------------------+  |  |  +-------------+      +-------------+     |   | |
|  |  |  | [Av] Select delegate v |  |  |  | Start Date  |  ->  | End Date    |     |   | |
|  |  |  +-------------------------+  |  |  | Jan 15,2026 |      | Jan 22,2026 |     |   | |
|  |  |                               |  |  +-------------+      +-------------+     |   | |
|  |  |  This person will receive    |  |                                           |   | |
|  |  |  your tasks and approvals    |  |  Duration: 7 days                         |   | |
|  |  |                               |  |                                           |   | |
|  |  +-------------------------------+  +-------------------------------------------+   | |
|  |                                                                                     | |
|  |  Reason for Delegation                                                              | |
|  |  +-------------------------------------------------------------------------------+  | |
|  |  | Annual leave - vacation trip                                                  |  | |
|  |  |                                                                               |  | |
|  |  +-------------------------------------------------------------------------------+  | |
|  |  This helps your delegate understand the context (optional)                         | |
|  |                                                                                     | |
|  |  ---------------------------------------------------------------------------        | |
|  |                                                                                     | |
|  |  What will be delegated:                                                            | |
|  |                                                                                     | |
|  |  [x] Task notifications        [x] Approval requests                                | |
|  |  [x] Customer inquiries        [ ] Administrative alerts (admin only)               | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|                                                (Cancel)         [Set Up Delegation]       |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Dashboard Alert Banner (Desktop)

```
DELEGATOR'S VIEW:
+-------------------------------------------------------------------------------------------+
| Dashboard                                                                                 |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
| +--------------------------------------------------------------------------------------+ |
| |                                                                                      | |
| | [!] You're Currently Away                                              [Dismiss] [X] | |
| | ------------------------------------------------------------------------------------| |
| |                                                                                      | |
| | Your tasks and notifications are being handled by Sarah Johnson                      | |
| | until January 22, 2026 (5 days remaining)                                            | |
| |                                                                                      | |
| |                                   (End Delegation Early)       (View Delegation)     | |
| |                                                                                      | |
| +--------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+

DELEGATE'S VIEW:
+-------------------------------------------------------------------------------------------+
| Dashboard                                                                                 |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
| +--------------------------------------------------------------------------------------+ |
| |                                                                                      | |
| | [info] You're Covering for John Smith                               [Dismiss] [X]   | |
| | ------------------------------------------------------------------------------------| |
| |                                                                                      | |
| | Period: January 15 - January 22, 2026                                                | |
| |                                                                                      | |
| | +------------------+  +------------------+  +------------------+                      | |
| | | Active Tasks     |  | Pending Approvals|  | Notifications   |                      | |
| | | 5                |  | 2                |  | 12              |                      | |
| | +------------------+  +------------------+  +------------------+                      | |
| |                                                                                      | |
| |                                                     (View All Delegated Items)       | |
| |                                                                                      | |
| +--------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### Delegated Tasks View (Desktop)

```
+-------------------------------------------------------------------------------------------+
| Delegated Tasks from John Smith                                                           |
| You're covering for John during Jan 15-22, 2026                                           |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
| [All Tasks]  [Pending Approval]  [Notifications]        [Search...]   [Priority v]       |
|                                                                                           |
| +--------------------------------------------------------------------------------------+ |
| |                                                                                      | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [ ] | Task                    | Due Date     | Priority | Customer    | Action | | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [!] | Follow up: Acme Corp    | Jan 16, 2026 | High     | Acme Corp   | [View] | | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [ ] | Review quote #QT-5678   | Jan 18, 2026 | Medium   | Beta Ind.   | [View] | | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [ ] | Call Beta Industries    | Jan 20, 2026 | Normal   | Beta Ind.   | [View] | | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [ ] | Process order #ORD-789  | Jan 21, 2026 | Normal   | Gamma LLC   | [View] | | |
| |  +--------------------------------------------------------------------------------+ | |
| |  | [ ] | Quarterly review prep   | Jan 22, 2026 | Low      | -           | [View] | | |
| |  +--------------------------------------------------------------------------------+ | |
|                                                                                          |
| | Showing 5 delegated tasks                                                            | |
| |                                                                                      | |
| +--------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### User Profile - Delegation Badge (Desktop)

```
+-------------------------------------------------------------------------------------------+
| User Detail: John Smith                                                                   |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  [Avatar]    John Smith                                    [Edit] [More Actions v] | |
|  |              john.smith@company.com                                                | |
|  |              Department: Sales | Role: Admin | Last Active: 2 hours ago            | |
|  |                                                                                     | |
|  |              Status: [Active]     Role: [Admin]                                    | |
|  |                                                                                     | |
|  |              [Away: Jan 15-22, 2026]                                               | |
|  |              Delegate: Sarah Johnson (Sales Manager)                               | |
|  |              ^ Badge expands on hover to show full details                          | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
DELEGATION STATUS LOADING:
+-------------------------------------------------------------+
| Current Status                                               |
+-------------------------------------------------------------+
|                                                              |
| [.....................................................]      |
| [........................]  [.........................]      |
| [.....................................................]      |
|                                                              |
+-------------------------------------------------------------+
^ Skeleton with shimmer animation

SAVING DELEGATION:
+--------------------------------------------------+
|                                                   |
| [Spinner] Setting up delegation...                |
|                                                   |
| This may take a moment.                           |
|                                                   |
+--------------------------------------------------+

DELEGATE SEARCH LOADING:
+----------------------------------+
| Delegate To *                    |
| +----------------------------+   |
| | [Spinner] Searching...    |   |
| +----------------------------+   |
+----------------------------------+
```

### Empty States

```
NO ACTIVE DELEGATION:
+-------------------------------------------------------------+
| Current Status                                               |
+-------------------------------------------------------------+
|                                                              |
|             +-------------------+                            |
|             |   [calendar icon] |                            |
|             +-------------------+                            |
|                                                              |
|           No active delegation                               |
|                                                              |
|   Set up a delegation when you'll be away                    |
|   to ensure your tasks are handled.                          |
|                                                              |
|          [Set Up Delegation]                                 |
|                                                              |
+-------------------------------------------------------------+

NO DELEGATION HISTORY:
+-------------------------------------------------------------+
| Delegation History                                           |
+-------------------------------------------------------------+
|                                                              |
|         No previous delegations                              |
|                                                              |
|   Your delegation history will appear here                   |
|   once you've set up your first delegation.                  |
|                                                              |
+-------------------------------------------------------------+

NO DELEGATED TASKS (for delegate):
+-------------------------------------------------------------+
|                                                              |
|        No tasks delegated to you                             |
|                                                              |
|   John Smith hasn't assigned any tasks yet.                  |
|   Check back later or contact them if needed.                |
|                                                              |
+-------------------------------------------------------------+
```

### Error States

```
FAILED TO SET UP DELEGATION:
+--------------------------------------------------+
| [!] Failed to set up delegation                   |
|                                                   |
| There was a problem setting up your delegation.   |
| Please try again.                                 |
|                                                   |
| Error: User already has an active delegation      |
|                                                   |
|              [Retry]    [Cancel]                  |
+--------------------------------------------------+

INVALID DATE RANGE:
+--------------------------------------------------+
| [!] Invalid date range                            |
|                                                   |
| End date must be after start date.               |
|                                                   |
+--------------------------------------------------+
^ Inline error below date fields

DELEGATE UNAVAILABLE:
+--------------------------------------------------+
| [!] Delegate unavailable                          |
|                                                   |
| Sarah Johnson already has an active delegation   |
| during this period. Please select another        |
| team member.                                      |
|                                                   |
|              [OK]                                 |
+--------------------------------------------------+
```

### Success States

```
DELEGATION SET UP:
+--------------------------------------------------+
| [checkmark] Delegation set up successfully        |
|                                                   |
| Sarah Johnson will receive your tasks from        |
| Jan 15-22, 2026.                                  |
|                                                   |
| <- Toast notification (5s)                        |
+--------------------------------------------------+

DELEGATION CANCELLED:
+--------------------------------------------------+
| [checkmark] Delegation cancelled                  |
|                                                   |
| You will now receive your own tasks and           |
| notifications.                                    |
|                                                   |
| <- Toast notification (3s)                        |
+--------------------------------------------------+

DELEGATION ENDED EARLY:
+--------------------------------------------------+
| [checkmark] Delegation ended                      |
|                                                   |
| Your delegation has been ended early.             |
| You're now receiving all tasks directly.          |
|                                                   |
| <- Toast notification (3s)                        |
+--------------------------------------------------+
```

### Cancel Confirmation

```
CANCEL DELEGATION CONFIRMATION:
+--------------------------------------------------+
| Cancel Delegation                            [X]  |
+--------------------------------------------------+
|                                                   |
|  Are you sure you want to cancel your delegation? |
|                                                   |
|  Your delegate (Sarah Johnson) will no longer     |
|  receive your tasks and notifications.            |
|                                                   |
|  Remaining delegation period: 5 days              |
|                                                   |
|                    (Keep Active)   [Cancel Now]   |
|                                                   |
+--------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Delegation Settings Page**
   - Tab navigation: Profile tab -> Notifications tab -> Delegation tab
   - Within Delegation: Current status card -> Edit/Cancel buttons
   - Form: Delegate selector -> Start date -> End date -> Reason -> Submit

2. **Dashboard Alert Banner**
   - Focus on banner when it appears (for screen reader announcement)
   - Tab through action buttons: End Early -> View Details -> Dismiss

3. **Delegated Tasks View**
   - Filter tabs -> Search -> Priority filter -> Task rows -> View buttons

### Keyboard Navigation

```
DELEGATE SELECTOR:
- Tab: Focus combobox
- Enter/Space: Open dropdown
- Arrow Up/Down: Navigate options
- Enter: Select highlighted option
- Escape: Close dropdown

DATE RANGE PICKER:
- Tab: Move between Start and End date pickers
- Enter: Open calendar
- Arrow keys: Navigate calendar days
- Enter: Select date
- Escape: Close calendar

ALERT BANNER:
- Tab: Move through action buttons
- Enter/Space: Activate button
- Escape: Dismiss banner (if dismissible)
```

### ARIA Requirements

```html
<!-- Delegation Status -->
<div
  role="region"
  aria-label="Delegation status"
>
  <h2>Current Status</h2>
  <div
    role="status"
    aria-live="polite"
    aria-label="Active delegation to Sarah Johnson from January 15 to January 22, 2026"
  >
    ...
  </div>
</div>

<!-- Delegate Selector -->
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <label for="delegate-select">Delegate To</label>
  <input
    id="delegate-select"
    type="text"
    aria-label="Select delegate"
    aria-autocomplete="list"
    aria-controls="delegate-listbox"
    aria-required="true"
  />
  <ul id="delegate-listbox" role="listbox" aria-label="Available delegates">
    <li role="option" aria-selected="false">
      Sarah Johnson - Sales Manager
    </li>
    ...
  </ul>
</div>

<!-- Date Range -->
<fieldset>
  <legend>Delegation Period</legend>
  <div>
    <label for="start-date">Start Date</label>
    <input
      id="start-date"
      type="text"
      aria-required="true"
      aria-describedby="date-format-hint"
    />
  </div>
  <div>
    <label for="end-date">End Date</label>
    <input
      id="end-date"
      type="text"
      aria-required="true"
      aria-describedby="date-format-hint"
    />
  </div>
  <span id="date-format-hint">Format: MMM DD, YYYY</span>
</fieldset>

<!-- Dashboard Alert Banner -->
<div
  role="alert"
  aria-live="assertive"
  aria-label="Active delegation alert"
>
  <h3>You're Currently Away</h3>
  <p>Your tasks are being handled by Sarah Johnson until January 22, 2026</p>
  <button aria-label="End delegation early">End Early</button>
  <button aria-label="View delegation details">View Details</button>
  <button aria-label="Dismiss alert">Dismiss</button>
</div>

<!-- Delegation Badge on Profile -->
<span
  role="status"
  aria-label="Away from January 15 to January 22, 2026. Delegate: Sarah Johnson"
  tabindex="0"
>
  Away: Jan 15-22
</span>
```

### Screen Reader Announcements

- Delegation set up: "Delegation set up successfully. Sarah Johnson will handle your tasks from January 15 to January 22, 2026"
- Delegation cancelled: "Delegation cancelled. You will now receive your tasks directly"
- Alert banner appears: "Alert: You are currently away. Your tasks are being handled by Sarah Johnson"
- Delegate selected: "Sarah Johnson selected as delegate"
- Date selected: "Start date set to January 15, 2026"
- Form error: "Error: End date must be after start date"

---

## Animation Choreography

### Alert Banner

```
APPEAR:
- Duration: 350ms
- Easing: ease-out
- Transform: translateY(-100%) -> translateY(0)
- Opacity: 0 -> 1
- Max-height: 0 -> auto (for smooth expansion)

DISMISS:
- Duration: 250ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(-100%)
- Opacity: 1 -> 0
- Collapse height smoothly
```

### Delegation Badge

```
APPEAR (on profile):
- Duration: 200ms
- Easing: ease-out
- Scale: 0.9 -> 1
- Opacity: 0 -> 1

HOVER EXPAND:
- Duration: 150ms
- Easing: ease-out
- Tooltip: opacity 0 -> 1, translateY(8px) -> translateY(0)

PULSE (active delegation):
- Duration: 2s
- Easing: ease-in-out
- Box-shadow: pulse glow effect
- Loop: infinite while active
```

### Form Transitions

```
DATE PICKER OPEN:
- Duration: 200ms
- Easing: ease-out
- Calendar: scale(0.95) -> scale(1), opacity 0 -> 1
- Position from input field

DELEGATE DROPDOWN:
- Duration: 200ms
- Easing: ease-out
- Max-height: 0 -> calculated
- Opacity: 0 -> 1

STATUS CHANGE:
- Duration: 300ms
- Easing: ease-in-out
- Old status: fade out
- New status: fade in with slight scale
```

### Card State Changes

```
ACTIVE STATE:
- Border: transition to accent color (200ms)
- Background: subtle tint (200ms)
- Icon: checkmark appear animation

COMPLETION:
- Duration: 400ms
- Success icon: scale bounce
- Content: brief highlight flash
```

---

## Component Props Interfaces

```typescript
// Delegation Settings Component
interface DelegationSettingsProps {
  userId: string;
}

// Delegation Entity
interface Delegation {
  id: string;
  delegatorId: string;
  delegator?: User;
  delegateId: string;
  delegate?: User;
  startDate: Date;
  endDate: Date;
  reason?: string;
  delegatedItems: DelegatedItemType[];
  isActive: boolean;
  createdAt: Date;
  cancelledAt?: Date;
}

// Delegated Item Types
type DelegatedItemType =
  | 'task_notifications'
  | 'approval_requests'
  | 'customer_inquiries'
  | 'administrative_alerts';

// Current Status Card
interface DelegationStatusCardProps {
  delegation: Delegation | null;
  isLoading?: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

// Delegation Form
interface DelegationFormProps {
  initialData?: Partial<DelegationFormData>;
  onSubmit: (data: DelegationFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Delegation Form Data
interface DelegationFormData {
  delegateId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  delegatedItems: DelegatedItemType[];
}

// Delegate Selector
interface DelegateSelectProps {
  value?: string;
  onChange: (userId: string) => void;
  excludeUserIds?: string[];
  unavailableDateRange?: { start: Date; end: Date };
  error?: string;
}

// Date Range Picker
interface DelegationDateRangeProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  minDate?: Date;
  error?: string;
}

// Dashboard Alert Banner
interface DelegationAlertBannerProps {
  type: 'delegator' | 'delegate';
  delegation: Delegation;
  onEndEarly?: () => void;
  onViewDetails: () => void;
  onDismiss: () => void;
}

// Delegation Badge
interface DelegationBadgeProps {
  delegation: Delegation;
  showTooltip?: boolean;
  variant?: 'compact' | 'detailed';
}

// Delegated Tasks View
interface DelegatedTasksViewProps {
  delegatorId: string;
  delegatorName: string;
}

// Delegated Task Item
interface DelegatedTask {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'normal' | 'low';
  type: 'task' | 'approval' | 'notification';
  customer?: { id: string; name: string };
  originalOwnerId: string;
  originalOwner: User;
  status: 'pending' | 'in_progress' | 'completed';
}

// Delegation History Table
interface DelegationHistoryProps {
  userId: string;
  delegations: Delegation[];
  isLoading?: boolean;
}

// Cancel Confirmation Dialog
interface CancelDelegationDialogProps {
  isOpen: boolean;
  delegation: Delegation;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Empty State
interface DelegationEmptyStateProps {
  type: 'no-active' | 'no-history' | 'no-tasks';
  onAction?: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/delegation.tsx` | Delegation settings page |
| `src/components/domain/users/delegation-status-card.tsx` | Current status display |
| `src/components/domain/users/delegation-form.tsx` | Set up/edit delegation form |
| `src/components/domain/users/delegate-select.tsx` | User selector for delegate |
| `src/components/domain/users/delegation-date-range.tsx` | Date range picker |
| `src/components/domain/users/delegation-alert-banner.tsx` | Dashboard alert banner |
| `src/components/domain/users/delegation-badge.tsx` | Profile badge |
| `src/components/domain/users/delegated-tasks-view.tsx` | Tasks view for delegate |
| `src/components/domain/users/delegation-history.tsx` | History table |
| `src/components/domain/users/cancel-delegation-dialog.tsx` | Cancellation confirmation |
| `src/hooks/use-delegation.ts` | Delegation data hook |
| `src/hooks/use-delegated-tasks.ts` | Delegated tasks hook |
| `src/server/functions/delegation/` | Server functions directory |
