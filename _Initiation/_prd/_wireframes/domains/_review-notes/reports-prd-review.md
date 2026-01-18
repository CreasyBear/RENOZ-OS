# Reports PRD UI Pattern Enhancement Review

**Date:** 2026-01-10
**PRD:** `opc/_Initiation/_prd/domains/reports.prd.json`
**Status:** COMPLETED - UI Patterns Added

## Summary

Enhanced Reports Domain PRD with comprehensive `uiPatterns` field for all 7 stories. The patterns reference RE-UI Chart components, TanStack Table (DataGrid), and existing dashboard components from the codebase and reference materials.

## Changes Made

### 1. DOM-RPT-004: Financial Summary Report
**UI Patterns Added:**
- KPI Cards Grid (4 cards with mini area/line charts)
- Line Chart (P&L Trend) - ComposedChart with Area + Line + custom Tooltip
- Data Table (Cash Flow breakdown)
- Export Actions (DropdownMenu with Download/Filter/Share)

**References:**
- `_reference/.reui-reference/registry/default/blocks/charts/area-charts/area-chart-1.tsx` - KPI card pattern
- `_reference/.reui-reference/registry/default/blocks/charts/line-charts/line-chart-1.tsx` - P&L chart pattern
- TanStack Table - existing codebase patterns

**Visual Hierarchy:** KPI cards (top) → P&L chart (middle) → Cash flow table (bottom)

---

### 2. DOM-RPT-005a: Scheduled Reports Schema
**UI Patterns Added:**
- N/A - Schema only story
- Documented data flow for migration with RLS policies

---

### 3. DOM-RPT-005b: Schedule Management Server Functions
**UI Patterns Added:**
- N/A - Server functions only
- Documented interaction with scheduled_reports table via Supabase RLS

---

### 4. DOM-RPT-005c: Schedule Management UI
**UI Patterns Added:**
- Schedule Dialog (Form modal with frequency, recipients, format fields)
- Schedule List Card (CardHeader + CardContent + CardToolbar pattern)
- Toolbar Button (Schedule button in ReportLayout)

**References:**
- Shadcn Dialog + Form components (existing in codebase)
- `_reference/.reui-reference/registry/default/blocks/charts/line-charts/line-chart-1.tsx` - CardHeader toolbar pattern
- Existing ReportLayout toolbar pattern

**Data Flow:** Schedule button → Dialog → Form submit → createScheduledReport() → Trigger.dev integration

---

### 5. DOM-RPT-006a: Report Favorites Schema
**UI Patterns Added:**
- N/A - Schema only story
- Documented migration for report_favorites table

---

### 6. DOM-RPT-006b: Favorites Server Functions
**UI Patterns Added:**
- N/A - Server functions only
- Documented CRUD operations for report favorites

---

### 7. DOM-RPT-006c: Favorites UI
**UI Patterns Added:**
- Favorite Star Button (toggle icon in ReportLayout header)
- Favorites Grid Section (top section in reports hub)
- Favorite Card (individual favorite with icon, name, filter badges)

**References:**
- Lucide Star icon + Button component
- `_reference/.reui-reference/registry/default/blocks/charts/area-charts/area-chart-1.tsx` - grid layout pattern
- Card + CardContent + Badge components

**Visual Hierarchy:** Reports hub: Favorites grid (top) → All reports grid (below)

---

### 8. DOM-RPT-007: Simple Report Builder
**UI Patterns Added:**
- Builder Wizard (multi-step sidebar with Tabs)
- Column Selector (Command component with checkboxes and drag-to-reorder)
- Filter Builder (reuse existing DateRangePicker, Select, Input)
- Data Table Preview (live preview in right panel)
- Save/Share Dialog (modal for saving custom reports)

**References:**
- Shadcn Form + Tabs components (vertical orientation)
- Shadcn Command + Checkbox components
- Existing filter components from other reports
- TanStack Table component
- Shadcn Dialog + Form components

**Visual Hierarchy:** Left sidebar (builder steps) | Right panel (live preview table) | Top toolbar (Save/Share buttons)

---

## RE-UI Component References

### Charts (from `_reference/.reui-reference/registry/default/blocks/charts/`)

