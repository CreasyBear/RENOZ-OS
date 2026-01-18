# Wireframe: DOM-USER-008c - Invitation Enhancement UI

## Story Reference

- **Story ID**: DOM-USER-008c
- **Name**: Invitation Enhancement UI
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Form with preview Card and DataTable

## Overview

Enhanced invitation form with preview and bulk upload. Includes personal message Textarea field with character limit, invitation preview Card before sending showing email template, resend invitation action on pending invites, invitation status/history DataTable, CSV bulk upload for invitations with validation preview, and expiration countdown badge on pending invitations.

## UI Patterns (Reference Implementation)

### Form
- **Pattern**: RE-UI Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Invitation form with email, role, message fields
  - Character counter on personal message (500 max)
  - Validation for email format and required fields

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Email preview card showing invitation template
  - Side-by-side preview on tablet/desktop
  - Real-time preview update on form changes

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Pending invitations table with status columns
  - CSV validation results table showing valid/invalid entries
  - Invitation history timeline

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Expiration countdown badge (5 days, 2 days, 12 hours)
  - Warning/destructive variants for expiring/expired
  - Status badge for accepted/pending/cancelled

### Input
- **Pattern**: RE-UI Input
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Email input with validation
  - File input for CSV bulk upload
  - Search input for filtering invitations

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | users (invitedAt, status fields) | IMPLEMENTED |
| **Server Functions** | User invitation, Resend email | AVAILABLE |
| **PRD Stories** | DOM-USER-008c | READY |

### Existing Schema Files
- `renoz-v2/lib/schema/users.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Mobile Wireframe (375px)

### Invite User Form (Mobile)

```
+----------------------------------------+
| Invite User                      [X]   |
+----------------------------------------+
|                                        |
| Invite a new team member               |
|                                        |
| --------------------------------       |
|                                        |
| Email Address *                        |
| +------------------------------------+ |
| | sarah@newcompany.com               | |
| +------------------------------------+ |
|                                        |
| Role *                                 |
| +----------------------------------v + |
| | Sales                              | |
| +------------------------------------+ |
|                                        |
| Personal Message (optional)            |
| +------------------------------------+ |
| | Welcome to the team! I'm excited   | |
| | to have you on board. Please       | |
| | reach out if you have any          | |
| | questions during onboarding.       | |
| +------------------------------------+ |
| 142/500 characters                     |
|                                        |
| Invitation expires in:                 |
| +----------------------------------v + |
| | 7 days                             | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
|     (Preview)        [Send Invitation] |
+----------------------------------------+
```

### Invitation Preview (Mobile Full Screen)

```
+----------------------------------------+
| Invitation Preview               [X]   |
+----------------------------------------+
|                                        |
| This is how your invitation will       |
| appear in the email:                   |
|                                        |
| +------------------------------------+ |
| |                                    | |
| | [Logo] Renoz CRM                   | |
| |                                    | |
| | You've been invited!               | |
| | ---------------------------------- | |
| |                                    | |
| | Hi,                                | |
| |                                    | |
| | John Smith has invited you to      | |
| | join Renoz CRM as a Sales team     | |
| | member.                            | |
| |                                    | |
| | ---------------------------------- | |
| |                                    | |
| | Personal message from John:        | |
| |                                    | |
| | "Welcome to the team! I'm excited  | |
| | to have you on board. Please       | |
| | reach out if you have any          | |
| | questions during onboarding."      | |
| |                                    | |
| | ---------------------------------- | |
| |                                    | |
| | [Accept Invitation]                | |
| |                                    | |
| | This invitation expires on         | |
| | January 17, 2026.                  | |
| |                                    | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
|       (Edit)         [Send Invitation] |
+----------------------------------------+
```

### Pending Invitations List (Mobile)

```
+----------------------------------------+
| Users                         [+ New]  |
+----------------------------------------+
| [Active] [Pending] [Inactive]          |
|          ^^^^^^^^                      |
+----------------------------------------+
|                                        |
| 3 pending invitations                  |
|                                        |
| +------------------------------------+ |
| | sarah@newcompany.com               | |
| | Invited: Jan 10, 2026              | |
| | Role: Sales                        | |
| |                                    | |
| | Expires in: [5 days]               | |
| |                                    | |
| |            [Resend]  [Cancel]      | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | mike@external.com                  | |
| | Invited: Jan 8, 2026               | |
| | Role: Viewer                       | |
| |                                    | |
| | Expires in: [3 days]               | |
| |                                    | |
| |            [Resend]  [Cancel]      | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | emily@partner.org                  | |
| | Invited: Jan 5, 2026               | |
| | Role: Sales                        | |
| |                                    | |
| | [!] Expired                        | |
| |                                    | |
| |            [Resend]  [Delete]      | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
```

### CSV Bulk Upload (Mobile Bottom Sheet)

```
+----------------------------------------+
| Bulk Invite                      [X]   |
+----------------------------------------+
|                                        |
| Upload a CSV file to invite multiple   |
| users at once.                         |
|                                        |
| +------------------------------------+ |
| | +------------------------------+   | |
| | |                              |   | |
| | |   [Upload Icon]              |   | |
| | |                              |   | |
| | |   Drag & drop CSV            |   | |
| | |   or tap to browse           |   | |
| | |                              |   | |
| | +------------------------------+   | |
| +------------------------------------+ |
|                                        |
| Required columns:                      |
| - email (required)                     |
| - role (optional, default: Viewer)     |
| - message (optional)                   |
|                                        |
| [Download Template]                    |
|                                        |
+----------------------------------------+
```

### CSV Validation Preview (Mobile)

```
+----------------------------------------+
| Bulk Invite                      [X]   |
+----------------------------------------+
|                                        |
| File: invites.csv                      |
| 5 users found                          |
|                                        |
| +------------------------------------+ |
| | Validation Results                 | |
| | ---------------------------------- | |
| |                                    | |
| | [ok] 3 valid entries               | |
| | [!] 1 invalid email                | |
| | [skip] 1 already invited           | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [ok] sarah@new.com     | Sales    | |
| | [ok] mike@new.com      | Viewer   | |
| | [ok] lisa@new.com      | Sales    | |
| | [!] invalid-email      | Error    | |
| | [skip] john@company.com| Exists   | |
| +------------------------------------+ |
|                                        |
| Only valid entries will be invited.    |
|                                        |
+----------------------------------------+
|       (Cancel)        [Invite 3 Users] |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Invite User Form with Side-by-Side Preview (Tablet)

