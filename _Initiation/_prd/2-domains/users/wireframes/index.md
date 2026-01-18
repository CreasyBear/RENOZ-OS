# Users Domain Wireframes Index

> **Domain**: Users/Team Domain (DOM-USERS)
> **PRD**: memory-bank/prd/domains/users.prd.json
> **Last Updated**: January 10, 2026

---

## Overview

This index documents all wireframes for the Users/Team domain, covering user management, invitations, team administration, user profiles, roles, permissions, and team organization features.

---

## Wireframes Summary

| Story ID | Name | Wireframe File | Component Type | Priority |
|----------|------|----------------|----------------|----------|
| DOM-USER-001 | Enhance User Activity View | [DOM-USER-001.wireframe.md](./DOM-USER-001.wireframe.md) | Activity Tab with DataTable | 1 |
| DOM-USER-002c | User Groups UI | [DOM-USER-002c.wireframe.md](./DOM-USER-002c.wireframe.md) | Settings section with DataTable and Dialog | 4 |
| DOM-USER-003c | Delegation UI | [DOM-USER-003c.wireframe.md](./DOM-USER-003c.wireframe.md) | Form section with Alert banner | 7 |
| DOM-USER-004 | Avatar Image Cropper | [DOM-USER-004.wireframe.md](./DOM-USER-004.wireframe.md) | Image Cropper Dialog | 8 |
| DOM-USER-005c | Last Login UI Display | [DOM-USER-005c.wireframe.md](./DOM-USER-005c.wireframe.md) | DataTable column with Badge | 11 |
| DOM-USER-006b | Bulk User Operations UI | [DOM-USER-006b.wireframe.md](./DOM-USER-006b.wireframe.md) | Bulk action toolbar with Dialog | 13 |
| DOM-USER-007c | User Onboarding UI | [DOM-USER-007c.wireframe.md](./DOM-USER-007c.wireframe.md) | Dashboard Card with checklist | 16 |
| DOM-USER-008c | Invitation Enhancement UI | [DOM-USER-008c.wireframe.md](./DOM-USER-008c.wireframe.md) | Form with preview Card | 19 |

---

## Wireframe Details

### DOM-USER-001: Enhance User Activity View

**Purpose**: Add dedicated activity tab with pagination and export to user detail sidebar

**Key Components**:
- Activity tab panel on user detail sidebar
- Paginated activity table (10 items per page)
- Export activity log dialog with date range and field selection
- Filter controls for action type and date range

**Responsive Layouts**:
- **Mobile (375px)**: Full-width activity cards, bottom sheet for export
- **Tablet (768px)**: Compact table view, slide-over dialogs
- **Desktop (1280px+)**: Full table with filters, modal export dialog

**States**: Loading skeleton, empty (no activity), error with retry, filter no results

---

### DOM-USER-002c: User Groups UI

**Purpose**: UI for managing user groups and membership

**Key Components**:
- Group management section in settings
- DataTable for group list
- Create/edit group Dialog with form
- Multi-select Combobox for adding users
- Group Badge on user profiles
- Filter user list by group

**Responsive Layouts**:
- **Mobile (375px)**: Card list for groups, bottom sheet for edit
- **Tablet (768px)**: Compact DataTable, slide-over edit panel
- **Desktop (1280px+)**: Full DataTable, modal edit dialog

**States**: Loading, empty (no groups), empty (no members), error, delete confirmation

---

### DOM-USER-003c: Delegation UI

**Purpose**: UI for setting up and viewing delegations (out of office)

**Key Components**:
- Delegation settings form in user settings
- Delegate user picker Combobox
- DateRangePicker for start/end dates
- Delegation indicator Badge on user profile
- Active delegation Alert banner on dashboard
- Delegated tasks view for delegates

**Responsive Layouts**:
- **Mobile (375px)**: Stacked form fields, full-width date picker
- **Tablet (768px)**: Two-column form layout
- **Desktop (1280px+)**: Compact form with inline date range

