# Ralph Loop: Reports Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective

Build the Reports domain for renoz-v3: Financial Summary Report, Report Scheduling, Report Favorites, and a Simple Report Builder. This domain provides business reporting and analytics capabilities with pre-built reports and custom report creation.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-RPT-004.

## Context

### PRD File
`opc/_Initiation/_prd/2-domains/reports/reports.prd.json`

### Wireframe Files
| Story | Wireframe |
|-------|-----------|
| DOM-RPT-004 | `./wireframes/RPT-004.wireframe.md` |
| DOM-RPT-005c | `./wireframes/RPT-005c.wireframe.md` |
| DOM-RPT-006c | `./wireframes/RPT-006c.wireframe.md` |
| DOM-RPT-007 | `./wireframes/RPT-007.wireframe.md` |

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts (via reui patterns)
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod
- **Background Jobs**: Trigger.dev

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Read the wireframe** for UI implementation details
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Independent Stories (No Blockers)

#### DOM-RPT-004: Financial Summary Report [Priority 1]
**Layers**: server, ui
**Dependencies**: None (uses existing schema)
**Estimated Iterations**: 5

Creates financial performance overview with P&L, cash flow, and AR tracking.

**Acceptance Criteria**:
- Financial report page at /reports/financial
- Metrics: revenue, costs, gross margin, outstanding AR
- P&L style summary from orders data
- Cash flow indicators
- Comparison to budget/forecast (if targets set)
- Reuse existing ReportLayout and export infrastructure
- Export to CSV/PDF
- TypeScript compiles without errors

**Server Functions to Create**:
- `getFinancialSummaryReport` - aggregates orders/payments, returns { kpis, trends, cashFlow }

**Wireframe Reference**: DOM-RPT-004.wireframe.md

---

### Phase 2: Schema + Server Stories (Blockers for UI)

#### DOM-RPT-005a: Scheduled Reports Schema [Priority 2]
**Layers**: schema
**Dependencies**: None
**Estimated Iterations**: 2

**Acceptance Criteria**:
- `scheduled_reports` table (id, organizationId, userId, reportType, frequency, recipients, filters, format, enabled, lastRunAt, nextRunAt, createdAt, updatedAt)
- Migration runs successfully
- TypeScript compiles without errors

---

#### DOM-RPT-005b: Schedule Management Server Functions [Priority 3]
**Layers**: server
**Dependencies**: DOM-RPT-005a
**Estimated Iterations**: 2

**Acceptance Criteria**:
- createScheduledReport, getScheduledReports, updateScheduledReport, deleteScheduledReport server functions
- RLS enforced for organization scope
- TypeScript compiles without errors

---

#### DOM-RPT-006a: Report Favorites Schema [Priority 5]
**Layers**: schema
**Dependencies**: None
**Estimated Iterations**: 1

**Acceptance Criteria**:
- `report_favorites` table (id, userId, reportType, filters, name, createdAt) OR add favorites array to user_preferences.dashboardLayout
- Migration runs successfully
- TypeScript compiles without errors

---

#### DOM-RPT-006b: Favorites Server Functions [Priority 6]
**Layers**: server
**Dependencies**: DOM-RPT-006a
**Estimated Iterations**: 1

**Acceptance Criteria**:
- addReportFavorite, getReportFavorites, removeReportFavorite server functions
- TypeScript compiles without errors

---

### Phase 3: UI Stories (After Backend Complete)

#### DOM-RPT-005c: Schedule Management UI [Priority 4]
**Layers**: ui
**Dependencies**: DOM-RPT-005b (MUST BE COMPLETE)
**Estimated Iterations**: 2

**Acceptance Criteria**:
- Schedule button on each report page
- Schedule dialog: frequency (daily/weekly/monthly), recipients, format
- Schedule list view accessible from reports hub
- Edit/delete/toggle enabled for existing schedules
- Integration with existing emailReport Trigger.dev task
- TypeScript compiles without errors

**Wireframe Reference**: DOM-RPT-005c.wireframe.md

---

#### DOM-RPT-006c: Favorites UI [Priority 7]
**Layers**: ui
**Dependencies**: DOM-RPT-006b (MUST BE COMPLETE)
**Estimated Iterations**: 2

**Acceptance Criteria**:
- Favorite star button in ReportLayout header
- Save current filters with favorite
- Favorites section at top of reports hub
- Click favorite navigates to report with saved filters
- Remove favorite option
- TypeScript compiles without errors

**Wireframe Reference**: DOM-RPT-006c.wireframe.md