```
+----------------------------------------------------------------+
| Invite User                                               [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +------------------------------+ +----------------------------+ |
| |                              | |                            | |
| | Invite New Team Member       | | Email Preview              | |
| | ---------------------------- | | -------------------------- | |
| |                              | |                            | |
| | Email Address *              | | +------------------------+ | |
| | [sarah@newcompany.com___]    | | |                        | | |
| |                              | | | [Logo] Renoz CRM       | | |
| | Role *                       | | |                        | | |
| | [Sales________________v]     | | | You've been invited!   | | |
| |                              | | |                        | | |
| | Personal Message (optional)  | | | John Smith has invited | | |
| | +------------------------+   | | | you to join as Sales.  | | |
| | | Welcome to the team!   |   | | |                        | | |
| | | I'm excited to have    |   | | | "Welcome to the team!" | | |
| | | you on board.          |   | | |                        | | |
| | +------------------------+   | | | [Accept Invitation]    | | |
| | 142/500 characters           | | |                        | | |
| |                              | | | Expires: Jan 17, 2026  | | |
| | Expires in:                  | | |                        | | |
| | [7 days_____________v]       | | +------------------------+ | |
| |                              | |                            | |
| +------------------------------+ +----------------------------+ |
|                                                                 |
|                              (Cancel)         [Send Invitation] |
|                                                                 |
+----------------------------------------------------------------+
```

### Pending Invitations Table (Tablet)

```
+----------------------------------------------------------------+
| Users                                          [+ Invite User]  |
+----------------------------------------------------------------+
| [Active]    [Pending (3)]    [Inactive]                         |
|             ^^^^^^^^^^^^                                        |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | Email              | Role    | Invited     | Expires |Action| |
| +-------------------------------------------------------------+ |
| | sarah@newcompany.  | Sales   | Jan 10      | [5 days]|[...] | |
| | com                |         | 2026        |         |      | |
| +-------------------------------------------------------------+ |
| | mike@external.com  | Viewer  | Jan 8       | [3 days]|[...] | |
| |                    |         | 2026        |         |      | |
| +-------------------------------------------------------------+ |
| | emily@partner.org  | Sales   | Jan 5       | [!]Expir|[...] | |
| |                    |         | 2026        |  ed     |      | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Actions: Resend | Cancel | View History                         |
|                                                                 |
+----------------------------------------------------------------+
```

