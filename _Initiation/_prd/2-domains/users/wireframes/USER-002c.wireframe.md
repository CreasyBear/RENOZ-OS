# Wireframe: DOM-USER-002c - User Groups UI

## Story Reference

- **Story ID**: DOM-USER-002c
- **Name**: User Groups UI
- **PRD**: memory-bank/prd/domains/users.prd.json
- **Type**: UI Component
- **Component Type**: Settings section with DataTable and Dialog

## Overview

UI for managing user groups and membership. Includes group management section in settings using DataTable for group list, create/edit group Dialog with Form, add/remove users from groups using multi-select Combobox with user search, and Group Badge on user profile showing group memberships. Also includes filter user list by group using Select dropdown.

## UI Patterns (Reference Implementation)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Group list with columns for name, lead, member count
  - Inline action buttons (Edit, Delete) per row
  - Searchable group name column

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Create/edit group modal with form fields
  - Add members multi-select dialog
  - Delete confirmation with typed verification

### Combobox
- **Pattern**: RE-UI Combobox
- **Reference**: `_reference/.reui-reference/registry/default/ui/combobox.tsx`
- **Features**:
  - User search with autocomplete for group members
  - Multi-select mode for bulk adding users
  - Display selected users as removable tags

### Badge
- **Pattern**: RE-UI Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Group membership badges on user profiles
  - "Lead" indicator badge for group leaders
  - Overflow badge showing "+X more" for multiple groups

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `userGroups`, `userGroupMembers` tables in `renoz-v2/lib/schema/user-groups.ts` | NOT CREATED |
| **Server Functions Required** | `createUserGroup`, `addUserToGroup`, `removeUserFromGroup`, `getUserGroups` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-USER-002a (schema), DOM-USER-002b (server functions) | PENDING |

### Existing Schema Available
- `users` in `renoz-v2/lib/schema/users.ts` (user records with role, status)
- `organizations` in `renoz-v2/lib/schema/organizations.ts` (org context)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Team Size**: 5-15 users per organization
- **Roles**: Admin, Sales, Warehouse, Viewer (4 core roles)
- **Groups**: For organizing teams (e.g., "Sydney Team", "Battery Specialists")

---

## Mobile Wireframe (375px)

### Group Management - List View (Mobile Card Layout)

```
+----------------------------------------+
| <- Settings                            |
+----------------------------------------+
| User Groups                   [+ New]  |
| Organize team members into groups      |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | Sales Team                         | |
| | ---------------------------------  | |
| | 8 members                          | |
| | Lead: Sarah Johnson                | |
| |                                    | |
| | Marketing, Sales, Support          | |
| |                   [Edit] [Delete]  | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | Operations                         | |
| | ---------------------------------  | |
| | 5 members                          | |
| | Lead: Mike Chen                    | |
| |                                    | |
| | Warehouse, Logistics               | |
| |                   [Edit] [Delete]  | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | Management                         | |
| | ---------------------------------  | |
| | 3 members                          | |
| | Lead: Jane Doe                     | |
| |                                    | |
| | Executive, Strategy                | |
| |                   [Edit] [Delete]  | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
```

### Create/Edit Group - Bottom Sheet (Mobile)

```
+----------------------------------------+
| Create Group                     [X]   |
+----------------------------------------+
|                                        |
| Group Name *                           |
| +------------------------------------+ |
| | Sales Team                         | |
| +------------------------------------+ |
|                                        |
| Description                            |
| +------------------------------------+ |
| | Front-line sales representatives   | |
| | and account managers               | |
| +------------------------------------+ |
|                                        |
| Group Lead                             |
| +--------------------------------- v + |
| | Select a user...                   | |
| +------------------------------------+ |
|                                        |
| --------------------------------       |
|                                        |
| Members (8)                            |
| +------------------------------------+ |
| | [Search users...             ] [+] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] Sarah Johnson (Lead)      | |
| |          Sales Manager      [x]    | |
| +------------------------------------+ |
| | [Avatar] John Smith                | |
| |          Sales Rep          [x]    | |
| +------------------------------------+ |
| | [Avatar] Emily Davis               | |
| |          Sales Rep          [x]    | |
| +------------------------------------+ |
| | ... 5 more members                 | |
|                                        |
+----------------------------------------+
|       (Cancel)        [Save Group]     |
+----------------------------------------+
```

### User Search Combobox (Mobile)

