# Financial Domain UI Pattern Review

**Date**: 2026-01-10
**Wireframes Reviewed**: 8 Financial Domain wireframes (DOM-FIN-001c through DOM-FIN-008c)
**Reference Implementations**: RE-UI components, Midday patterns, Square UI patterns

---

## Executive Summary

Reviewed 8 financial wireframes and mapped UI elements to reference implementations. All wireframes now include specific component references from RE-UI registry and Midday financial application patterns.

### Wireframes Processed

| Wireframe | Feature | Primary Patterns |
|-----------|---------|-----------------|
| DOM-FIN-001c | Credit Notes UI | DataTable, Dialog, Badge, Form |
| DOM-FIN-002c | Payment Plans UI | Timeline, Wizard, Progress |
| DOM-FIN-003b | AR Aging Report | Chart, DataTable, Card |
| DOM-FIN-004c | Customer Statements | Document Preview, Email Dialog |
| DOM-FIN-005b | Xero Invoice Sync | Status Badge, Error Dialog, Queue Table |
| DOM-FIN-006c | Payment Reminders | Template Editor, Rich Text, History |
| DOM-FIN-007b | Financial Dashboard | KPI Widgets, Charts, Data Grid |
| DOM-FIN-008c | Revenue Reports | Report Layout, Roll-Forward, Schedule |

---

## Key Pattern Mappings

### Data Display Patterns