### CSV Upload with Validation Table (Tablet)

```
+----------------------------------------------------------------+
| Bulk Invite via CSV                                       [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | +-------------------------+  File: invites.csv              | |
| | |                         |  5 entries found                | |
| | |   [Upload Icon]         |                                 | |
| | |                         |  Summary:                       | |
| | |   Drop CSV here or      |  [ok] 3 valid                   | |
| | |   click to browse       |  [!] 1 invalid                  | |
| | |                         |  [skip] 1 duplicate             | |
| | +-------------------------+                                 | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Validation Results:                                             |
| +-------------------------------------------------------------+ |
| | Status | Email              | Role    | Issue               | |
| +-------------------------------------------------------------+ |
| | [ok]   | sarah@new.com      | Sales   | Valid               | |
| | [ok]   | mike@new.com       | Viewer  | Valid               | |
| | [ok]   | lisa@new.com       | Sales   | Valid               | |
| | [!]    | not-an-email       | -       | Invalid email format| |
| | [skip] | john@company.com   | -       | Already invited     | |
| +-------------------------------------------------------------+ |
|                                                                 |
| [Download Template]                   (Cancel)  [Invite 3 Users]|
|                                                                 |
+----------------------------------------------------------------+
```

### Invitation History (Tablet)

```
+----------------------------------------------------------------+
| Invitation History: sarah@newcompany.com                  [X]   |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | Current Status: Pending                                     | |
| | Sent to: sarah@newcompany.com                               | |
| | Role: Sales                                                 | |
| | Expires: January 17, 2026 (5 days remaining)                | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Activity History:                                               |
| +-------------------------------------------------------------+ |
| | Date/Time           | Event                     | By        | |
| +-------------------------------------------------------------+ |
| | Jan 10, 2026 10:00  | Invitation sent           | John S.   | |
| | Jan 10, 2026 10:01  | Email delivered           | System    | |
| | Jan 10, 2026 14:30  | Email opened              | Recipient | |
| +-------------------------------------------------------------+ |
|                                                                 |
|                       [Resend]  [Cancel Invitation]             |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### Invite User Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Invite New Team Member                                                  [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  +------------------------------------------------------------------------+  |
|  |                                                                        |  |
|  | +----------------------------------+ +--------------------------------+|  |
|  | |                                  | |                                ||  |
|  | | Invitation Details               | | Email Preview                  ||  |
|  | | -------------------------------- | | ------------------------------ ||  |
|  | |                                  | |                                ||  |
|  | | Email Address *                  | | +----------------------------+ ||  |
|  | | +----------------------------+   | | |                            | ||  |
|  | | | sarah@newcompany.com       |   | | | [Logo] Renoz CRM           | ||  |
|  | | +----------------------------+   | | |                            | ||  |
|  | |                                  | | | You've been invited to     | ||  |
|  | | Role *                           | | | join Renoz CRM!            | ||  |
|  | | +----------------------------+   | | |                            | ||  |
|  | | | Sales                   v  |   | | | John Smith (Admin) has     | ||  |
|  | | +----------------------------+   | | | invited you to join the    | ||  |
|  | |                                  | | | team as a Sales member.    | ||  |
|  | | Personal Message (optional)      | | |                            | ||  |
|  | | +----------------------------+   | | | Personal message:          | ||  |
|  | | | Welcome to the team! I'm   |   | | | "Welcome to the team! I'm  | ||  |
|  | | | excited to have you on     |   | | | excited to have you on     | ||  |
|  | | | board. Please reach out    |   | | | board..."                  | ||  |
|  | | | if you have any questions  |   | | |                            | ||  |
|  | | | during onboarding.         |   | | | [Accept Invitation]        | ||  |
|  | | +----------------------------+   | | |                            | ||  |
|  | | 142/500 characters               | | | This invitation expires    | ||  |
|  | |                                  | | | on January 17, 2026        | ||  |
|  | | Invitation Expires In            | | |                            | ||  |
|  | | +----------------------------+   | | +----------------------------+ ||  |
|  | | | 7 days                  v  |   | |                                ||  |
|  | | +----------------------------+   | | [View full email template]     ||  |
|  | |                                  | |                                ||  |
|  | +----------------------------------+ +--------------------------------+|  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                               |
|                                          (Cancel)        [Send Invitation]    |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Pending Invitations Table (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| Dash   |  Users                                                      [+ Invite User]      |
| -----  |  ------------------------------------------------------------------------------- |
| Users  |                                                                                  |
| <----  |  [Active (25)]    [Pending (3)]    [Inactive (5)]                               |
| Groups |                   ^^^^^^^^^^^^                                                   |
| -----  |  ------------------------------------------------------------------------------- |
| Roles  |                                                                                  |
|        |  3 pending invitations                              [Bulk Invite CSV]            |
|        |                                                                                  |
|        |  +--------------------------------------------------------------------------+   |
|        |  |                                                                          |   |
|        |  | Email               | Role      | Invited      | Status    | Actions    |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | sarah@newcompany.   | Sales     | Jan 10, 2026 | [5 days]  | [Resend]   |   |
|        |  | com                 |           | by John S.   | remaining | [Cancel]   |   |
|        |  |                     |           |              |           | [History]  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | mike@external.com   | Viewer    | Jan 8, 2026  | [3 days]  | [Resend]   |   |
|        |  |                     |           | by Sarah J.  | remaining | [Cancel]   |   |
|        |  |                     |           |              |           | [History]  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  | emily@partner.org   | Sales     | Jan 5, 2026  | [!]       | [Resend]   |   |
|        |  |                     |           | by John S.   | Expired   | [Delete]   |   |
|        |  |                     |           |              |           | [History]  |   |
|        |  +--------------------------------------------------------------------------+   |
|        |                                                                                  |
|        |  Total: 3 invitations | 2 active | 1 expired                                     |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### CSV Bulk Upload Dialog (Desktop)

```
+-----------------------------------------------------------------------------------+
| Bulk Invite via CSV                                                          [X]   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------------------------------------------------------------+ |
|  |                                                                              | |
|  | +-----------------------------------+ +------------------------------------+ | |
|  | |                                   | |                                    | | |
|  | |   +---------------------------+   | | File Information                   | | |
|  | |   |                           |   | | ---------------------------------- | | |
|  | |   |      [Upload Icon]        |   | |                                    | | |
|  | |   |                           |   | | File: invites.csv                  | | |
|  | |   |   Drag and drop your      |   | | Size: 2.4 KB                       | | |
|  | |   |   CSV file here           |   | | Rows: 5                            | | |
|  | |   |                           |   | |                                    | | |
|  | |   |   or [Browse Files]       |   | | Validation Summary:                | | |
|  | |   |                           |   | | [ok] 3 valid entries               | | |
|  | |   +---------------------------+   | | [!] 1 invalid email                | | |
|  | |                                   | | [skip] 1 already invited           | | |
|  | +-----------------------------------+ +------------------------------------+ | |
|  |                                                                              | |
|  | Validation Details:                                                          | |
|  | +------------------------------------------------------------------------+   | |
|  | |                                                                        |   | |
|  | | +--------------------------------------------------------------------+ |   | |
|  | | | Row | Status | Email              | Role    | Message    | Issue   | |   | |
|  | | +--------------------------------------------------------------------+ |   | |
|  | | | 1   | [ok]   | sarah@new.com      | Sales   | Welcome!   | Valid   | |   | |
|  | | | 2   | [ok]   | mike@new.com       | Viewer  | -          | Valid   | |   | |
|  | | | 3   | [ok]   | lisa@new.com       | Sales   | Join us!   | Valid   | |   | |
|  | | | 4   | [!]    | not-an-email       | Admin   | -          | Invalid | |   | |
|  | | |     |        |                    |         |            | email   | |   | |
|  | | | 5   | [skip] | john@company.com   | Sales   | -          | Already | |   | |
|  | | |     |        |                    |         |            | invited | |   | |
|  | | +--------------------------------------------------------------------+ |   | |
|  | |                                                                        |   | |
|  | +------------------------------------------------------------------------+   | |
|  |                                                                              | |
|  | Required columns: email | Optional: role, message                            | |
|  |                                                                              | |
|  +------------------------------------------------------------------------------+ |
|                                                                                    |
|  [Download Template]          (Cancel)              [Invite 3 Valid Users]         |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