```
+----------------------------------------+
| Add Members                      [X]   |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [Search by name or email...     ]  | |
| +------------------------------------+ |
|                                        |
| Available Users:                       |
|                                        |
| +------------------------------------+ |
| | [x] Sarah Johnson                  | |
| |     sarah@company.com              | |
| |     Sales Manager                  | |
| +------------------------------------+ |
| | [ ] John Smith                     | |
| |     john@company.com               | |
| |     Sales Rep                      | |
| +------------------------------------+ |
| | [ ] Emily Davis                    | |
| |     emily@company.com              | |
| |     Sales Rep                      | |
| +------------------------------------+ |
| | [x] Mike Chen                      | |
| |     mike@company.com               | |
| |     Operations Lead                | |
| +------------------------------------+ |
|                                        |
| Selected: 2 users                      |
|                                        |
+----------------------------------------+
|                           [Add Members]|
+----------------------------------------+
```

### Group Badges on User Profile (Mobile)

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
|   +----------------------------------+ |
|                                        |
|   Groups:                              |
|   [Sales Team] [Marketing] +1         |
|                                        |
+----------------------------------------+
```

### User List - Filter by Group (Mobile)

```
+----------------------------------------+
| Users                         [+ New]  |
+----------------------------------------+
| +------------------------------------+ |
| | [Search users...              ]    | |
| +------------------------------------+ |
| +------------------+ +---------------+ |
| | Role: All     v  | | Group: All  v | |
| +------------------+ +---------------+ |
+----------------------------------------+
| Active filter: Sales Team   [Clear]    |
+----------------------------------------+
|                                        |
| +------------------------------------+ |
| | [Avatar] Sarah Johnson             | |
| | sarah@company.com                  | |
| | Sales Manager                      | |
| | [Sales Team] [Lead]     Active [*] | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | [Avatar] John Smith                | |
| | john@company.com                   | |
| | Sales Rep                          | |
| | [Sales Team]            Active [*] | |
| +------------------------------------+ |
|                                        |
+----------------------------------------+
```

---

## Tablet Wireframe (768px)

### Group Management - Compact DataTable (Tablet)

```
+----------------------------------------------------------------+
| <- Settings                                                     |
+----------------------------------------------------------------+
| User Groups                                          [+ New Group]|
| Organize team members into groups for easier management         |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | Group Name      | Lead           | Members | Actions        | |
| +-------------------------------------------------------------+ |
| | Sales Team      | Sarah Johnson  | 8       | [Edit][Delete] | |
| | Operations      | Mike Chen      | 5       | [Edit][Delete] | |
| | Management      | Jane Doe       | 3       | [Edit][Delete] | |
| | Marketing       | Lisa Wong      | 6       | [Edit][Delete] | |
| | Support         | Tom Brown      | 4       | [Edit][Delete] | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Showing 1-5 of 5 groups                                         |
|                                                                 |
+----------------------------------------------------------------+
```

### Create/Edit Group - Slide-over Panel (Tablet)

```
+-----------------------------------------------+----------------+
| Settings > User Groups                        | Edit Group [X] |
+-----------------------------------------------+----------------+
|                                               |                |
| +-------------------------------------------+ | Group Details  |
| | Group Name      | Lead      | Members    || | -------------- |
| +-------------------------------------------+ |                |
| | Sales Team      | Sarah J.  | 8          || | Name *         |
| | Operations      | Mike C.   | 5          || | +-----------+  |
| | ...                                      || | |Sales Team |  |
| +-------------------------------------------+ | +-----------+  |
|                                               |                |
|                                               | Description    |
|                                               | +-----------+  |
|                                               | |Front-line |  |
|                                               | |sales team |  |
|                                               | +-----------+  |
|                                               |                |
|                                               | Lead           |
|                                               | +----------v+  |
|                                               | |Sarah Johns|  |
|                                               | +-----------+  |
|                                               |                |
|                                               | -------------- |
|                                               |                |
|                                               | Members (8)    |
|                                               | [+ Add Member] |
|                                               |                |
|                                               | [Av] Sarah J.  |
|                                               |     Lead  [x]  |
|                                               | [Av] John S.   |
|                                               |     Member[x]  |
|                                               | [Av] Emily D.  |
|                                               |     Member[x]  |
|                                               | ... 5 more     |
|                                               |                |
|                                               | -------------- |
|                                               | (Cancel)[Save] |
+-----------------------------------------------+----------------+
```

### User List with Group Filter (Tablet)

```
+----------------------------------------------------------------+
| Users                                          [+ Invite User]  |
+----------------------------------------------------------------+
| [Search users________________] [Role: All v] [Group: All v]     |
| Active filter: [Sales Team x]                    [Clear All]    |
+----------------------------------------------------------------+
|                                                                 |
| +-------------------------------------------------------------+ |
| | [ ] | User              | Email            | Groups | Status | |
| +-------------------------------------------------------------+ |
| | [ ] | Sarah Johnson     | sarah@co.com     | Sales  | Active | |
| |     | Sales Manager     |                  | Lead   |    [*] | |
| +-------------------------------------------------------------+ |
| | [ ] | John Smith        | john@co.com      | Sales  | Active | |
| |     | Sales Rep         |                  |        |    [*] | |
| +-------------------------------------------------------------+ |
| | [ ] | Emily Davis       | emily@co.com     | Sales  | Active | |
| |     | Sales Rep         |                  |        |    [*] | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Showing 1-8 of 8 users in "Sales Team"                          |
|                                                                 |
+----------------------------------------------------------------+
```

---

## Desktop Wireframe (1280px+)

### Group Management - Full DataTable (Desktop)

```
+-------------------------------------------------------------------------------------------+
| [Logo] Renoz CRM       Dashboard | Customers | Orders | Settings       [Bell] [User]      |
+--------+----------------------------------------------------------------------------------+
|        |                                                                                  |
| General|  User Groups                                                    [+ New Group]    |
| -----  |  Organize team members into groups for easier management                         |
| Users  |  ------------------------------------------------------------------------------- |
| -----  |                                                                                  |
| Groups |  [Search groups_______________]                                                  |
| <----  |                                                                                  |
| Roles  |  +--------------------------------------------------------------------------+   |
| -----  |  |                                                                          |   |
| Billing|  |  Group Name        | Description              | Lead          | Members  |   |
| -----  |  +--------------------------------------------------------------------------+   |
| Integr |  |  Sales Team        | Front-line sales team    | Sarah Johnson | 8 users  |   |
|        |  |                    | and account managers     |               | [View]   |   |
|        |  |                    |                          |               |[Ed][Del] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  |  Operations        | Warehouse and logistics  | Mike Chen     | 5 users  |   |
|        |  |                    | operations team          |               | [View]   |   |
|        |  |                    |                          |               |[Ed][Del] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  |  Management        | Executive leadership     | Jane Doe      | 3 users  |   |
|        |  |                    | and strategic planning   |               | [View]   |   |
|        |  |                    |                          |               |[Ed][Del] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  |  Marketing         | Marketing and brand      | Lisa Wong     | 6 users  |   |
|        |  |                    | management team          |               | [View]   |   |
|        |  |                    |                          |               |[Ed][Del] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |  |  Support           | Customer support and     | Tom Brown     | 4 users  |   |
|        |  |                    | service representatives  |               | [View]   |   |
|        |  |                    |                          |               |[Ed][Del] |   |
|        |  +--------------------------------------------------------------------------+   |
|        |                                                                                  |
|        |  Showing 1-5 of 5 groups                                                         |
|        |                                                                                  |
+--------+----------------------------------------------------------------------------------+
```

### Create/Edit Group - Modal Dialog (Desktop)

```
+------------------------------------------------------------------------------+
| Create New Group                                                        [X]   |
+------------------------------------------------------------------------------+
|                                                                               |
|  +-------------------------------------------------------------------------+ |
|  |                                                                         | |
|  |  Group Details                                                          | |
|  |  ---------------------------------------------------------------------  | |
|  |                                                                         | |
|  |  Group Name *                           Description                     | |
|  |  +---------------------------+          +-----------------------------+ | |
|  |  | Sales Team                |          | Front-line sales            | | |
|  |  +---------------------------+          | representatives and         | | |
|  |                                         | account managers            | | |
|  |                                         +-----------------------------+ | |
|  |                                                                         | |
|  |  Group Lead                                                             | |
|  |  +--------------------------------------------------v+                  | |
|  |  | [Av] Sarah Johnson - sarah@company.com            |                  | |
|  |  +---------------------------------------------------+                  | |
|  |  The group lead receives notifications about group changes              | |
|  |                                                                         | |
|  +-------------------------------------------------------------------------+ |
|                                                                               |
|  +-------------------------------------------------------------------------+ |
|  |                                                                         | |
|  |  Group Members (8)                                    [+ Add Members]   | |
|  |  ---------------------------------------------------------------------  | |
|  |                                                                         | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | User                    | Role in Group    | Joined       | Remove| | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | [Av] Sarah Johnson      | Lead             | Jan 1, 2026  |  [x]  | | |
|  |  |      Sales Manager      |                  |              |       | | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | [Av] John Smith         | Member           | Jan 5, 2026  |  [x]  | | |
|  |  |      Sales Rep          |                  |              |       | | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | [Av] Emily Davis        | Member           | Jan 5, 2026  |  [x]  | | |
|  |  |      Sales Rep          |                  |              |       | | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | [Av] Mark Wilson        | Member           | Jan 8, 2026  |  [x]  | | |
|  |  |      Account Executive  |                  |              |       | | |
|  |  +-------------------------------------------------------------------+ | |
|  |  | ... 4 more members                                                | | |
|  |  +-------------------------------------------------------------------+ | |
|  |                                                                         | |
|  +-------------------------------------------------------------------------+ |
|                                                                               |
|                                           (Cancel)         [Save Group]       |
|                                                                               |
+------------------------------------------------------------------------------+
```

### Add Members Dialog (Desktop)

```
+-----------------------------------------------------------------------+
| Add Members to Sales Team                                        [X]   |
+-----------------------------------------------------------------------+
|                                                                        |
|  +------------------------------------------------------------------+ |
|  | [Search by name or email...                                   ]  | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  Selected (3):                                                         |
|  [Mike Chen x] [Lisa Wong x] [Tom Brown x]                             |
|                                                                        |
|  Available Users:                                                      |
|  +------------------------------------------------------------------+ |
|  |                                                                  | |
|  | [x] Mike Chen                                                    | |
|  |     mike@company.com | Operations Lead | Operations              | |
|  |                                                                  | |
|  | [x] Lisa Wong                                                    | |
|  |     lisa@company.com | Marketing Manager | Marketing             | |
|  |                                                                  | |
|  | [x] Tom Brown                                                    | |
|  |     tom@company.com | Support Lead | Support                     | |
|  |                                                                  | |
|  | [ ] Jane Doe                                                     | |
|  |     jane@company.com | CEO | Management                          | |
|  |                                                                  | |
|  | [ ] Alex Turner                                                  | |
|  |     alex@company.com | Developer | Engineering                   | |
|  |                                                                  | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  Showing 5 of 12 available users                                       |
|                                                                        |
|                                    (Cancel)         [Add 3 Members]    |
|                                                                        |
+-----------------------------------------------------------------------+
```

### User Profile - Group Badges (Desktop)

```
+-------------------------------------------------------------------------------------------+
| User Detail: John Smith                                                                   |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  |                                                                                     | |
|  |  [Avatar]    John Smith                                    [Edit] [More Actions v] | |
|  |              john.smith@company.com                                                | |
|  |              Department: Sales | Role: Sales Rep | Last Active: 2 hours ago        | |
|  |                                                                                     | |
|  |              Status: [Active]     Role: [Sales Rep]                                | |
|  |                                                                                     | |
|  |              Groups:                                                                | |
|  |              [Sales Team] [Marketing] [Project Alpha]                               | |
|  |               ^hover shows: "8 members, Lead: Sarah Johnson"                        | |
|  |                                                                                     | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

