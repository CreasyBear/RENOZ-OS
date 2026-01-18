# Warranty Domain Wireframes Index

> **Domain**: Warranty Management
> **PRD**: memory-bank/prd/domains/warranty.prd.json
> **Created**: 2026-01-10

---

## Overview

This directory contains comprehensive wireframes for the Warranty Domain UI stories. Each wireframe includes mobile (375px), tablet (768px), and desktop (1280px+) layouts, along with interaction states, accessibility notes, and animation choreography.

---

## Wireframes Summary

| Story ID | Name | Component Type | Wireframe |
|----------|------|----------------|-----------|
| DOM-WAR-001c | Warranty Policies: UI | Settings page with DataTable and Form Dialog | [DOM-WAR-001c.wireframe.md](./DOM-WAR-001c.wireframe.md) |
| DOM-WAR-003b | Warranty Expiry Alerts: Dashboard Widget | Dashboard widget Card with list | [DOM-WAR-003b.wireframe.md](./DOM-WAR-003b.wireframe.md) |
| DOM-WAR-003c | Warranty Expiry Alerts: Report Page | ReportLayout with FilterBar and DataTable | [DOM-WAR-003c.wireframe.md](./DOM-WAR-003c.wireframe.md) |
| DOM-WAR-004c | Warranty Certificate: UI | DetailPanel action bar with Dialog | [DOM-WAR-004c.wireframe.md](./DOM-WAR-004c.wireframe.md) |
| DOM-WAR-005b | CSV Bulk Warranty Registration: UI | Dialog with FileUpload, DataTable, ProgressBar | [DOM-WAR-005b.wireframe.md](./DOM-WAR-005b.wireframe.md) |
| DOM-WAR-006c | Warranty Claim Workflow: UI | Form Dialog with Tab and DataTable | [DOM-WAR-006c.wireframe.md](./DOM-WAR-006c.wireframe.md) |
| DOM-WAR-007c | Warranty Extensions: UI | Dialog Form with DataTable and ReportLayout | [DOM-WAR-007c.wireframe.md](./DOM-WAR-007c.wireframe.md) |
| DOM-WAR-008 | Warranty Analytics Enhancement | Analytics dashboard with Charts and Cards | [DOM-WAR-008.wireframe.md](./DOM-WAR-008.wireframe.md) |

---

## Wireframe Coverage

### DOM-WAR-001c: Warranty Policies UI

**Purpose**: Manage warranty policies in settings, assign to products/categories.

**Key Screens**:
- Policy list page with DataTable
- Create/Edit policy dialog (modal/slide-over/bottom sheet)
- Default policy toggle
- Policy select dropdown in product/category forms
- Policy terms display on warranty detail

**Files to Create/Modify**:
- `src/routes/_authed/settings/warranty-policies.tsx`
- `src/components/domain/settings/warranty-policy-manager.tsx`
- `src/components/domain/products/product-form.tsx`

---

### DOM-WAR-003b: Expiring Warranties Dashboard Widget

**Purpose**: Dashboard widget showing warranties expiring in next 30 days.

**Key Screens**:
- Dashboard widget with compact list (3-5 items)
- Days-until-expiry badges with color coding
- Click-through to warranty detail
- "View All" navigation to report

**Files to Create**:
- `src/components/domain/dashboard/widgets/expiring-warranties-widget.tsx`
- `src/hooks/use-expiring-warranties.ts`

---

### DOM-WAR-003c: Expiring Warranties Report Page

**Purpose**: Dedicated report for managing expiring warranties.

**Key Screens**:
- Report page with filter bar
- DataTable with days-until-expiry column
- Color-coded urgency indicators
- CSV export functionality

**Files to Create**:
- `src/routes/_authed/reports/expiring-warranties.tsx`
- `src/components/domain/reports/expiry-report-filter-bar.tsx`

---

### DOM-WAR-004c: Warranty Certificate UI

**Purpose**: Generate, preview, download, and email PDF certificates.

**Key Screens**:
- Certificate action bar on warranty detail
- PDF generation progress
- Full-screen/modal preview
- Email certificate dialog
- Regenerate confirmation

**Files to Create**:
- `src/components/domain/support/warranty-certificate-card.tsx`
- `src/components/domain/support/email-certificate-dialog.tsx`

---

### DOM-WAR-005b: CSV Bulk Warranty Registration UI

**Purpose**: Import warranties in bulk from CSV files.

**Key Screens**:
- Bulk import dialog with drag-drop upload
- CSV validation preview table
- Customer assignment
- Import progress with status
- Result summary with error download