### Invitation History Dialog (Desktop)

```
+-----------------------------------------------------------------------------------+
| Invitation History                                                           [X]   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------------------------------------------------------------+ |
|  |                                                                              | |
|  | Invitation for: sarah@newcompany.com                                         | |
|  | -------------------------------------------------------------------------    | |
|  |                                                                              | |
|  | +----------------------------------+ +----------------------------------+    | |
|  | |                                  | |                                  |    | |
|  | | Current Status: Pending          | | Invitation Details               |    | |
|  | |                                  | |                                  |    | |
|  | | [5 days remaining]               | | Role: Sales                      |    | |
|  | |                                  | | Invited by: John Smith           |    | |
|  | | Expires: January 17, 2026        | | Sent: January 10, 2026 10:00 AM  |    | |
|  | |                                  | |                                  |    | |
|  | +----------------------------------+ | Personal Message:                |    | |
|  |                                      | "Welcome to the team! I'm        |    | |
|  |                                      | excited to have you on board."   |    | |
|  |                                      |                                  |    | |
|  |                                      +----------------------------------+    | |
|  |                                                                              | |
|  | Activity Timeline:                                                           | |
|  | +------------------------------------------------------------------------+   | |
|  | |                                                                        |   | |
|  | | Jan 10, 2026                                                           |   | |
|  | | +--------------------------------------------------------------------+ |   | |
|  | | | 10:00 AM | Invitation sent        | by John Smith                  | |   | |
|  | | | 10:01 AM | Email delivered        | System                         | |   | |
|  | | | 14:30 PM | Email opened           | Recipient (192.168.x.x)        | |   | |
|  | | +--------------------------------------------------------------------+ |   | |
|  | |                                                                        |   | |
|  | +------------------------------------------------------------------------+   | |
|  |                                                                              | |
|  +------------------------------------------------------------------------------+ |
|                                                                                    |
|                     [Resend Invitation]    [Cancel Invitation]       [Close]       |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

### Resend Confirmation Dialog (Desktop)

```
+---------------------------------------------------+
| Resend Invitation                            [X]   |
+---------------------------------------------------+
|                                                    |
|  Resend invitation to sarah@newcompany.com?        |
|                                                    |
|  This will:                                        |
|  - Send a new invitation email                     |
|  - Reset the expiration to 7 days from now         |
|                                                    |
|  Previous attempts: 1 (last: Jan 10, 2026)         |
|                                                    |
|  [ ] Update personal message:                      |
|  +----------------------------------------------+  |
|  | Just a reminder about your invitation!       |  |
|  | Please join us when you have a moment.       |  |
|  +----------------------------------------------+  |
|                                                    |
|               (Cancel)        [Resend Now]         |
|                                                    |
+---------------------------------------------------+
```

---

## Interaction States

### Loading States

```
INVITATION SENDING:
+------------------------------------------+
|                                          |
| [Spinner] Sending invitation...           |
|                                          |
| This may take a moment.                   |
|                                          |
+------------------------------------------+

