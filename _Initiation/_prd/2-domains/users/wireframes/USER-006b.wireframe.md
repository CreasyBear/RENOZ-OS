# Wireframe: DOM-USER-006b - Bulk User Operations UI

## Story Reference

- **Story ID**: DOM-USER-006b
- **Name**: Bulk User Operations UI
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Bulk action toolbar with Dialog and ProgressBar

## Overview

Complete bulk operations UI with progress indicator. Includes bulk role change action with role Select dropdown, bulk add to group action with group Select, bulk email action Dialog with subject/body Form fields, progress indicator for operations on >10 users, confirmation Dialog before bulk operations, and result summary Toast/Dialog showing success/failure counts.

## UI Patterns (Reference Implementation)

### Checkbox
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Row selection checkboxes in DataTable
  - Select all/none functionality in header
  - Indeterminate state for partial selection

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Bulk action confirmation with impact preview
  - Progress dialog showing operation status
  - Result summary dialog with success/failure breakdown

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Bulk email compose form with subject and body
  - Field validation for required inputs
  - Character counter on message textarea

### Progress
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Determinate progress bar for bulk operations
  - Real-time percentage and item count updates
  - Cancellable operation with progress state

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Role selector for bulk role change
  - Group selector for bulk group assignment
  - Validation showing which users will be affected

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | users | IMPLEMENTED |
| **Server Functions** | Bulk user operations | AVAILABLE |
| **PRD Stories** | DOM-USER-006b | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### User List with Selection (Mobile)

```
+----------------------------------------+
| Users                   [Cancel] [...]  |
|                          ^ selection    |
+----------------------------------------+
| 5 users selected                        |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [x] [Avatar] Sarah Johnson         | |
| | sarah@company.com                  | |
| | Admin                   Active [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [x] [Avatar] John Smith            | |
| | john@company.com                   | |
| | Sales                   Active [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [x] [Avatar] Mike Chen             | |
| | mike@company.com                   | |
| | Operations              Active [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [x] [Avatar] Emily Davis           | |
| | emily@company.com                  | |
| | Sales                   Active [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [x] [Avatar] Lisa Wong             | |
| | lisa@company.com                   | |
| | Marketing               Active [*] | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+

FLOATING ACTION BAR (Mobile):
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [Role]  [Group]  [Email]  [More v] | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
^ Fixed bottom action bar
```

### Bulk Role Change (Mobile Full Screen)

```
+----------------------------------------+
| Change Role                      [X]   |
+----------------------------------------+
|                                        |
| Change role for 5 selected users       |
|                                        |
| --------------------------------       |
|                                        |
| New Role *                             |
| +----------------------------------v + |
| | Sales                              | |
| +------------------------------------+ |
|                                        |
| Available roles:                       |
| - Admin (full access)                  |
| - Sales (customer & order access)      |
| - Warehouse (inventory access)         |
| - Viewer (read-only access)            |
|                                        |
| --------------------------------       |
|                                        |
| Selected Users:                        |
|                                        |
| +------------------------------------+ |
| | [Av] Sarah Johnson                 | |
| | Current: Admin -> Sales            | |
| +------------------------------------+ |
| | [Av] John Smith                    | |
| | Current: Sales (no change)         | |
| +------------------------------------+ |
| | ... 3 more                         | |
| +------------------------------------+ |
|                                        |
| 4 users will be updated                |
| 1 user already has this role           |
|                                        |
+----------------------------------------+
|       (Cancel)        [Change Role]    |
+----------------------------------------+
```

### Bulk Add to Group (Mobile Full Screen)

```
+----------------------------------------+
| Add to Group                     [X]   |
+----------------------------------------+
|                                        |
| Add 5 users to a group                 |
|                                        |
| --------------------------------       |
|                                        |
| Select Group *                         |
| +----------------------------------v + |
| | Sales Team                         | |
| +------------------------------------+ |
|                                        |
| Available groups:                      |
| +------------------------------------+ |
| | (o) Sales Team (8 members)         | |
| | ( ) Operations (5 members)         | |
| | ( ) Marketing (6 members)          | |
| | ( ) Management (3 members)         | |
| +------------------------------------+ |
|                                        |
| --------------------------------       |
|                                        |
| Note: Users already in the selected    |
| group will be skipped.                 |
|                                        |
| 3 users will be added                  |
| 2 users are already members            |
|                                        |
+----------------------------------------+
|       (Cancel)        [Add to Group]   |
+----------------------------------------+
```