### User List with Group Column and Filter (Desktop)

```
+-------------------------------------------------------------------------------------------+
| Users                                                              [+ Invite User]        |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
| [Search users________________________] [Role: All v] [Group v] [Status: All v]            |
|                                                                                           |
| Active filters: [Sales Team x]                                         [Clear All]        |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  +-------------------------------------------------------------------------------------+ |
|  | [ ] | User                 | Email              | Role        | Groups      |Status | |
|  +-------------------------------------------------------------------------------------+ |
|  | [ ] | [Av] Sarah Johnson   | sarah@company.com  | Admin       | [Sales][+2] |[*]Act | |
|  |     |      Sales Manager   |                    |             |  Lead       |       | |
|  +-------------------------------------------------------------------------------------+ |
|  | [ ] | [Av] John Smith      | john@company.com   | Sales       | [Sales]     |[*]Act | |
|  |     |      Sales Rep       |                    |             |             |       | |
|  +-------------------------------------------------------------------------------------+ |
|  | [ ] | [Av] Emily Davis     | emily@company.com  | Sales       | [Sales]     |[*]Act | |
|  |     |      Sales Rep       |                    |             |             |       | |
|  +-------------------------------------------------------------------------------------+ |
|  | [ ] | [Av] Mark Wilson     | mark@company.com   | Sales       | [Sales]     |[*]Act | |
|  |     |      Account Exec    |                    |             | [Market]    |       | |
|  +-------------------------------------------------------------------------------------+ |
|                                                                                           |
|  Showing 1-8 of 8 users in "Sales Team"                    < 1 >                          |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
GROUP LIST LOADING:
+-------------------------------------------------------------+
| User Groups                                                  |
+-------------------------------------------------------------+
|                                                              |
| +----------------------------------------------------------+ |
| | [....................] | [..........] | [....] | [....]  | |
| | [....................] | [..........] | [....] | [....]  | |
| | [....................] | [..........] | [....] | [....]  | |
| | [....................] | [..........] | [....] | [....]  | |
| +----------------------------------------------------------+ |
|                                                              |
| Loading groups...                                            |
+-------------------------------------------------------------+
^ Skeleton rows with shimmer animation

MEMBER LIST LOADING (in dialog):
+----------------------------------+
| Members                          |
+----------------------------------+
| [..................] [...] [..]  |
| [..................] [...] [..]  |
| [..................] [...] [..]  |
+----------------------------------+
^ Skeleton rows with shimmer

SAVING GROUP:
+----------------------------------+
|                                  |
| [Spinner] Saving group...        |
|                                  |
+----------------------------------+
```