CSV PROCESSING:
+------------------------------------------+
|                                          |
| [Spinner] Processing CSV file...          |
|                                          |
| Validating 5 entries...                   |
|                                          |
| [==============--------] 70%              |
|                                          |
+------------------------------------------+

INVITATIONS TABLE LOADING:
+-------------------------------------------------------------+
| Email       | Role   | Invited    | Status  | Actions       |
+-------------------------------------------------------------+
| [...........|........|............|.........|...........]   |
| [...........|........|............|.........|...........]   |
| [...........|........|............|.........|...........]   |
+-------------------------------------------------------------+
^ Skeleton rows with shimmer
```

### Empty States

```
NO PENDING INVITATIONS:
+-------------------------------------------------------------+
|                                                              |
|              +-------------------+                           |
|              |   [invite icon]   |                           |
|              +-------------------+                           |
|                                                              |
|          No pending invitations                              |
|                                                              |
|   All invitations have been accepted or expired.             |
|   Invite new team members to get started.                    |
|                                                              |
|              [+ Invite User]                                 |
|                                                              |
+-------------------------------------------------------------+

NO HISTORY FOR INVITATION:
+-------------------------------------------------------------+
|                                                              |
|              No activity recorded                            |
|                                                              |
|   Activity history for this invitation                       |
|   is not yet available.                                      |
|                                                              |
+-------------------------------------------------------------+
```

### Error States

```
INVALID EMAIL:
+------------------------------------------+
| Email Address *                           |
| +--------------------------------------+ |
| | not-a-valid-email                    | |
| +--------------------------------------+ |
| [!] Please enter a valid email address   |
+------------------------------------------+

