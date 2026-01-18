# Reports Domain Wireframes Index

> **PRD Reference**: `/memory-bank/prd/domains/reports.prd.json`
> **Domain**: DOM-REPORTS
> **Phase**: domain-system
> **Created**: 2026-01-10

---

## Overview

This index documents all wireframes for the Reports domain, covering business reporting and analytics functionality including pre-built reports, custom report builder, scheduling, and favorites.

---

## Wireframe Files

| Story ID | Story Name | Wireframe File | Status |
|----------|------------|----------------|--------|
| DOM-RPT-004 | Add Financial Summary Report | [DOM-RPT-004.wireframe.md](./DOM-RPT-004.wireframe.md) | Complete |
| DOM-RPT-005c | Schedule Management UI | [DOM-RPT-005c.wireframe.md](./DOM-RPT-005c.wireframe.md) | Complete |
| DOM-RPT-006c | Favorites UI | [DOM-RPT-006c.wireframe.md](./DOM-RPT-006c.wireframe.md) | Complete |
| DOM-RPT-007 | Simple Report Builder | [DOM-RPT-007.wireframe.md](./DOM-RPT-007.wireframe.md) | Complete |

---

## Story Summaries

### DOM-RPT-004: Financial Summary Report

**Route**: `/reports/financial`

**Purpose**: Financial performance overview with P&L summary, cash flow indicators, and accounts receivable tracking.

**Key Features**:
- Gross Revenue, Total Costs, Gross Profit KPI cards
- P&L breakdown table with period comparison
- Cash flow summary (inflows/outflows/net)
- AR aging table with status indicators
- Revenue trend chart (6 months)
- Budget vs actual comparison (if targets configured)
- Export to CSV/PDF

**Layouts**: Desktop (full report), Tablet (stacked sections), Mobile (collapsible sections)

---

### DOM-RPT-005c: Schedule Management UI

**Routes**:
- Schedule button on each report page
- `/reports/schedules` (full schedule management)

**Purpose**: Create and manage automated report delivery schedules.

**Key Features**:
- Schedule dialog with frequency options (daily/weekly/monthly)
- Day/time/timezone configuration
- Recipient selection (team + external emails)
- Format selection (PDF/CSV/Both)
- Schedule preview with next delivery date
- Test email functionality
- Schedule list view with enable/disable toggle
- Delivery history with retry for failures
- Integration with Trigger.dev emailReport task

**Layouts**: Desktop (full dialog), Tablet (compact dialog), Mobile (bottom sheet)

---

### DOM-RPT-006c: Favorites UI

**Routes**:
- Star button on each report header
- Favorites section on Reports Hub
- `/reports/favorites` (all favorites)

**Purpose**: Save report views with specific filter configurations for quick access.

**Key Features**:
- One-click star button to favorite/unfavorite
- Optional custom naming for favorites
- Filters preserved with favorite
- Favorites grid on Reports Hub
- Search and sort favorites
- Edit name functionality
- Quick navigation to saved view
- Undo for accidental removals

**Layouts**: Desktop (grid view), Tablet (scrollable cards), Mobile (list view)

---

### DOM-RPT-007: Simple Report Builder

**Route**: `/reports/builder`

**Purpose**: Create custom reports with data source selection, column configuration, filtering, sorting, and grouping.

**Key Features**:
- Step-by-step configuration wizard
- Data source selection (Customers, Orders, Products)
- Column selection with drag-to-reorder
- Column settings (label, format, alignment, width)
- Filter builder with smart operators by field type
- AND/OR filter matching
- Primary and secondary sort
- Group by with subtotals
- Live preview with sample data
- Save reports (private or shared with team)
- Export generated reports

**Layouts**: Desktop (split panel), Tablet (stacked with bottom sheets), Mobile (view/run only)

---

## Component Architecture

### Shared Components

These components are used across multiple reports wireframes:

| Component | Used In | Purpose |
|-----------|---------|---------|
| ReportLayout | All reports | Standard report page wrapper with header actions |
| DateRangePicker | Financial, Builder | Date range selection with presets |
| ReportExportMenu | All reports | CSV/PDF/Excel export dropdown |
| ReportSkeleton | All reports | Loading state skeleton |
| ReportEmptyState | All reports | No data empty state |
| ReportErrorState | All reports | Error state with retry |

### New Components by Story

#### DOM-RPT-004 Components
- FinancialSummaryReport
- FinancialKPICards / FinancialKPICard
- PLStatementTable
- CashFlowSummary
- ARAgingTable
- RevenueTrendChart
- AgingStatusBadge