### Empty States

```
NO GROUPS CREATED:
+-------------------------------------------------------------+
|                                                              |
|               +------------------+                           |
|               |   [group icon]   |                           |
|               +------------------+                           |
|                                                              |
|              No groups created yet                           |
|                                                              |
|     Groups help you organize team members                    |
|     for easier management and filtering.                     |
|                                                              |
|           [+ Create Your First Group]                        |
|                                                              |
+-------------------------------------------------------------+

GROUP HAS NO MEMBERS:
+----------------------------------+
| Members (0)       [+ Add Members]|
+----------------------------------+
|                                  |
|        No members yet            |
|                                  |
|   Add team members to this       |
|   group to get started.          |
|                                  |
+----------------------------------+

NO USERS MATCH FILTER:
+-------------------------------------------------------------+
|                                                              |
|     No users found in "Sales Team"                           |
|                                                              |
|     This group currently has no members                      |
|     or all members have been filtered out.                   |
|                                                              |
|     [Clear Filters]    [Add Members to Group]                |
|                                                              |
+-------------------------------------------------------------+
```

### Error States

```
FAILED TO LOAD GROUPS:
+-------------------------------------------------------------+
|                                                              |
|  +--------------------------------------------------------+ |
|  | [!] Failed to load groups                               | |
|  |                                                          | |
|  | There was a problem loading the group list.             | |
|  | Please try again.                                        | |
|  |                                                          | |
|  |                      [Retry]                             | |
|  +--------------------------------------------------------+ |
|                                                              |
+-------------------------------------------------------------+

FAILED TO DELETE GROUP:
+------------------------------------------+
| [!] Cannot delete group                   |
|                                          |
| "Sales Team" still has 8 members.        |
| Remove all members before deleting.      |
|                                          |
|              [OK]                        |
+------------------------------------------+

FAILED TO ADD MEMBER:
+------------------------------------------+
| [!] Failed to add member                  |
|                                          |
| Could not add John Smith to Sales Team.  |
| They may already be a member.            |
|                                          |
|          [Retry]    [Cancel]             |
+------------------------------------------+
```