ALREADY INVITED:
+------------------------------------------+
| [!] User already invited                  |
|                                          |
| sarah@newcompany.com has a pending       |
| invitation. Would you like to resend?    |
|                                          |
|         [Resend]    [Cancel]             |
+------------------------------------------+

ALREADY A MEMBER:
+------------------------------------------+
| [!] User already exists                   |
|                                          |
| john@company.com is already a team       |
| member with the role "Sales".            |
|                                          |
|              [OK]                        |
+------------------------------------------+

CSV UPLOAD ERROR:
+------------------------------------------+
| [!] Invalid CSV file                      |
|                                          |
| The file could not be parsed.            |
| Please ensure it's a valid CSV with      |
| the required columns.                     |
|                                          |
| Required: email                           |
| Optional: role, message                   |
|                                          |
|     [Download Template]    [Try Again]   |
+------------------------------------------+

INVITATION SEND FAILED:
+------------------------------------------+
| [!] Failed to send invitation             |
|                                          |
| Could not send invitation to             |
| sarah@newcompany.com.                     |
|                                          |
| Error: Email service unavailable         |
|                                          |
|         [Retry]    [Cancel]              |
+------------------------------------------+
```

### Success States

```
INVITATION SENT:
+------------------------------------------+
| [checkmark] Invitation sent               |
|                                          |
| An invitation has been sent to           |
| sarah@newcompany.com.                     |
|                                          |
| They will have 7 days to accept.         |
|                                          |
| <- Toast notification (5s)               |
+------------------------------------------+

BULK INVITATIONS SENT:
+------------------------------------------+
| [checkmark] 3 invitations sent            |
|                                          |
| Invitations have been sent to:            |
| - sarah@new.com                           |
| - mike@new.com                            |
| - lisa@new.com                            |
|                                          |
| <- Toast notification (5s)               |
+------------------------------------------+

INVITATION RESENT:
+------------------------------------------+
| [checkmark] Invitation resent             |
|                                          |
| A new invitation has been sent to        |
| sarah@newcompany.com.                     |
|                                          |
| Expiration reset to 7 days.              |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

INVITATION CANCELLED:
+------------------------------------------+
| [checkmark] Invitation cancelled          |
|                                          |
| The invitation for                        |
| sarah@newcompany.com has been cancelled. |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+
```

### Expiration Badge States

```
ACTIVE (>3 days):
+---------------+
| [clock] 5 days|
+---------------+
^ Green badge

WARNING (<=3 days):
+---------------+
| [!] 2 days    |
+---------------+
^ Yellow/orange badge with pulse

EXPIRING SOON (<1 day):
+----------------+
| [!!] 12 hours  |
+----------------+
^ Red badge with attention animation

EXPIRED:
+---------------+
| [X] Expired   |
+---------------+
^ Red badge, strikethrough text
```

---

## Accessibility Notes

### Focus Order

1. **Invite Form**
   - Email input -> Role dropdown -> Personal message textarea
   - Expiration dropdown -> Preview button -> Send button

2. **Preview Dialog**
   - Close button -> Email preview (informational)
   - Edit button -> Send button

3. **Pending Invitations Table**
   - Tab headers -> Search/filter
   - Table rows -> Action buttons per row

4. **CSV Upload**
   - Drop zone -> File input
   - Validation results table
   - Download template -> Cancel -> Upload buttons

### Keyboard Navigation

```
FORM FIELDS:
- Tab: Move between fields
- Enter: Open dropdown, submit form (on button)
- Arrow keys: Navigate dropdown options