### Bulk Email (Mobile Full Screen)

```
+----------------------------------------+
| Send Email                       [X]   |
+----------------------------------------+
|                                        |
| Send email to 5 selected users         |
|                                        |
| --------------------------------       |
|                                        |
| Subject *                              |
| +------------------------------------+ |
| | Important team update              | |
| +------------------------------------+ |
|                                        |
| Message *                              |
| +------------------------------------+ |
| | Hi team,                           | |
| |                                    | |
| | This is to inform you about...     | |
| |                                    | |
| |                                    | |
| |                                    | |
| +------------------------------------+ |
| 0/2000 characters                      |
|                                        |
| --------------------------------       |
|                                        |
| Preview Recipients:                    |
| sarah@company.com, john@company.com    |
| +3 more                                |
|                                        |
+----------------------------------------+
|       (Cancel)          [Send Email]   |
+----------------------------------------+
```

### Progress Indicator (Mobile)

```
+----------------------------------------+
| Changing Roles                         |
+----------------------------------------+
|                                        |
|  [==============-----------] 65%       |
|                                        |
|  Processing 13 of 20 users...          |
|                                        |
|  +----------------------------------+  |
|  | [ok] Sarah Johnson - Updated    |  |
|  | [ok] John Smith - Updated       |  |
|  | [ok] Mike Chen - Updated        |  |
|  | [...] Emily Davis - Processing  |  |
|  +----------------------------------+  |
|                                        |
|  Time remaining: ~15 seconds           |
|                                        |
|           (Cancel Operation)           |
|                                        |
+----------------------------------------+
```

### Result Summary (Mobile)