**States**: Loading, no active delegation, delegation active, cancel confirmation, error

---

### DOM-USER-004: Avatar Image Cropper

**Purpose**: Add client-side image cropper before avatar upload

**Key Components**:
- Image drop zone with drag-and-drop support
- Image cropper with circular crop overlay
- Zoom, rotation, and flip controls
- Preview of cropped result
- Upload progress indicator

**Responsive Layouts**:
- **Mobile (375px)**: Full-screen cropper, touch gestures for zoom/pan
- **Tablet (768px)**: Side-by-side cropper and preview
- **Desktop (1280px+)**: Full cropper dialog with controls

**States**: Image loading, processing, upload progress, error (file too large, invalid type)

---

### DOM-USER-005c: Last Login UI Display

**Purpose**: Show last login in user views with inactive alert

**Key Components**:
- Last login column in user list DataTable
- Relative time format with exact time on hover
- Visual indicator Badge (warning) for users inactive >30 days
- Sort by last login in table column header
- Inactive user alert banner with actions

**Responsive Layouts**:
- **Mobile (375px)**: Last login hidden in table, shown in detail view
- **Tablet (768px)**: Compact last login column with relative time
- **Desktop (1280px+)**: Full column with hover tooltip for exact time

**States**: Loading, no users match filter, inactive badge pulse, error

---

### DOM-USER-006b: Bulk User Operations UI

**Purpose**: Complete bulk operations UI with progress indicator

**Key Components**:
- Bulk action toolbar (Change Role, Add to Group, Send Email)
- Role change dropdown with confirmation
- Add to group dialog with validation
- Bulk email compose dialog
- Progress indicator for >10 users
- Result summary with success/failure counts

**Responsive Layouts**:
- **Mobile (375px)**: Floating bottom action bar, full-screen dialogs
- **Tablet (768px)**: Sticky action bar, slide-over dialogs
- **Desktop (1280px+)**: Inline toolbar, modal dialogs

**States**: No selection, processing with progress, partial failure, complete failure, success

---

### DOM-USER-007c: User Onboarding UI

**Purpose**: Display onboarding checklist for new users

**Key Components**:
- Onboarding checklist Card on dashboard
- Steps with Checkbox indicators
- Progress indicator showing completion percentage
- Dismiss/skip button with confirmation
- Tutorial video player with chapters
- Admin view of user onboarding status

**Responsive Layouts**:
- **Mobile (375px)**: Full-width card at top of dashboard
- **Tablet (768px)**: Two-column dashboard, onboarding in sidebar
- **Desktop (1280px+)**: Compact widget in dashboard grid

**States**: Loading, steps in progress, completed celebration, dismissed, error

---

### DOM-USER-008c: Invitation Enhancement UI

**Purpose**: Enhanced invitation form with preview and bulk upload

**Key Components**:
- Personal message Textarea with character limit
- Invitation preview Card showing email template
- Resend invitation action on pending invites
- Invitation status/history DataTable
- CSV bulk upload with validation preview
- Expiration countdown Badge

**Responsive Layouts**:
- **Mobile (375px)**: Stacked form and preview, bottom sheet for CSV upload
- **Tablet (768px)**: Side-by-side form and preview, modal CSV upload
- **Desktop (1280px+)**: Wide form with live preview, validation table

**States**: Form validation, preview update, CSV processing, expired badge, success/error toasts

---

## Common Patterns

### Responsive Breakpoints

All wireframes follow these breakpoints:
- **Mobile**: 375px (min-width: 320px)
- **Tablet**: 768px
- **Desktop**: 1280px+

### State Coverage

Each wireframe includes:
- **Loading**: Skeleton placeholders with shimmer animation
- **Empty**: Helpful message with call-to-action
- **Error**: Error message with retry option
- **Success**: Toast notification or inline feedback

### Accessibility Requirements