TABLE:
- Tab: Move through rows and action buttons
- Enter: Activate action button

FILE UPLOAD:
- Tab: Focus drop zone
- Enter/Space: Open file picker
- Escape: Cancel selection

PREVIEW:
- Tab: Move between buttons
- Escape: Close preview
```

### ARIA Requirements

```html
<!-- Invite Form -->
<form
  role="form"
  aria-labelledby="invite-form-title"
>
  <h2 id="invite-form-title">Invite New Team Member</h2>

  <label for="email">Email Address</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-error"
  />
  <span id="email-error" role="alert"></span>

  <label for="message">Personal Message (optional)</label>
  <textarea
    id="message"
    aria-describedby="message-counter"
    maxlength="500"
  ></textarea>
  <span id="message-counter" aria-live="polite">142/500 characters</span>
</form>

<!-- Preview Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="preview-title"
>
  <h2 id="preview-title">Invitation Preview</h2>
  <div
    role="document"
    aria-label="Email preview showing how the invitation will appear"
  >
    ...
  </div>
</dialog>

<!-- Pending Invitations Table -->
<table
  role="table"
  aria-label="Pending invitations"
>
  <thead>
    <tr>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
      <th scope="col">Invited</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>sarah@newcompany.com</td>
      <td>Sales</td>
      <td>Jan 10, 2026</td>
      <td>
        <span
          role="status"
          aria-label="Expires in 5 days"
        >
          5 days remaining
        </span>
      </td>
      <td>
        <button aria-label="Resend invitation to sarah@newcompany.com">
          Resend
        </button>
        <button aria-label="Cancel invitation for sarah@newcompany.com">
          Cancel
        </button>
      </td>
    </tr>
  </tbody>
</table>

<!-- File Upload -->
<div
  role="button"
  tabindex="0"
  aria-label="Drop zone for CSV file upload. Press Enter to browse files."
  aria-dropeffect="copy"
>
  Drag and drop CSV or click to browse
</div>

<!-- Expiration Badge -->
<span
  role="status"
  aria-label="Invitation expires in 5 days"
  class="badge expiring-soon"
>
  5 days
</span>
```

### Screen Reader Announcements

- Invitation sent: "Invitation sent to sarah@newcompany.com. They have 7 days to accept."
- Invitation resent: "Invitation resent to sarah@newcompany.com. Expiration reset to 7 days."
- Invitation cancelled: "Invitation for sarah@newcompany.com has been cancelled."
- CSV processed: "CSV file processed. 3 valid entries, 1 invalid, 1 skipped."
- Error: "Error: Invalid email address. Please enter a valid email."
- Expiring soon: "Warning: Invitation expires in 2 days."

---

## Animation Choreography

### Preview Panel

```
SLIDE IN:
- Duration: 250ms
- Easing: ease-out
- Transform: translateX(20px) -> translateX(0)
- Opacity: 0 -> 1

UPDATE (when form changes):
- Duration: 150ms
- Highlight flash on changed content
- Smooth text transitions
```

### Expiration Badge

```
WARNING PULSE:
- Duration: 2s
- Easing: ease-in-out
- Opacity: 1 -> 0.7 -> 1
- Scale: 1 -> 1.05 -> 1
- Loop: infinite for <=3 days

EXPIRED STATE:
- Duration: 300ms
- Color: transition to red
- Strikethrough: animate from left to right
```

### CSV Validation

```
ROW VALIDATION:
- Duration: 200ms per row
- Stagger: 50ms between rows
- Icon: scale bounce for status icon
- Background: flash green/red/yellow based on status

SUMMARY UPDATE:
- Duration: 300ms
- Counter: animate number changes
- Progress bar: fill animation
```

### Form Interactions

```
CHARACTER COUNTER:
- Duration: 150ms
- Color: transition as limit approaches
- Shake: when limit reached

FIELD VALIDATION:
- Duration: 200ms
- Error text: slide down and fade in
- Border: color transition to red