```
+----------------------------------------+
| Operation Complete               [X]   |
+----------------------------------------+
|                                        |
|        [checkmark icon]                |
|                                        |
|    Role change completed!              |
|                                        |
| --------------------------------       |
|                                        |
| +------------------------------------+ |
| | [ok] 18 users updated              | |
| +------------------------------------+ |
| | [!] 2 users failed                 | |
| |     - Tom Brown (permission error) | |
| |     - Jane Doe (already deactiv.)  | |
| +------------------------------------+ |
|                                        |
|           [Retry Failed]               |
|                                        |
+----------------------------------------+
|                            [Done]      |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### User List with Selection and Sticky Toolbar (Tablet)

```
+----------------------------------------------------------------+
| Users                                          [+ Invite User]  |
+----------------------------------------------------------------+
| [Search users________________] [Role: All v] [Status: All v]    |
+----------------------------------------------------------------+
| 5 users selected                    [Cancel Selection]          |
+----------------------------------------------------------------+
| +-------------------------------------------------------------+ |
| | [Change Role v]  [Add to Group v]  [Send Email]  [More v]   | |
| +-------------------------------------------------------------+ |
| ^ Sticky action bar                                             |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [x] | User              | Email            | Role    |Status | |
| +-------------------------------------------------------------+ |
| | [x] | Sarah Johnson     | sarah@co.com     | Admin   |[*]Act | |
| | [x] | John Smith        | john@co.com      | Sales   |[*]Act | |
| | [x] | Mike Chen         | mike@co.com      | Ops     |[*]Act | |
| | [x] | Emily Davis       | emily@co.com     | Sales   |[*]Act | |
| | [x] | Lisa Wong         | lisa@co.com      | Market  |[*]Act | |
| | [ ] | Tom Brown         | tom@co.com       | Support |[*]Act | |
| +-------------------------------------------------------------+ |
|                                                                 |
+----------------------------------------------------------------+
```

### Bulk Role Change Dialog (Tablet)

```
+----------------------------------------------------------------+
| Change Role for 5 Users                                   [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | New Role *                                                  | |
| | +-------------------------------------------------------+   | |
| | | Sales                                             v   |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| | Role Permissions:                                           | |
| | - Access customers and contacts                             | |
| | - Create and manage orders                                  | |
| | - View reports (own data only)                              | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Affected Users:                                                 |
| +-------------------------------------------------------------+ |
| | User              | Current Role | New Role   | Status      | |
| +-------------------------------------------------------------+ |
| | Sarah Johnson     | Admin        | Sales      | Will change | |
| | John Smith        | Sales        | Sales      | No change   | |
| | Mike Chen         | Operations   | Sales      | Will change | |
| | Emily Davis       | Sales        | Sales      | No change   | |
| | Lisa Wong         | Marketing    | Sales      | Will change | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Summary: 3 users will be updated, 2 already have this role      |
|                                                                 |
|                              (Cancel)        [Change 3 Roles]   |
|                                                                 |
+----------------------------------------------------------------+
```

### Bulk Email Dialog (Tablet)

```
+----------------------------------------------------------------+
| Send Email to 5 Users                                     [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | Subject *                                                   | |
| | +-------------------------------------------------------+   | |
| | | Important team update                                 |   | |
| | +-------------------------------------------------------+   | |
| |                                                             | |
| | Message *                                                   | |
| | +-------------------------------------------------------+   | |
| | | Hi team,                                              |   | |
| | |                                                       |   | |
| | | This is to inform you about the upcoming changes      |   | |
| | | to our sales process. Please review the attached      |   | |
| | | documentation before our meeting on Friday.           |   | |
| | |                                                       |   | |
| | | Best regards,                                         |   | |
| | | Admin                                                 |   | |
| | +-------------------------------------------------------+   | |
| | 312/2000 characters                                         | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Recipients:                                                     |
| sarah@company.com, john@company.com, mike@company.com,          |
| emily@company.com, lisa@company.com                             |
|                                                                 |
|                              (Cancel)          [Send Email]     |
|                                                                 |
+----------------------------------------------------------------+
```

### Progress Dialog (Tablet)

```
+----------------------------------------------------------------+
| Changing Roles                                            [X]   |
+----------------------------------------------------------------+
|                                                                 |
|  Processing bulk role change for 20 users                       |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  | [================================-----------] 65%          | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  Completed: 13 of 20 users | Estimated time: ~15 seconds        |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  | User              | Status                                 | |
|  +-----------------------------------------------------------+ |
|  | Sarah Johnson     | [ok] Updated                           | |
|  | John Smith        | [ok] Updated                           | |
|  | Mike Chen         | [ok] Updated                           | |
|  | Emily Davis       | [...] Processing                       | |
|  | Lisa Wong         | [ ] Pending                            | |
|  | ... 15 more       |                                        | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|                           (Cancel Operation)                    |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### User List with Selection and Inline Toolbar (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Dash   |  Users                                                     [+ Invite User]       |
| -----  |  ------------------------------------------------------------------------------- |
| Users  |                                                                                  |
| <----  |  [Search users________________________] [Role v] [Status v] [Group v]            |
| Groups |                                                                                  |
| -----  |  +--------------------------------------------------------------------------+   |
| Roles  |  | 5 users selected                                    [Clear Selection]   |   |
| -----  |  |                                                                          |   |
| Audit  |  | [Change Role v]   [Add to Group v]   [Send Email]   [Export]   [More v] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  ^ Inline toolbar when selection active                                          |
|        |                                                                                  |
|        |  +--------------------------------------------------------------------------+   |
|        |  |                                                                          |   |
|        |  | [x] | User            | Email              | Role      | Groups   |Status|   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | [x] | [Av] Sarah J.   | sarah@company.com  | Admin     | Sales    |[*]Act|   |
|        |  | [x] | [Av] John Smith | john@company.com   | Sales     | Sales    |[*]Act|   |
|        |  | [x] | [Av] Mike Chen  | mike@company.com   | Ops       | Ops      |[*]Act|   |
|        |  | [x] | [Av] Emily D.   | emily@company.com  | Sales     | Sales    |[*]Act|   |
|        |  | [x] | [Av] Lisa Wong  | lisa@company.com   | Marketing | Market   |[*]Act|   |
|        |  | [ ] | [Av] Tom Brown  | tom@company.com    | Support   | Support  |[*]Act|   |
|        |  | [ ] | [Av] Jane Doe   | jane@company.com   | Admin     | Mgmt     |[*]Act|   |
|        |  +--------------------------------------------------------------------------+   |
|        |                                                                                  |
|        |  Showing 1-10 of 25 users                              < 1 [2] 3 >               |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Role Change Dropdown (Desktop)

```
+------------------------------------+
| Change Role for 5 users            |
+------------------------------------+
|                                    |
| Select new role:                   |
|                                    |
| ( ) Admin                          |
|     Full system access             |
|                                    |
| (o) Sales                          |
|     Customer & order management    |
|                                    |
| ( ) Warehouse                      |
|     Inventory management           |
|                                    |
| ( ) Viewer                         |
|     Read-only access               |
|                                    |
| ---------------------------        |
|                                    |
| 3 of 5 users will be changed       |
| 2 users already have this role     |
|                                    |
| (Cancel)            [Apply]        |
|                                    |
+------------------------------------+
```

### Bulk Role Change Confirmation Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Confirm Role Change                                                     [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  You are about to change the role of 5 users to "Sales".                      |
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | +--------------------------------------------------------------------+ |  |
|  | | User              | Current Role   | New Role  | Permission Change | |  |
|  | +--------------------------------------------------------------------+ |  |
|  | | Sarah Johnson     | Admin          | Sales     | Reduced access    | |  |
|  | | John Smith        | Sales          | Sales     | No change         | |  |
|  | | Mike Chen         | Operations     | Sales     | Changed access    | |  |
|  | | Emily Davis       | Sales          | Sales     | No change         | |  |
|  | | Lisa Wong         | Marketing      | Sales     | Changed access    | |  |
|  | +--------------------------------------------------------------------+ |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  [!] Warning: Sarah Johnson will lose admin permissions                       |
|                                                                               |
|  Summary:                                                                     |
|  - 3 users will have their role changed                                       |
|  - 2 users already have the "Sales" role (no change)                          |
|  - 1 user will have reduced permissions (Admin -> Sales)                      |
|                                                                               |
|                                        (Cancel)         [Change 3 Roles]      |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Bulk Add to Group Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Add 5 Users to Group                                                    [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | Select Group                                                           |  |
|  | +------------------------------------------------------------------+   |  |
|  | | [Search groups...                                            ]  |   |  |
|  | +------------------------------------------------------------------+   |  |
|  |                                                                        |  |
|  | Available Groups:                                                      |  |
|  | +------------------------------------------------------------------+   |  |
|  | | (o) Sales Team                                                   |   |  |
|  | |     8 members | Lead: Sarah Johnson                             |   |  |
|  | +------------------------------------------------------------------+   |  |
|  | | ( ) Operations                                                   |   |  |
|  | |     5 members | Lead: Mike Chen                                  |   |  |
|  | +------------------------------------------------------------------+   |  |
|  | | ( ) Marketing                                                    |   |  |
|  | |     6 members | Lead: Lisa Wong                                  |   |  |
|  | +------------------------------------------------------------------+   |  |
|  | | ( ) Management                                                   |   |  |
|  | |     3 members | Lead: Jane Doe                                   |   |  |
|  | +------------------------------------------------------------------+   |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Selected users:                                                              |
|  +------------------------------------------------------------------------+  |
|  | User              | Current Groups       | Status                      |  |
|  +------------------------------------------------------------------------+  |
|  | Sarah Johnson     | Sales Team           | Already member              |  |
|  | John Smith        | -                    | Will be added               |  |
|  | Mike Chen         | Operations           | Will be added               |  |
|  | Emily Davis       | Sales Team           | Already member              |  |
|  | Lisa Wong         | Marketing            | Will be added               |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Summary: 3 users will be added, 2 are already members                        |
|                                                                               |
|                                        (Cancel)         [Add 3 to Group]      |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Bulk Email Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Send Email to 5 Users                                                   [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | Subject *                                                              |  |
|  | +------------------------------------------------------------------+   |  |
|  | | Important team update                                            |   |  |
|  | +------------------------------------------------------------------+   |  |
|  |                                                                        |  |
|  | Message *                                                              |  |
|  | +------------------------------------------------------------------+   |  |
|  | | Hi team,                                                         |   |  |
|  | |                                                                  |   |  |
|  | | This is to inform you about the upcoming changes to our sales    |   |  |
|  | | process. Please review the attached documentation before our     |   |  |
|  | | meeting on Friday.                                               |   |  |
|  | |                                                                  |   |  |
|  | | Key points:                                                      |   |  |
|  | | - New CRM features will be rolled out next week                  |   |  |
|  | | - Training sessions scheduled for Monday                         |   |  |
|  | | - Please update your contact information                         |   |  |
|  | |                                                                  |   |  |
|  | | Best regards,                                                    |   |  |
|  | | Admin Team                                                       |   |  |
|  | +------------------------------------------------------------------+   |  |
|  | 512/2000 characters                                                   |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Recipients (5):                                                              |
|  [Sarah Johnson x] [John Smith x] [Mike Chen x] [Emily Davis x] [Lisa Wong x] |
|                                                                               |
|  [x] Send copy to myself                                                      |
|                                                                               |
|                                        (Cancel)         [Send to 5 Users]     |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Progress Dialog (Desktop - Large Operation)

```
+------------------------------------------------------------------------------+
| Bulk Role Change in Progress                                            [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  Changing role to "Sales" for 45 users                                        |
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | [=================================================--------------] 78%  |  |
|  |                                                                        |  |
|  | Completed: 35 of 45 users                                              |  |
|  | Estimated time remaining: ~20 seconds                                  |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Processing Log:                                                              |
|  +------------------------------------------------------------------------+  |
|  | User                    | Status                   | Time              |  |
|  +------------------------------------------------------------------------+  |
|  | Sarah Johnson           | [ok] Updated             | 0.2s              |  |
|  | John Smith              | [ok] Updated             | 0.3s              |  |
|  | Mike Chen               | [ok] Updated             | 0.2s              |  |
|  | Emily Davis             | [ok] Updated             | 0.4s              |  |
|  | Lisa Wong               | [ok] Updated             | 0.2s              |  |
|  | Tom Brown               | [!] Failed - Permission  | 0.5s              |  |
|  | Jane Doe                | [ok] Updated             | 0.3s              |  |
|  | Alex Turner             | [...] Processing         | -                 |  |
|  | ... 37 more             |                          |                   |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Current status: Processing Alex Turner...                                    |
|                                                                               |
|                                        (Cancel Operation)                     |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Result Summary Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Bulk Operation Complete                                                 [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|        +------------------+                                                   |
|        |  [checkmark]     |                                                   |
|        +------------------+                                                   |
|                                                                               |
|        Role change completed!                                                 |
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | Summary                                                                |  |
|  | -------------------------------------------------------------------   |  |
|  |                                                                        |  |
|  | +----------------------------------------------------------------+    |  |
|  | | [ok] Successfully updated           | 43 users                 |    |  |
|  | +----------------------------------------------------------------+    |  |
|  | | [skip] Already had role             | 5 users                  |    |  |
|  | +----------------------------------------------------------------+    |  |
|  | | [!] Failed                          | 2 users                  |    |  |
|  | +----------------------------------------------------------------+    |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  Failed Operations:                                                           |
|  +------------------------------------------------------------------------+  |
|  | User          | Error                              | Action            |  |
|  +------------------------------------------------------------------------+  |
|  | Tom Brown     | Permission denied - protected user | [View Details]    |  |
|  | Jane Doe      | User is deactivated               | [Reactivate]      |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|  [Export Full Report]           [Retry 2 Failed]              [Done]         |
|                                                                               |
+------------------------------------------------------------------------------+
```

### More Actions Dropdown (Desktop)

```
+--------------------------------+
| More Actions                   |
+--------------------------------+
|                                |
| [Export Selected]              |
| Export user data as CSV        |
|                                |
| [Deactivate Users]             |
| Deactivate selected users      |
|                                |
| [Reset Passwords]              |
| Send password reset emails     |
|                                |
| ---------------------------    |
|                                |
| [Delete Users]                 |
| Permanently delete users       |
| (requires confirmation)        |
|                                |
+--------------------------------+
```

---

## Interaction States

### Loading States

```
BULK ACTION INITIATING:
+------------------------------------------+
|                                          |
| [Spinner] Preparing bulk operation...     |
|                                          |
| Validating 45 users...                   |
|                                          |
+------------------------------------------+

ACTION BAR LOADING:
+-------------------------------------------------------------+
| [...] users selected                [Cancel Selection]       |
|                                                              |
| [Loading...] [Loading...] [Loading...] [Loading...]          |
+-------------------------------------------------------------+
^ Skeleton buttons while calculating options
```

### Empty States

```
NO USERS SELECTED:
+-------------------------------------------------------------+
| Users                                      [+ Invite User]   |
+-------------------------------------------------------------+
|                                                              |
| [Search users________________] [Role v] [Status v]           |
|                                                              |
| Select users to perform bulk actions                         |
|                                                              |
+-------------------------------------------------------------+
^ No action bar shown when nothing selected

NO VALID TARGETS:
+------------------------------------------+
| [!] No valid users for this action        |
|                                          |
| All selected users already have the       |
| "Sales" role. No changes needed.          |
|                                          |
|              [OK]                        |
+------------------------------------------+
```

### Error States

```
PARTIAL FAILURE:
+------------------------------------------+
| [!] Some operations failed                |
|                                          |
| 3 of 5 users were updated successfully.  |
| 2 users could not be updated.            |
|                                          |
| Failed:                                   |
| - Tom Brown: Permission denied           |
| - Jane Doe: User deactivated             |
|                                          |
|     [Retry Failed]    [Continue]         |
+------------------------------------------+

COMPLETE FAILURE:
+------------------------------------------+
| [!] Operation failed                      |
|                                          |
| Unable to change roles. The server       |
| encountered an error.                     |
|                                          |
| Error: Database connection timeout        |
|                                          |
|         [Retry]    [Cancel]              |
+------------------------------------------+

VALIDATION ERROR:
+------------------------------------------+
| [!] Invalid selection                     |
|                                          |
| Cannot change role for users:             |
| - Sarah Johnson (only remaining admin)    |
|                                          |
| At least one admin must remain.           |
|                                          |
|              [OK]                        |
+------------------------------------------+
```

### Success States

```
OPERATION COMPLETE (simple):
+------------------------------------------+
| [checkmark] 5 users updated               |
|                                          |
| Role changed to "Sales" successfully.     |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

EMAIL SENT:
+------------------------------------------+
| [checkmark] Emails sent                   |
|                                          |
| Email sent to 5 users successfully.       |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+
```

### Confirmation Required

```
DESTRUCTIVE ACTION CONFIRMATION:
+------------------------------------------+
| Deactivate 5 Users                  [X]   |
+------------------------------------------+
|                                          |
| [!] This action will:                     |
|                                          |
| - Prevent these users from logging in     |
| - Remove them from active groups          |
| - Revoke all active sessions              |
|                                          |
| Users to deactivate:                      |
| Sarah Johnson, John Smith, Mike Chen,     |
| Emily Davis, Lisa Wong                    |
|                                          |
| Type "DEACTIVATE" to confirm:             |
| +--------------------------------------+ |
| | __________________________________ | |
| +--------------------------------------+ |
|                                          |
|       (Cancel)       [Deactivate 5]      |
|                        (disabled until   |
|                         typed correctly) |
+------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Selection Mode**
   - Checkbox in each row
   - Selection counter
   - Clear selection button
   - Action bar buttons (left to right)
   - More actions dropdown

2. **Action Dialogs**
   - Dialog title (close button)
   - Form fields in order
   - Preview/summary section
   - Cancel -> Confirm buttons

3. **Progress Dialog**
   - Progress bar (aria-live)
   - Status log (scrollable)
   - Cancel button

### Keyboard Navigation

```
SELECTION:
- Space: Toggle row selection (when row focused)
- Ctrl/Cmd + A: Select all visible
- Escape: Clear selection

ACTION BAR:
- Tab: Move between action buttons
- Enter/Space: Activate action
- Arrow keys: Navigate dropdown options

PROGRESS DIALOG:
- Tab: Focus cancel button
- Escape: Prompt to confirm cancellation
- Cannot close while in progress without confirmation
```

### ARIA Requirements

```html
<!-- Selection Counter -->
<div
  role="status"
  aria-live="polite"
  aria-label="5 users selected"
>
  5 users selected
</div>

<!-- Bulk Action Bar -->
<div
  role="toolbar"
  aria-label="Bulk actions for selected users"
>
  <button
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-label="Change role for 5 selected users"
  >
    Change Role
  </button>
  <button
    aria-haspopup="dialog"
    aria-label="Add 5 selected users to group"
  >
    Add to Group
  </button>
  <button
    aria-haspopup="dialog"
    aria-label="Send email to 5 selected users"
  >
    Send Email
  </button>
</div>

<!-- Progress Bar -->
<div
  role="progressbar"
  aria-valuenow="78"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Bulk operation progress: 78%, 35 of 45 users processed"
>
  [=================================================--------------]
</div>

<!-- Progress Status (live region) -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  Processing Alex Turner...
</div>

<!-- Result Summary -->
<div
  role="alert"
  aria-label="Operation complete: 43 successful, 2 failed"
>
  ...
</div>

<!-- Confirmation Dialog -->
<dialog
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="confirm-title"
  aria-describedby="confirm-desc"
>
  <h2 id="confirm-title">Confirm Role Change</h2>
  <p id="confirm-desc">
    You are about to change the role of 5 users to "Sales".
  </p>
</dialog>
```

### Screen Reader Announcements

- Selection change: "5 users selected. Bulk action toolbar available."
- Selection cleared: "Selection cleared. 0 users selected."
- Action started: "Changing role for 45 users. Please wait."
- Progress update: "35 of 45 users processed. 78% complete."
- User processed: "John Smith updated successfully."
- User failed: "Error: Tom Brown could not be updated. Permission denied."
- Operation complete: "Bulk operation complete. 43 users updated, 2 failed."
- All success: "All 45 users updated successfully."

---

## Animation Choreography

### Action Bar

```
APPEAR (when selection made):
- Duration: 250ms
- Easing: ease-out
- Transform: translateY(10px) -> translateY(0)
- Opacity: 0 -> 1
- Height: 0 -> auto

DISAPPEAR (when selection cleared):
- Duration: 200ms
- Easing: ease-in
- Transform: translateY(0) -> translateY(10px)
- Opacity: 1 -> 0
- Height: auto -> 0
```

### Selection Checkbox

```
CHECK:
- Duration: 200ms
- Checkmark: scale bounce (0 -> 1.2 -> 1)
- Background: color transition
- Row: subtle highlight flash

UNCHECK:
- Duration: 150ms
- Checkmark: scale(1) -> scale(0)
- Background: fade color
```

### Progress Bar

```
PROGRESS UPDATE:
- Duration: 300ms
- Easing: ease-out
- Width: smooth transition to new percentage
- Color stays consistent

COMPLETION:
- Duration: 400ms
- Progress bar: pulse green
- Fill: slide to 100%
- Checkmark: scale bounce appear
```

### Result Summary

```
SUCCESS APPEAR:
- Duration: 300ms
- Checkmark: scale(0) -> scale(1.2) -> scale(1)
- Content: fade in staggered (100ms delay between sections)

FAILURE ITEMS:
- Duration: 200ms
- Each item: slide in from left (staggered 50ms)
- Border: red highlight pulse
```

### Toast Notification

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Transform: translateX(100%) -> translateX(0)
- Opacity: 0 -> 1

AUTO-DISMISS:
- Delay: 3000ms
- Duration: 200ms
- Transform: translateX(0) -> translateX(100%)
- Opacity: 1 -> 0
```

---

## Component Props Interfaces

```typescript
// Bulk Actions Toolbar
interface BulkActionsToolbarProps {
  selectedUsers: User[];
  onRoleChange: () => void;
  onAddToGroup: () => void;
  onSendEmail: () => void;
  onExport: () => void;
  onDeactivate: () => void;
  onClearSelection: () => void;
}

// Bulk Role Change
interface BulkRoleChangeProps {
  isOpen: boolean;
  selectedUsers: User[];
  onClose: () => void;
  onConfirm: (newRole: UserRole) => Promise<BulkOperationResult>;
}

// Bulk Add to Group
interface BulkAddToGroupProps {
  isOpen: boolean;
  selectedUsers: User[];
  onClose: () => void;
  onConfirm: (groupId: string) => Promise<BulkOperationResult>;
}

// Bulk Email
interface BulkEmailProps {
  isOpen: boolean;
  selectedUsers: User[];
  onClose: () => void;
  onSend: (email: BulkEmailData) => Promise<BulkOperationResult>;
}

// Bulk Email Data
interface BulkEmailData {
  subject: string;
  message: string;
  sendCopyToSelf?: boolean;
}

// Progress Dialog
interface BulkProgressDialogProps {
  isOpen: boolean;
  operation: string;
  totalCount: number;
  processedCount: number;
  currentItem?: string;
  results: BulkItemResult[];
  onCancel: () => void;
  canCancel?: boolean;
}

// Bulk Operation Result
interface BulkOperationResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  results: BulkItemResult[];
}

// Individual Item Result
interface BulkItemResult {
  userId: string;
  userName: string;
  status: 'success' | 'skipped' | 'failed' | 'pending' | 'processing';
  message?: string;
  error?: string;
  duration?: number;  // in ms
}

// Result Summary Dialog
interface BulkResultDialogProps {
  isOpen: boolean;
  operation: string;
  result: BulkOperationResult;
  onClose: () => void;
  onRetryFailed?: () => void;
  onExportReport?: () => void;
}

// Confirmation Dialog
interface BulkConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedUsers: UserImpact[];
  warnings?: string[];
  requireTypedConfirmation?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

// User Impact Summary
interface UserImpact {
  user: User;
  currentValue: string;
  newValue: string;
  impact: 'change' | 'no-change' | 'reduced-access' | 'increased-access';
}

// Selection State Hook
interface UseUserSelectionReturn {
  selectedIds: Set<string>;
  selectedUsers: User[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleSelection: (userId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (userId: string) => boolean;
}

// Bulk Operations Hook
interface UseBulkOperationsReturn {
  isProcessing: boolean;
  progress: number;
  currentItem: string | null;
  results: BulkItemResult[];
  executeOperation: <T>(
    operation: (userId: string) => Promise<T>,
    userIds: string[]
  ) => Promise<BulkOperationResult>;
  cancelOperation: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/bulk-actions-toolbar.tsx` | Selection toolbar |
| `src/components/domain/users/bulk-role-change.tsx` | Role change dialog |
| `src/components/domain/users/bulk-add-to-group.tsx` | Group add dialog |
| `src/components/domain/users/bulk-email-dialog.tsx` | Email compose dialog |
| `src/components/domain/users/bulk-progress-dialog.tsx` | Progress indicator |
| `src/components/domain/users/bulk-result-dialog.tsx` | Result summary |
| `src/components/domain/users/bulk-confirmation-dialog.tsx` | Confirmation dialog |
| `src/components/domain/users/user-impact-table.tsx` | Impact preview table |
| `src/hooks/use-user-selection.ts` | Selection state management |
| `src/hooks/use-bulk-operations.ts` | Bulk operation execution |
| `src/server/functions/users/bulk-role-change.ts` | Server function |
| `src/server/functions/users/bulk-add-to-group.ts` | Server function |
| `src/server/functions/users/bulk-send-email.ts` | Server function |
| `src/server/functions/users/bulk-export.ts` | Export server function |