**DataGrid / Data Tables**
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`
- **Midday Usage**: Transaction tables, invoice lists
- **Applied To**: Credit notes list, AR aging breakdown, invoice sync queue
- **Features**: Sorting, filtering, pagination, column visibility

**Charts & Visualizations**
- **Reference**: `_reference/.reui-reference/registry/default/ui/chart.tsx`
- **Midday Usage**: Burn rate, cash flow, category expenses charts
- **Applied To**: Revenue trend, AR aging visualization, dashboard KPIs
- **Features**: Recharts integration, responsive design, tooltips

**Status Badges**
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Variants**: DRAFT (gray), ISSUED (green), APPLIED (blue), VOIDED/ERROR (red)
- **Applied To**: Credit note status, sync status, payment reminder status

### Form Patterns

**Dialog Forms**
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Midday Usage**: Add transaction, create invoice modals
- **Applied To**: Create credit note, send reminder, apply credit

**Multi-Step Wizards**
- **Reference**: Custom wizard pattern (see payment plans)
- **Midday Usage**: Invoice creation flow
- **Applied To**: Payment plan creation (3 steps), bulk statement generation

**TanStack Form Integration**
- **Reference**: `_reference/.reui-reference/registry/default/ui/base-form-tanstack.tsx`
- **Applied To**: All financial forms with Zod validation

### Specialized Financial Patterns

**Timeline Components**
- **Reference**: Custom timeline pattern
- **Midday Usage**: Payment schedules, milestone tracking
- **Applied To**: Payment plan installments, statement history, sync history

**Rich Text Editor**
- **Reference**: Template editor pattern
- **Applied To**: Reminder template body, custom message composition

**Document Preview**
- **Reference**: PDF preview component
- **Applied To**: Statement preview, invoice preview

---

## Component Reference Matrix

### RE-UI Components

| Component | Wireframes Using | Key Features |
|-----------|------------------|--------------|
| `data-grid.tsx` | FIN-001c, 003b, 005b, 006c, 008c | Sorting, filtering, pagination |
| `chart.tsx` | FIN-003b, 007b, 008c | Recharts integration |
| `badge.tsx` | FIN-001c, 002c, 005b | Status variants with icons |
| `dialog.tsx` | FIN-001c, 002c, 004c, 006c | Modal forms |
| `sheet.tsx` | FIN-001c, 002c | Mobile bottom sheets |
| `card.tsx` | FIN-007b, 008c | KPI widgets, summary cards |
| `progress.tsx` | FIN-002c, 005b | Payment progress, sync status |
| `tabs.tsx` | FIN-001c, 002c, 004c | Invoice detail tabs |
| `select.tsx` | All wireframes | Period selectors, filters |
| `button.tsx` | All wireframes | Primary/secondary actions |
| `form.tsx` | FIN-001c, 002c, 004c, 006c | TanStack Form integration |
| `table.tsx` | FIN-003b, 005b, 008c | Simple data tables |
| `dropdown-menu.tsx` | FIN-004c, 006c, 008c | Export menus, actions |
| `popover.tsx` | FIN-001c, 002c | Tooltips, info popovers |
| `scroll-area.tsx` | FIN-003b, 004c, 008c | Long lists, reports |

### Midday Patterns

| Pattern | File Reference | Wireframe Application |
|---------|---------------|----------------------|
| Transaction Table | `apps/dashboard/src/components/tables/transactions` | Credit notes, invoices list |
| Invoice Status | `apps/dashboard/src/components/invoice-status.tsx` | Status badges across all |
| Animated Numbers | `apps/dashboard/src/components/animated-number.tsx` | KPI values, dashboard metrics |
| Category Selector | `apps/dashboard/src/components/category-selector.tsx` | Credit note reasons, filters |
| Amount Input | `apps/dashboard/src/components/forms/amount-input.tsx` | Credit amount, payment amount |
| Date Range Picker | `apps/dashboard/src/components/date-range.tsx` | Statement periods, report filters |
| Bank Logo | `apps/dashboard/src/components/bank-logo.tsx` | Similar to Xero logo display |
| Chart Patterns | `apps/dashboard/src/components/canvas/*-canvas.tsx` | AR aging, revenue trend |

---

## Implementation Recommendations

### High Priority Components (Build First)

1. **Financial Status Badge** (`financial/shared/status-badge.tsx`)
   - Variants for credit note, sync, payment status
   - Based on RE-UI Badge with financial styling

2. **Financial Data Grid** (`financial/shared/financial-data-grid.tsx`)
   - Wrapper around RE-UI DataGrid with financial formatting
   - Currency columns, date formatting, status badges

3. **KPI Widget** (`financial/dashboard/kpi-widget.tsx`)
   - Card-based metric display with trend indicators
   - Based on Midday animated number patterns

4. **Financial Chart Widget** (`financial/shared/chart-widget.tsx`)
   - Wrapper for Recharts with financial styling
   - Line, bar, stacked bar, and donut variants

### Reusable Utilities

```typescript
// _reference patterns suggest these utilities:

// Currency formatting (consistent AUD with GST)
formatCurrency(amount: number): string

// Date formatting (DD/MM/YYYY for Australia)
formatDate(date: Date, format?: string): string

// Status color mapping
getStatusColor(status: FinancialStatus): string

// Percentage formatting
formatPercentage(value: number, decimals?: number): string
```

### Shared Financial Components

Create a `financial/shared/` directory with:
- `amount-display.tsx` - Formatted currency display
- `date-display.tsx` - Localized date display
- `status-badge.tsx` - Financial status badges
- `action-menu.tsx` - Consistent action menus
- `export-menu.tsx` - PDF/CSV/Excel export options
- `period-selector.tsx` - Date range/period selection

---

## Pattern Notes

### Credit Notes (DOM-FIN-001c)
- Heavy use of DataGrid for list view
- Dialog for create flow with TanStack Form
- Badge variants for status (draft/issued/applied/voided)
- Apply credit flow uses nested dialog pattern

### Payment Plans (DOM-FIN-002c)
- Custom timeline component (vertical and horizontal)
- Multi-step wizard with progress indicator
- Milestone nodes with status indicators
- Record payment uses sheet on mobile, dialog on desktop

### AR Aging (DOM-FIN-003b)
- Stacked bar chart for aging buckets
- DataGrid for customer breakdown
- Card widgets for summary metrics
- Drill-down detail modal pattern

### Customer Statements (DOM-FIN-004c)
- PDF preview component (iframe or react-pdf)
- Email dialog with template merge fields
- Period selector with preset ranges
- History list with resend actions

### Xero Sync (DOM-FIN-005b)
- Status badge with spinner animation
- Error dialog with resolution options
- Sync queue table with real-time updates
- Settings page with toggle switches

### Payment Reminders (DOM-FIN-006c)
- Rich text editor for template body (Tiptap or Slate)
- Variable toolbar for merge fields
- Template list with active/inactive toggle
- Preview panel showing rendered template

### Financial Dashboard (DOM-FIN-007b)
- KPI widget with trend indicators
- Chart widgets (line, bar, stacked)
- Quick actions bar
- Period selector with comparison
- Responsive grid layout (1-4 columns)

### Revenue Reports (DOM-FIN-008c)
- Report layout with summary cards
- Recognition type breakdown (pie/donut)
- Monthly breakdown (bar chart)
- Detailed schedule table with filters
- Roll-forward statement (table)
- Export menu (CSV, Excel, PDF)

---

## Dependencies

### Required Packages

```json
{
  "recharts": "^2.x",           // Charts
  "react-pdf": "^7.x",          // PDF preview (statements)
  "tiptap": "^2.x",             // Rich text editor (reminders)
  "@tanstack/react-form": "^x", // Forms
  "zod": "^3.x",                // Validation
  "date-fns": "^3.x"            // Date utilities
}
```

### RE-UI Components to Install

All base components from `_reference/.reui-reference/registry/default/ui/`:
- Core: badge, button, card, dialog, sheet, tabs
- Forms: form, input, select, checkbox, radio-group, switch
- Data: data-grid, table, chart
- Layout: scroll-area, separator, skeleton

---

## Next Steps

1. **Phase 1**: Build shared financial components
   - Status badge, amount display, date display
   - Financial data grid wrapper
   - KPI widget, chart widget

2. **Phase 2**: Implement by priority
   - Credit Notes (FIN-001c) - Most common feature
   - Financial Dashboard (FIN-007b) - High visibility
   - AR Aging (FIN-003b) - Critical for collections

3. **Phase 3**: Advanced features
   - Payment Plans (FIN-002c) - Complex timeline
   - Xero Sync (FIN-005b) - Integration heavy
   - Payment Reminders (FIN-006c) - Template system

4. **Phase 4**: Reporting
   - Customer Statements (FIN-004c) - PDF generation
   - Revenue Reports (FIN-008c) - GAAP compliance

---

## Questions/Decisions Needed

1. **PDF Preview**: react-pdf vs iframe vs third-party service?
2. **Rich Text Editor**: Tiptap vs Slate vs other?
3. **Chart Library**: Recharts (Midday uses) vs others?
4. **Real-time Sync**: WebSockets for sync status updates?
5. **Email Service**: Which provider for reminder emails?

---

## Review Completed

All 8 financial wireframes now have UI Patterns sections added with specific component references. Ready for implementation planning.