### Success States

```
GROUP CREATED:
+------------------------------------------+
| [checkmark] Group "Sales Team" created    |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

MEMBER ADDED:
+------------------------------------------+
| [checkmark] 3 members added to Sales Team |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

MEMBER REMOVED:
+------------------------------------------+
| [checkmark] John Smith removed from group |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+

GROUP DELETED:
+------------------------------------------+
| [checkmark] Group "Marketing" deleted     |
|                                          |
| <- Toast notification (3s)               |
+------------------------------------------+
```

### Delete Confirmation

```
DELETE GROUP CONFIRMATION:
+--------------------------------------------------+
| Delete Group                                [X]   |
+--------------------------------------------------+
|                                                   |
|  Are you sure you want to delete "Sales Team"?   |
|                                                   |
|  This will:                                       |
|  - Remove all 8 members from this group          |
|  - Delete the group permanently                   |
|  - This action cannot be undone                   |
|                                                   |
|  Type "Sales Team" to confirm:                    |
|  +---------------------------------------------+ |
|  | __________________________________________ | |
|  +---------------------------------------------+ |
|                                                   |
|                    (Cancel)    [Delete Group]     |
|                                (disabled until    |
|                                 name matches)     |
+--------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Group List Page**
   - Search input -> New Group button
   - Tab through table rows -> Edit button -> Delete button
   - Pagination controls

2. **Create/Edit Dialog**
   - Group name input -> Description textarea
   - Lead selector combobox
   - Add Members button -> Member list
   - Remove member buttons (in tab order)
   - Cancel -> Save buttons

3. **Add Members Dialog**
   - Search input
   - User checkboxes (in list order)
   - Cancel -> Add Members buttons

### Keyboard Navigation

```
GROUP TABLE:
- Tab: Move through table rows and action buttons
- Enter: Open group for editing (on row)
- Delete: Open delete confirmation (with row focused)