#### DOM-RPT-005c Components
- ScheduleDialog
- FrequencySelector
- DaySelector
- RecipientsSelector
- SchedulePreview
- ScheduleList
- ScheduleCard
- ScheduleHistoryDialog
- ScheduleToggle

#### DOM-RPT-006c Components
- FavoriteStarButton
- FavoritesSection
- FavoriteCard / FavoriteListItem
- AddFavoriteDialog
- EditFavoriteDialog
- RemoveFavoriteDialog
- ReportIcon
- FavoritesEmptyState

#### DOM-RPT-007 Components
- ReportBuilderPage / ReportBuilderLayout
- BuilderConfigPanel
- DataSourceSelector
- ColumnSelector / ColumnItem
- ColumnSettingsDialog
- FilterBuilder / FilterRow
- SortSelector
- GroupSelector
- PreviewPanel / PreviewTable
- SaveReportDialog
- CustomReportList / CustomReportCard
- CustomReportView

---

## Accessibility Summary

All wireframes include comprehensive accessibility specifications:

| Feature | Implementation |
|---------|----------------|
| Keyboard Navigation | Full tab order documented, shortcuts defined |
| Screen Reader | ARIA landmarks, live regions, announcements |
| Focus Management | Trapped in dialogs, returns after close |
| Color Independence | Status indicators have text labels |
| Touch Targets | Minimum 44px on mobile |
| Reduced Motion | Respects prefers-reduced-motion |

---

## Animation Standards

Consistent animation choreography across all wireframes:

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button press | 150ms | ease-out |
| Dropdown open | 200ms | ease-out |
| Modal open | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Toast appear | 250ms | ease-out |
| Content fade | 150-200ms | ease-out |
| Staggered items | 30-50ms delay | ease-out |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Report page load | < 1.5s |
| Data refresh | < 500ms |
| Preview generation | < 2s |
| Export (CSV) | < 3s |
| Export (PDF) | < 5s |
| Dialog open | < 200ms |
| Favorite toggle | < 500ms |

---

## Integration Points

### Existing Infrastructure
- ReportLayout component (src/components/domain/reports/)
- Export infrastructure (CSV/Excel)
- Print support with preview
- Trigger.dev emailReport task

### New Server Functions Required
- DOM-RPT-004: getFinancialSummary, getARAging, getCashFlow
- DOM-RPT-005a/b: scheduled_reports CRUD operations
- DOM-RPT-006a/b: report_favorites CRUD operations
- DOM-RPT-007: custom_reports CRUD, getReportPreview, runCustomReport

### Database Schema Required
- DOM-RPT-005a: scheduled_reports table
- DOM-RPT-006a: report_favorites table (or user_preferences extension)
- DOM-RPT-007: custom_reports table

---

## Related Wireframes

These wireframes from other domains relate to reports functionality:

- [Dashboard Main](./dashboard-main.wireframe.md) - Dashboard widgets consume report data
- [Dashboard Scheduled Reports](./dashboard-scheduled-reports.wireframe.md) - Schedule management widget
- [Jobs Costing Report](./jobs-costing-report.wireframe.md) - Similar report pattern
- [Pipeline Forecasting Report](./pipeline-forecasting-report.wireframe.md) - Similar report pattern

---

## Implementation Notes

### Priority Order
1. **DOM-RPT-004** (Priority 1) - Financial Summary Report - standalone feature
2. **DOM-RPT-005c** (Priority 4) - Schedules - requires schema/server first
3. **DOM-RPT-006c** (Priority 7) - Favorites - requires schema/server first
4. **DOM-RPT-007** (Priority 8) - Report Builder - highest complexity, can defer

### Dependencies
```
DOM-RPT-004 -> No dependencies

DOM-RPT-005a (Schema)
    |
    v
DOM-RPT-005b (Server)
    |
    v
DOM-RPT-005c (UI) <- This wireframe

DOM-RPT-006a (Schema)
    |
    v
DOM-RPT-006b (Server)
    |
    v
DOM-RPT-006c (UI) <- This wireframe

DOM-RPT-007 -> Schema + Server + UI in one (complex)
```

### Mobile Considerations
- Financial report: Collapsible sections for data density
- Schedules: Bottom sheet for dialog
- Favorites: List view instead of grid
- Report Builder: View/run only (creation requires desktop)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-10 | 1.0 | Initial wireframes for all UI stories |

---

**Document Author**: Claude Code
**Last Updated**: 2026-01-10