1. **Area Charts** (`area-chart-1.tsx`)
   - KPI card pattern with icon + title + value + mini chart
   - ResponsiveContainer + AreaChart with gradient fill
   - Custom Tooltip with formatted values
   - Used in: DOM-RPT-004 (Financial KPI cards)

2. **Line Charts** (`line-chart-1.tsx`)
   - Card with CardHeader (title + toolbar with DropdownMenu)
   - ComposedChart with CartesianGrid, XAxis, YAxis
   - Multiple Line components (solid and dashed)
   - Area with gradient background
   - Custom Tooltip with ChartLabel components and Badges
   - ReferenceLine for current period
   - Export/Filter/Share actions in DropdownMenu
   - Used in: DOM-RPT-004 (P&L chart), DOM-RPT-005c (Schedule list cards)

### DataGrid Components

- **TanStack Table** - referenced as existing codebase pattern
- Used in: DOM-RPT-004 (Cash flow table), DOM-RPT-007 (Report builder preview)

### Dashboard Components

- **Card Patterns** - CardHeader, CardContent, CardToolbar
- **Form Components** - Dialog, Select, Combobox, Input, Switch, Radio
- **UI Components** - Button, Badge, DropdownMenu, Tabs, Command, Checkbox

---

## Implementation Guidance

### For DOM-RPT-004 (Financial Summary Report)
1. Start with KPI card grid (reference area-chart-1.tsx)
2. Implement P&L chart (reference line-chart-1.tsx)
3. Add cash flow table (TanStack Table)
4. Wire up server function getFinancialSummaryReport()

### For DOM-RPT-005c (Schedule Management UI)
1. Add Schedule button to ReportLayout toolbar
2. Create Schedule Dialog with Form fields
3. Build Schedule List page at /reports/schedules
4. Integrate with Trigger.dev emailReport task

### For DOM-RPT-006c (Favorites UI)
1. Add Star button to ReportLayout header
2. Create Favorites grid section in reports hub
3. Wire up addReportFavorite/getReportFavorites/removeReportFavorite

### For DOM-RPT-007 (Report Builder)
1. Design multi-step wizard with Tabs (vertical)
2. Build column selector with Command component
3. Reuse existing filter components
4. Add live preview table with TanStack Table
5. Create Save/Share dialog

---

## Key Decisions

1. **Chart Library:** Using Recharts (via RE-UI reference patterns)
   - Rationale: Consistent with reference materials, good TypeScript support

2. **Table Library:** Using TanStack Table
   - Rationale: Already referenced in codebase patterns, excellent TypeScript support

3. **Form Components:** Using Shadcn UI components
   - Rationale: Consistent with existing codebase, composable patterns

4. **Layout Patterns:** Card-based with CardHeader/CardContent/CardToolbar
   - Rationale: Matches RE-UI reference patterns, provides consistent structure

---

## Validation

- JSON syntax validated (valid JSON structure)
- All 7 stories have uiPatterns field
- Schema/Server stories documented as N/A with data flow notes
- UI stories have comprehensive component references
- Data flow documented for each pattern
- Visual hierarchy specified for complex UIs

---

## Next Steps

1. Review uiPatterns with design/product team
2. Validate component references exist in codebase
3. Create wireframes/mockups based on patterns
4. Begin implementation with DOM-RPT-004 (highest priority)
5. Consider creating reusable report components (ReportKPICard, ReportChart, etc.)

---

## Questions for Stakeholders

1. **DOM-RPT-004:** Should cash flow table be interactive (drill-down into transactions)?
2. **DOM-RPT-005c:** Frequency options - daily/weekly/monthly sufficient, or need custom cron?
3. **DOM-RPT-006c:** Favorites limit per user?
4. **DOM-RPT-007:** Report builder complexity - defer to Phase 2 or proceed in Phase 1?

---

## References

- RE-UI Charts: `_reference/.reui-reference/registry/default/blocks/charts/`
- Shadcn Components: Existing in renoz-v3 codebase
- TanStack Table: Referenced in codebase patterns
- Reports Domain: `src/components/domain/reports/` (to be created)