MEMBER SELECTOR COMBOBOX:
- Tab: Focus combobox
- Enter/Space: Open dropdown
- Arrow Up/Down: Navigate options
- Enter/Space: Toggle selection
- Escape: Close dropdown

DIALOG:
- Tab: Move through form fields
- Escape: Close dialog (with confirmation if changes)
- Enter: Submit form (when on Save button)
```

### ARIA Requirements

```html
<!-- Group Table -->
<table
  role="table"
  aria-label="User groups"
>
  <thead>
    <tr>
      <th scope="col">Group Name</th>
      <th scope="col">Description</th>
      <th scope="col">Lead</th>
      <th scope="col">Members</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sales Team</td>
      ...
      <td>
        <button aria-label="Edit Sales Team group">Edit</button>
        <button aria-label="Delete Sales Team group">Delete</button>
      </td>
    </tr>
  </tbody>
</table>

<!-- Create/Edit Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="group-dialog-title"
>
  <h2 id="group-dialog-title">Create New Group</h2>
  ...
</dialog>

<!-- Group Lead Combobox -->
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input
    type="text"
    aria-label="Select group lead"
    aria-autocomplete="list"
    aria-controls="lead-listbox"
  />
  <ul id="lead-listbox" role="listbox" aria-label="Available users">
    <li role="option" aria-selected="false">Sarah Johnson</li>
    ...
  </ul>
</div>

<!-- Member List -->
<ul
  role="list"
  aria-label="Group members, 8 total"
>
  <li>
    <span>Sarah Johnson (Lead)</span>
    <button aria-label="Remove Sarah Johnson from group">Remove</button>
  </li>
  ...
</ul>

<!-- Group Badge -->
<span
  role="listitem"
  aria-label="Member of Sales Team group, 8 members, lead: Sarah Johnson"
  tabindex="0"
>
  Sales Team
</span>

<!-- Group Filter -->
<select
  aria-label="Filter by group"
>
  <option value="">All Groups</option>
  <option value="sales">Sales Team (8)</option>
  ...
</select>
```

### Screen Reader Announcements

- Group created: "Group Sales Team created successfully with 3 members"
- Member added: "John Smith added to Sales Team"
- Member removed: "John Smith removed from Sales Team"
- Filter applied: "Showing 8 users in Sales Team group"
- Delete confirmation: "Confirm deletion of Sales Team group"
- Loading: "Loading groups"
- Error: "Failed to load groups, retry available"

---

## Animation Choreography

### Dialog Open/Close

```
OPEN (Modal):
- Duration: 250ms
- Easing: ease-out
- Backdrop: opacity 0 -> 0.5 (200ms)
- Dialog: scale(0.95) -> scale(1), opacity 0 -> 1
- Focus trap activated

OPEN (Slide-over - Tablet):
- Duration: 300ms
- Easing: ease-out
- Panel: translateX(100%) -> translateX(0)
- Backdrop: opacity 0 -> 0.3