SUCCESS:
- Duration: 300ms
- Field: brief green highlight
- Check icon: scale bounce
```

### Toast/Notification

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1

AUTO-DISMISS:
- Delay: 5000ms
- Duration: 200ms
- Transform: translateX(0) -> translateX(100%)
- Opacity: 1 -> 0
```

---

## Component Props Interfaces

```typescript
// Invite User Dialog
interface InviteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InvitationFormData) => Promise<void>;
}

// Invitation Form Data
interface InvitationFormData {
  email: string;
  role: UserRole;
  personalMessage?: string;
  expiresInDays: number;
}

// Invitation Preview
interface InvitationPreviewProps {
  email: string;
  role: UserRole;
  inviterName: string;
  personalMessage?: string;
  expiresOn: Date;
  organizationName: string;
}

// Pending Invitations Table
interface PendingInvitationsTableProps {
  invitations: Invitation[];
  isLoading?: boolean;
  onResend: (invitationId: string) => Promise<void>;
  onCancel: (invitationId: string) => Promise<void>;
  onViewHistory: (invitationId: string) => void;
}

// Invitation Entity
interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: User;
  personalMessage?: string;
  sentAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  cancelledAt?: Date;
  resendCount: number;
  lastResendAt?: Date;
}

// Invitation History
interface InvitationHistoryDialogProps {
  isOpen: boolean;
  invitation: Invitation;
  history: InvitationHistoryEntry[];
  onClose: () => void;
  onResend: () => Promise<void>;
  onCancel: () => Promise<void>;
}

// History Entry
interface InvitationHistoryEntry {
  id: string;
  timestamp: Date;
  event: InvitationEvent;
  actor?: string;
  metadata?: Record<string, unknown>;
}

// Invitation Events
type InvitationEvent =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'resent'
  | 'accepted'
  | 'expired'
  | 'cancelled';

// CSV Upload
interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (validEntries: CSVInviteEntry[]) => Promise<void>;
}

// CSV Entry
interface CSVInviteEntry {
  rowNumber: number;
  email: string;
  role?: UserRole;
  message?: string;
  status: 'valid' | 'invalid' | 'duplicate' | 'existing';
  error?: string;
}

// CSV Validation Result
interface CSVValidationResult {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  entries: CSVInviteEntry[];
}

// Expiration Badge
interface ExpirationBadgeProps {
  expiresAt: Date;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

// Resend Confirmation
interface ResendConfirmationDialogProps {
  isOpen: boolean;
  invitation: Invitation;
  onClose: () => void;
  onConfirm: (newMessage?: string) => Promise<void>;
}

// Cancel Confirmation
interface CancelConfirmationDialogProps {
  isOpen: boolean;
  invitation: Invitation;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Character Counter
interface CharacterCounterProps {
  current: number;
  max: number;
  warningThreshold?: number;  // default 80%
}

// Hook
interface UseInvitationsReturn {
  invitations: Invitation[];
  isLoading: boolean;
  error: Error | null;
  sendInvitation: (data: InvitationFormData) => Promise<void>;
  resendInvitation: (id: string, newMessage?: string) => Promise<void>;
  cancelInvitation: (id: string) => Promise<void>;
  uploadCSV: (file: File) => Promise<CSVValidationResult>;
  sendBulkInvitations: (entries: CSVInviteEntry[]) => Promise<void>;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/users/invite-user-dialog.tsx` | Main invite dialog |
| `src/components/domain/users/invitation-form.tsx` | Invitation form |
| `src/components/domain/users/invitation-preview.tsx` | Email preview |
| `src/components/domain/users/pending-invitations-table.tsx` | Invitations list |
| `src/components/domain/users/invitation-history-dialog.tsx` | History view |
| `src/components/domain/users/csv-upload-dialog.tsx` | Bulk upload |
| `src/components/domain/users/csv-validation-table.tsx` | Validation results |
| `src/components/domain/users/expiration-badge.tsx` | Expiry indicator |
| `src/components/domain/users/resend-confirmation.tsx` | Resend dialog |
| `src/components/domain/users/cancel-confirmation.tsx` | Cancel dialog |
| `src/components/shared/character-counter.tsx` | Input counter |
| `src/hooks/use-invitations.ts` | Invitations data hook |
| `src/utils/csv-parser.ts` | CSV parsing utility |
| `src/server/functions/invitations/` | Server functions directory |
