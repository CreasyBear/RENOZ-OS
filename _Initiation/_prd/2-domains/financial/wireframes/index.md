# Financial Domain Wireframes Index

**PRD Reference:** `/memory-bank/prd/domains/financial.prd.json`
**Domain Color:** Green-500
**Design Aesthetic:** Professional Financial - clean, precise, trustworthy
**Created:** 2026-01-10

---

## Overview

The Financial domain covers invoicing, payments, aging reports, reconciliation, and Xero integration. These wireframes define the UI for managing the financial lifecycle from invoice creation through payment reconciliation and accounting sync.

---

## Wireframe Files

| File | Description | Related Stories |
|------|-------------|-----------------|
| [DOM-FIN-001c.wireframe.md](./DOM-FIN-001c.wireframe.md) | Credit Notes UI - create, list, apply to invoices | DOM-FIN-001c |
| [DOM-FIN-002c.wireframe.md](./DOM-FIN-002c.wireframe.md) | Payment Plans UI - wizard, timeline, installment tracking | DOM-FIN-002c |
| [DOM-FIN-003b.wireframe.md](./DOM-FIN-003b.wireframe.md) | AR Aging Report - buckets, customer breakdown, dashboard widget | DOM-FIN-003b |
| [DOM-FIN-004c.wireframe.md](./DOM-FIN-004c.wireframe.md) | Customer Statements - generate, preview, email, bulk | DOM-FIN-004c |
| [DOM-FIN-005b.wireframe.md](./DOM-FIN-005b.wireframe.md) | Xero Invoice Sync - status badges, error resolution, queue | DOM-FIN-005b |
| [DOM-FIN-006c.wireframe.md](./DOM-FIN-006c.wireframe.md) | Payment Reminders - templates, variables, history, opt-out | DOM-FIN-006c |
| [DOM-FIN-007b.wireframe.md](./DOM-FIN-007b.wireframe.md) | Financial Dashboard - KPIs, charts, quick actions | DOM-FIN-007b |
| [DOM-FIN-008c.wireframe.md](./DOM-FIN-008c.wireframe.md) | Revenue Reports - recognition, deferred, roll-forward | DOM-FIN-008c |

---

## Story-to-Wireframe Mapping

| Story ID | Story Name | Wireframe |
|----------|------------|-----------|
| DOM-FIN-001c | Credit Notes UI | DOM-FIN-001c.wireframe.md |
| DOM-FIN-002c | Payment Plans UI | DOM-FIN-002c.wireframe.md |
| DOM-FIN-003b | AR Aging Report UI | DOM-FIN-003b.wireframe.md |
| DOM-FIN-004c | Customer Statements UI | DOM-FIN-004c.wireframe.md |
| DOM-FIN-005b | Xero Invoice Sync UI | DOM-FIN-005b.wireframe.md |
| DOM-FIN-006c | Reminders UI | DOM-FIN-006c.wireframe.md |
| DOM-FIN-007b | Financial Dashboard UI | DOM-FIN-007b.wireframe.md |
| DOM-FIN-008c | Revenue Reports UI | DOM-FIN-008c.wireframe.md |

---

## Design Principles

### Professional Financial

1. **Precision:** Monetary values displayed with exact formatting (2 decimal places, currency symbol)
2. **Trust:** Clear status indicators, audit trails visible, confirmations for destructive operations
3. **Clarity:** Actions have clear consequences, undo where possible
4. **Consistency:** Financial workflows follow predictable patterns
5. **Accessibility:** High contrast, clear labels, keyboard navigable, WCAG 2.1 AA compliant

### Data Presentation

1. **Numbers:** Always right-aligned, consistent decimal formatting
2. **Dates:** Relative for recent (today, yesterday), absolute for historical
3. **Status:** Color-coded badges with text labels (not color alone)
4. **Totals:** Prominent, separated from details, summarized first
5. **Trends:** Direction indicators (up/down arrows) with percentage change

---

## Responsive Strategy

| Breakpoint | Width | Layout Strategy |
|------------|-------|-----------------|
| Mobile | 375px | Single column, full-screen dialogs, stacked cards |
| Tablet | 768px | Two-column layouts, modal dialogs, table views |
| Desktop | 1280px+ | Multi-column grids, side panels, full data tables |

### Mobile-Specific Patterns

- Bottom sheets for forms and actions
- Swipe actions on list items (where appropriate)
- Floating action buttons for primary actions
- Collapsible sections to manage information density
- Native date/time pickers for input

### Desktop-Specific Patterns

- Side panels for detail views
- Inline editing where appropriate
- Multi-select with bulk actions
- Keyboard shortcuts for power users
- Drag-drop for scheduling/ordering

---

## Component Library

### Shared Financial Components

| Component | Purpose | Used In |
|-----------|---------|---------|
| CurrencyInput | Formatted monetary input | All forms with money fields |
| StatusBadge | Status indicators | All list views, detail pages |
| DateRangePicker | Period selection | Reports, statements, dashboard |
| ExportMenu | CSV/PDF/Email export | Reports, statements |
| ProgressBar | Target/completion progress | Dashboard KPIs, payment plans |
| Timeline | Event history display | Payment plans, credit notes, reminders |
| DataTable | Sortable/filterable tables | All list views |
| FormDialog | Modal forms | Create/edit operations |
| PDFPreview | Document preview | Statements, credit notes |

### Financial-Specific Components