CLOSE:
- Duration: 200ms
- Easing: ease-in
- Reverse of open animations
- Focus returned to trigger element
```

### Member List Operations

```
ADD MEMBER:
- Duration: 250ms
- Easing: ease-out
- New row: opacity 0 -> 1, translateY(-10px) -> translateY(0)
- Existing rows: shift down smoothly

REMOVE MEMBER:
- Duration: 200ms
- Easing: ease-in
- Row: opacity 1 -> 0, translateX(0) -> translateX(-20px)
- Height: collapse to 0 (150ms delay)
- Remaining rows: shift up smoothly (200ms)
```

### Badge Interactions

```
BADGE HOVER:
- Duration: 150ms
- Transform: scale(1) -> scale(1.02)
- Box-shadow: elevation increase

BADGE CLICK (show tooltip):
- Duration: 200ms
- Tooltip: opacity 0 -> 1, translateY(8px) -> translateY(0)

BADGE APPEAR (on profile):
- Duration: 200ms
- Easing: ease-out
- Scale: 0.8 -> 1
- Opacity: 0 -> 1
- Stagger: 50ms between badges
```

### Filter Application

```
FILTER APPLIED:
- Duration: 300ms
- Easing: ease-in-out
- Old rows: fade out (150ms)
- New rows: fade in with stagger (200ms)
- Count badge: pulse animation
```

---

## Component Props Interfaces

```typescript
// Group Management Page
interface UserGroupsPageProps {
  organizationId: string;
}

// Group Entity
interface UserGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  leadId?: string;
  lead?: User;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Group Member
interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: 'lead' | 'member';
  joinedAt: Date;
}

// Group Table Component
interface GroupTableProps {
  groups: UserGroup[];
  isLoading?: boolean;
  error?: Error | null;
  onEdit: (group: UserGroup) => void;
  onDelete: (group: UserGroup) => void;
  onView: (group: UserGroup) => void;
}

// Create/Edit Group Dialog
interface GroupDialogProps {
  isOpen: boolean;
  group?: UserGroup | null;  // null for create mode
  onClose: () => void;
  onSave: (data: GroupFormData) => Promise<void>;
}

// Group Form Data
interface GroupFormData {
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
}

// Add Members Dialog
interface AddMembersDialogProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  onClose: () => void;
  onAdd: (userIds: string[]) => Promise<void>;
}

// User Search Combobox
interface UserSearchComboboxProps {
  selectedUserIds: string[];
  excludeUserIds?: string[];
  placeholder?: string;
  onSelectionChange: (userIds: string[]) => void;
  multiple?: boolean;
}

// Group Badge Component
interface GroupBadgeProps {
  group: UserGroup;
  showTooltip?: boolean;
  isLead?: boolean;
  onRemove?: () => void;  // if in edit mode
}

// Group Badges List
interface GroupBadgesListProps {
  groups: UserGroup[];
  maxVisible?: number;  // default 3, show "+X more"
  userId?: string;  // to determine if user is lead
}

// User List Group Filter
interface UserListGroupFilterProps {
  groups: UserGroup[];
  selectedGroupId?: string;
  onChange: (groupId: string | undefined) => void;
}

// Delete Confirmation Dialog
interface DeleteGroupDialogProps {
  isOpen: boolean;
  group: UserGroup;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Empty State Component
interface GroupEmptyStateProps {
  type: 'no-groups' | 'no-members' | 'no-results';
  onAction?: () => void;
  actionLabel?: string;
}

// Member Row Component
interface MemberRowProps {
  member: GroupMember;
  isLead: boolean;
  onRemove: () => void;
  onMakeLead?: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/routes/_authed/settings/groups.tsx` | Groups settings page |
| `src/components/domain/users/group-table.tsx` | DataTable for group list |
| `src/components/domain/users/group-dialog.tsx` | Create/edit group dialog |
| `src/components/domain/users/add-members-dialog.tsx` | Add members multi-select |
| `src/components/domain/users/user-search-combobox.tsx` | User search with multi-select |
| `src/components/domain/users/group-badge.tsx` | Individual group badge |
| `src/components/domain/users/group-badges-list.tsx` | List of badges with overflow |
| `src/components/domain/users/member-row.tsx` | Member row in dialog |
| `src/components/domain/users/group-empty-state.tsx` | Empty states |
| `src/hooks/use-user-groups.ts` | Groups data fetching |
| `src/hooks/use-group-members.ts` | Members data fetching |
| `src/server/functions/groups/` | Server functions directory |