---

#### DOM-RPT-007: Simple Report Builder [Priority 8]
**Layers**: schema, server, ui
**Dependencies**: None (self-contained)
**Estimated Iterations**: 8

**Note**: High complexity - consider deferring if timeline is tight.

**Acceptance Criteria**:
- Report builder UI at /reports/builder
- Select data source (customers, orders, products)
- Choose columns to display
- Add filters and date ranges (reuse existing filter components)
- Sort and group options
- Save custom report with name
- Share report with team
- TypeScript compiles without errors

**Server Functions to Create**:
- `buildCustomReport` - executes query with column/filter config
- `saveCustomReport` - persists custom report configuration

**Wireframe Reference**: DOM-RPT-007.wireframe.md

---

## Critical Blockers

### UI Stories BLOCKED Until Backend Complete

| UI Story | Blocked By | Reason |
|----------|------------|--------|
| DOM-RPT-005c (Schedule UI) | DOM-RPT-005a, DOM-RPT-005b | Needs scheduled_reports table and CRUD functions |
| DOM-RPT-006c (Favorites UI) | DOM-RPT-006a, DOM-RPT-006b | Needs report_favorites table and CRUD functions |

### Recommended Execution Order

```
1. DOM-RPT-004 (standalone, no blockers)
2. DOM-RPT-005a (schema - enables 005b)
3. DOM-RPT-006a (schema - enables 006b)
4. DOM-RPT-005b (server - enables 005c)
5. DOM-RPT-006b (server - enables 006c)
6. DOM-RPT-005c (UI - dependencies now met)
7. DOM-RPT-006c (UI - dependencies now met)
8. DOM-RPT-007 (complex, save for last or defer)
```

---

## Domain-Specific Constraints

### DO
- Follow existing ReportLayout pattern from codebase
- Use Recharts for charts (as per reui-reference patterns)
- Use TanStack Table for data grids
- Reference wireframes for detailed UI specifications
- Use shadcn/ui Dialog for desktop, Sheet for mobile
- Implement loading skeletons for all data-fetching components
- Include empty states and error states
- Support CSV/PDF export using existing infrastructure
- Integrate with Trigger.dev emailReport task for scheduling

### DO NOT
- Skip schema stories and go directly to UI
- Create new chart libraries (use Recharts)
- Implement Report Builder before other stories complete
- Hardcode organization IDs or user IDs
- Skip RLS policies on new tables

---

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   └── _authed/
│   │       └── reports/
│   │           ├── financial.tsx        # DOM-RPT-004
│   │           ├── schedules.tsx        # DOM-RPT-005c
│   │           ├── favorites.tsx        # DOM-RPT-006c
│   │           └── builder.tsx          # DOM-RPT-007
│   ├── components/
│   │   └── domain/
│   │       └── reports/
│   │           ├── financial-summary/   # DOM-RPT-004 components
│   │           ├── scheduling/          # DOM-RPT-005c components
│   │           ├── favorites/           # DOM-RPT-006c components
│   │           └── builder/             # DOM-RPT-007 components
│   └── lib/
│       └── server/
│           └── reports/
│               ├── financial.ts         # getFinancialSummaryReport
│               ├── scheduled-reports.ts # CRUD for schedules
│               ├── favorites.ts         # CRUD for favorites
│               └── custom-reports.ts    # buildCustomReport, saveCustomReport
├── drizzle/
│   └── schema/
│       ├── scheduled_reports.ts         # DOM-RPT-005a
│       ├── report_favorites.ts          # DOM-RPT-006a
│       └── custom_reports.ts            # DOM-RPT-007
└── tests/
    └── integration/
        └── reports/                     # Integration tests
```

---

## Completion

When ALL reports stories pass:
```xml
<promise>DOM_REPORTS_COMPLETE</promise>
```

---

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Chart rendering issues → Check ChartContainer configuration
  - Table column definitions → Reference TanStack Table patterns

---

## Progress Template

```markdown
# Reports Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] DOM-RPT-004: Financial Summary Report
- [ ] DOM-RPT-005a: Scheduled Reports Schema
- [ ] DOM-RPT-005b: Schedule Management Server Functions
- [ ] DOM-RPT-005c: Schedule Management UI
- [ ] DOM-RPT-006a: Report Favorites Schema
- [ ] DOM-RPT-006b: Favorites Server Functions
- [ ] DOM-RPT-006c: Favorites UI
- [ ] DOM-RPT-007: Simple Report Builder

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Reports Domain