| Component | Purpose | Location |
|-----------|---------|----------|
| CreditNoteCard | Credit note display | Credit notes list |
| PaymentTimeline | Installment timeline | Payment plans |
| AgingBucketCard | Aging bucket display | AR aging report |
| XeroSyncStatusBadge | Xero sync indicator | Invoice list/detail |
| ReminderTemplateEditor | Template editing | Reminder settings |
| KPIWidget | Dashboard metrics | Financial dashboard |
| RevenueChart | Revenue visualization | Dashboard, reports |

---

## Animation Timing Guidelines

| Animation Type | Duration | Easing | Use Case |
|----------------|----------|--------|----------|
| Micro | 150ms | ease-out | Button press, checkbox toggle |
| Standard | 250ms | ease-out | Dropdown open, tab switch |
| Complex | 350ms | cubic-bezier(0.32, 0.72, 0, 1) | Modal open, panel slide |
| Data | 400-600ms | ease-out | Chart animation, number count-up |
| Stagger | 50-100ms delay | ease-out | List item entry |

---

## Accessibility Checklist

All wireframes include:

- [x] Minimum 44px touch targets (48px preferred)
- [x] ARIA labels on all interactive elements
- [x] Keyboard navigation support (Tab, Enter, Escape, Arrow keys)
- [x] Screen reader announcements for status changes
- [x] Focus management after dialog/action completion
- [x] Color-independent status indicators (icons + text)
- [x] High contrast for readability
- [x] Form validation with clear error messages
- [x] Loading states with accessible indicators
- [x] Empty states with helpful guidance

---

## Integration Points

### Routes to Create

```
src/routes/_authed/financial/
  index.tsx                    <- Dashboard (DOM-FIN-007b)
  credit-notes/
    index.tsx                  <- Credit notes list (DOM-FIN-001c)
    $creditNoteId.tsx          <- Credit note detail
  invoices/
    $invoiceId/
      schedule.tsx             <- Payment schedule tab (DOM-FIN-002c)
      reminders.tsx            <- Reminder history tab (DOM-FIN-006c)
      xero.tsx                 <- Xero sync tab (DOM-FIN-005b)
  statements/
    bulk.tsx                   <- Bulk statement generation (DOM-FIN-004c)
  reports/
    aging.tsx                  <- AR aging report (DOM-FIN-003b)
    recognition.tsx            <- Revenue recognition (DOM-FIN-008c)
    deferred.tsx               <- Deferred revenue (DOM-FIN-008c)
    reminders/
      activity.tsx             <- Reminder activity dashboard (DOM-FIN-006c)

src/routes/_authed/settings/
  integrations/
    xero.tsx                   <- Xero settings (DOM-FIN-005b)
  reminders/
    index.tsx                  <- Reminder templates (DOM-FIN-006c)
    $templateId.tsx            <- Template editor
```

### Component Directories

```
src/components/domain/financial/
  credit-notes/                <- DOM-FIN-001c components
  payment-plans/               <- DOM-FIN-002c components
  reports/                     <- DOM-FIN-003b, DOM-FIN-008c components
  statements/                  <- DOM-FIN-004c components
  xero/                        <- DOM-FIN-005b components
  reminders/                   <- DOM-FIN-006c components
  dashboard/                   <- DOM-FIN-007b components
  widgets/                     <- Reusable dashboard widgets
```

---

## Server Functions Required

| Function | Description | Story |
|----------|-------------|-------|
| `createCreditNote` | Create credit note from invoice | DOM-FIN-001b |
| `applyCreditNoteToInvoice` | Apply credit to invoice balance | DOM-FIN-001b |
| `createPaymentPlan` | Create payment schedule | DOM-FIN-002b |
| `recordInstallmentPayment` | Record payment against installment | DOM-FIN-002b |
| `getOverdueInstallments` | List overdue installments | DOM-FIN-002b |
| `getARAgingReport` | Calculate aging buckets | DOM-FIN-003a |
| `generateStatement` | Generate statement PDF | DOM-FIN-004b |
| `saveStatementHistory` | Record statement generation | DOM-FIN-004b |
| `syncInvoiceToXero` | Push invoice to Xero | DOM-FIN-005a |
| `pullXeroPayments` | Import Xero payments | DOM-FIN-005a |
| `sendPaymentReminder` | Send reminder email | DOM-FIN-006b |
| `getFinancialDashboardMetrics` | Dashboard data | DOM-FIN-007a |
| `getRevenueRecognitionReport` | Recognition data | DOM-FIN-008b |
| `getDeferredRevenueReport` | Deferred revenue data | DOM-FIN-008b |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Dashboard initial load | < 2 seconds |
| Report generation | < 3 seconds |
| Widget refresh | < 500ms |
| PDF generation | < 5 seconds |
| Chart interaction | < 100ms feedback |
| Mobile render | < 1.5 seconds on 3G |

---

## Next Steps

1. **Review wireframes** with stakeholders for feedback
2. **Create schema migrations** (DOM-FIN-001a, 002a, etc.)
3. **Implement server functions** (DOM-FIN-001b, 002b, etc.)
4. **Build shared components** (CurrencyInput, StatusBadge, etc.)
5. **Implement UI components** following wireframes
6. **Integration testing** with Xero sandbox
7. **User acceptance testing** with finance team

---

## Related Documentation

- [Financial PRD](/memory-bank/prd/domains/financial.prd.json)
- [Wireframe README](/memory-bank/prd/_wireframes/README.md)
- [Dashboard Wireframes](/memory-bank/prd/_wireframes/domains/dashboard-index.md)
- [Customer Wireframes](/memory-bank/prd/_wireframes/domains/) (for customer financial tab integration)