**Files to Create**:
- `src/components/domain/support/bulk-warranty-csv-dialog.tsx`
- `src/components/domain/support/csv-validation-preview.tsx`

---

### DOM-WAR-006c: Warranty Claim Workflow UI

**Purpose**: Submit and manage warranty claims with approval workflow.

**Key Screens**:
- Claims tab on warranty detail
- File claim dialog with resolution preference
- Claim status badges
- Claim approval dialog (high-value)
- Claim history table

**Files to Create**:
- `src/components/domain/support/warranty-claim-form.tsx`
- `src/components/domain/support/claim-approval-dialog.tsx`

---

### DOM-WAR-007c: Warranty Extensions UI

**Purpose**: Extend warranty periods with tracking and approval.

**Key Screens**:
- Extensions tab on warranty detail
- Extend warranty dialog with expiry preview
- Month selector with quick-select options
- Extension history table
- Extensions report page

**Files to Create**:
- `src/components/domain/support/extend-warranty-dialog.tsx`
- `src/routes/_authed/reports/warranty-extensions.tsx`

---

### DOM-WAR-008: Warranty Analytics Enhancement

**Purpose**: Comprehensive analytics dashboard for warranty insights.

**Key Screens**:
- Summary metric cards with sparklines
- Claims by product category (pie/bar chart)
- Claims trend over time (line chart)
- Revenue vs claims cost (stacked bar)
- Filter controls and export

**Files to Create**:
- `src/components/domain/support/warranty-analytics-charts.tsx`
- `src/server/functions/warranty-analytics.ts`

---

## Common Patterns

### Responsive Breakpoints

| Breakpoint | Width | Layout Strategy |
|------------|-------|-----------------|
| Mobile | 375px | Full-screen dialogs, stacked cards, bottom sheets |
| Tablet | 768px | Side panels, compact tables, collapsible filters |
| Desktop | 1280px+ | Modals, full DataTables, inline filters |

### State Patterns

All wireframes include:
- **Loading**: Skeleton animations with shimmer
- **Empty**: Helpful messages with CTAs
- **Error**: Retry actions with descriptive messages
- **Success**: Toast notifications (3-5s duration)

### Animation Timings

| Type | Duration | Use Case |
|------|----------|----------|
| Micro | 150ms | Button press, toggle, selection |
| Standard | 250ms | Dropdown, tab switch, badge update |
| Complex | 350ms | Modal open, drawer slide, chart draw |

### Accessibility Standards

All wireframes include:
- Focus order documentation
- ARIA labels and roles
- Keyboard navigation shortcuts
- Screen reader announcements

---

## Design Tokens

### Domain Color

Warranty domain uses **Orange-500** (`#F97316`) from the Support color palette.

### Status Colors

| Status | Color | Use Case |
|--------|-------|----------|
| Active | Green-500 | Active warranties |
| Expiring Soon | Yellow-500 | 15-21 days until expiry |
| Critical | Red-500 | 1-7 days until expiry |
| Expired | Gray-500 | Past expiry date |

### Claim Status Colors

| Status | Color |
|--------|-------|
| Submitted | Blue-500 |
| Under Review | Yellow-500 |
| Approved | Green-500 |
| Denied | Red-500 |
| Resolved | Emerald-500 |

---

## Implementation Notes

### Dependencies

- **Charts**: Recharts or similar for analytics
- **PDF**: @react-pdf/renderer for certificates
- **Drag-Drop**: dnd-kit for bulk upload
- **Date Handling**: date-fns for expiry calculations

### Route Structure

```
/settings/warranty-policies       -> DOM-WAR-001c
/dashboard                        -> DOM-WAR-003b (widget)
/reports/expiring-warranties      -> DOM-WAR-003c
/reports/warranty-extensions      -> DOM-WAR-007c
/reports/warranties               -> DOM-WAR-008
/support/warranties/:id           -> DOM-WAR-004c, 006c, 007c (tabs)
/support/warranties               -> DOM-WAR-005b (dialog trigger)
```

### Shared Components

Components that can be reused across wireframes:
- `DaysBadge` - Days-until-expiry indicator
- `ClaimStatusBadge` - Claim status display
- `ResolutionBadge` - Resolution type display
- `MonthsSelector` - Increment/decrement with quick-select
- `ExpiryPreview` - Visual date preview

---

## Related Documentation

- [Warranty PRD](../../domains/warranty.prd.json)
- [Wireframe README](../README.md)
- [Design System Tokens](../../../_meta/design-tokens.md)

---

*Last Updated: 2026-01-10*