All wireframes document:
- **Focus Order**: Tab sequence through interactive elements
- **ARIA Labels**: Required labels for screen readers
- **Keyboard Navigation**: Shortcuts and navigation patterns
- **Screen Reader Announcements**: Live region updates

### Animation Timings

Following design system standards:
- **Micro (150ms)**: Button press, toggle, checkbox
- **Standard (250ms)**: Dropdown, tab switch, dialog open
- **Complex (350ms)**: Modal, sidebar, alert banner

---

## Component Hierarchy

```
Users Domain Components
|
+-- User Activity
|   +-- user-activity-tab.tsx
|   +-- activity-table.tsx
|   +-- activity-pagination.tsx
|   +-- activity-export-dialog.tsx
|   +-- activity-filter.tsx
|
+-- User Groups
|   +-- group-table.tsx
|   +-- group-dialog.tsx
|   +-- add-members-dialog.tsx
|   +-- user-search-combobox.tsx
|   +-- group-badge.tsx
|   +-- group-badges-list.tsx
|
+-- Delegation
|   +-- delegation-status-card.tsx
|   +-- delegation-form.tsx
|   +-- delegate-select.tsx
|   +-- delegation-date-range.tsx
|   +-- delegation-alert-banner.tsx
|   +-- delegation-badge.tsx
|   +-- delegated-tasks-view.tsx
|
+-- Avatar
|   +-- avatar-upload.tsx
|   +-- image-cropper-dialog.tsx
|   +-- image-cropper.tsx
|   +-- cropper-controls.tsx
|   +-- image-drop-zone.tsx
|   +-- cropped-preview.tsx
|
+-- Last Login
|   +-- last-login-cell.tsx
|   +-- inactive-user-badge.tsx
|   +-- inactive-user-alert.tsx
|   +-- last-login-filter.tsx
|   +-- user-login-activity.tsx
|
+-- Bulk Operations
|   +-- bulk-actions-toolbar.tsx
|   +-- bulk-role-change.tsx
|   +-- bulk-add-to-group.tsx
|   +-- bulk-email-dialog.tsx
|   +-- bulk-progress-dialog.tsx
|   +-- bulk-result-dialog.tsx
|
+-- Onboarding
|   +-- onboarding-widget.tsx
|   +-- onboarding-checklist.tsx
|   +-- onboarding-step-detail.tsx
|   +-- onboarding-progress-bar.tsx
|   +-- tutorial-video.tsx
|   +-- onboarding-complete.tsx
|
+-- Invitations
    +-- invite-user-dialog.tsx
    +-- invitation-form.tsx
    +-- invitation-preview.tsx
    +-- pending-invitations-table.tsx
    +-- invitation-history-dialog.tsx
    +-- csv-upload-dialog.tsx
    +-- expiration-badge.tsx
```

---

## Implementation Priority

Based on PRD priorities, recommended implementation order:

1. **DOM-USER-001** - User Activity View (Priority 1)
2. **DOM-USER-002c** - User Groups UI (Priority 4, depends on 002a/b)
3. **DOM-USER-003c** - Delegation UI (Priority 7, depends on 003a/b)
4. **DOM-USER-004** - Avatar Image Cropper (Priority 8)
5. **DOM-USER-005c** - Last Login Display (Priority 11, depends on 005a/b)
6. **DOM-USER-006b** - Bulk Operations (Priority 13, depends on 006a, 002c)
7. **DOM-USER-007c** - User Onboarding (Priority 16, depends on 007a/b, 004)
8. **DOM-USER-008c** - Invitation Enhancement (Priority 19, depends on 008a/b)

---

## Related Documentation

- **PRD**: `/memory-bank/prd/domains/users.prd.json`
- **Schema**: `/lib/schema/users.ts`
- **Validation**: `/lib/schemas/users.ts`
- **Auth Functions**: `/src/server/functions/auth.ts`
- **Wireframe Standards**: `/memory-bank/prd/_wireframes/README.md`

---

*Generated for the Users/Team Domain PRD. Last updated: January 10, 2026.*
