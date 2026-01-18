# Ralph Loop: Pipeline Domain Phase

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Build the Pipeline domain for renoz-v3: sales opportunity lifecycle management from lead capture through quote creation, customer approval, and order conversion. Includes forecasting, analytics, activity tracking, win/loss analysis, and quote management. This domain powers the primary sales engine and revenue forecasting system for Renoz Energy's Australian B2B battery sales business.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with PIPE-CORE-SCHEMA.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server stories (PIPE-CORE-API, PIPE-QUOTE-ENGINE, etc.) | Saga pattern for quote-to-order conversion |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | API & UI stories | Pipeline board <2s, forecast <500ms, pagination limit 50 |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | UI stories | Cmd+Q quick quote, Cmd+L log call, drag-drop stages |

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/pipeline/pipeline.prd.json`

### Wireframe Index
- `./wireframes/index.md`

### Individual Wireframes (UI stories only)
| Story | Wireframe |
|-------|-----------|
| PIPE-BOARD-UI | `./wireframes/pipeline-kanban-board.wireframe.md` |
| PIPE-DETAIL-UI | `./wireframes/pipeline-opportunity-card.wireframe.md` |
| PIPE-ACTIVITIES-UI | `./wireframes/pipeline-activity-logging.wireframe.md` |
| PIPE-QUOTE-BUILDER-UI | `./wireframes/pipeline-quote-builder.wireframe.md` |
| PIPE-FORECASTING-UI | `./wireframes/pipeline-forecasting-report.wireframe.md` |
| PIPE-WINLOSS-UI | `./wireframes/pipeline-win-loss-reasons.wireframe.md` |
| PIPE-VALIDITY-UI | `./wireframes/pipeline-quote-validity.wireframe.md` |
| PIPE-QUICK-QUOTE-UI | `./wireframes/pipeline-quick-quote.wireframe.md` |

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD only with 10% GST
- **Pipeline Stages**: New (10%) → Qualified (30%) → Quoted (60%) → Pending (80%) → Won (100%) / Lost (0%)
- **Typical Deal Sizes**: Residential 5-20kWh ($5K-$20K), Commercial 50-500kWh ($50K-$500K)
- **Win Rate Targets**: 65-70%
- **Quote Validity**: 30-day default with 7-day warning period

---

## Story Execution Order

### CRITICAL: Dependencies Must Be Respected

The Pipeline domain has a strict dependency chain. Stories flow from core infrastructure through capabilities to UI.

### Execution Phases

#### Phase 1: Core Infrastructure (No Dependencies)
These schema and API stories establish the foundation:

| Story ID | Name | Type |
|----------|------|------|
| PIPE-CORE-SCHEMA | Pipeline Core Schema | schema |
| PIPE-CORE-API | Pipeline Core API | server-function |

#### Phase 2: Supporting Infrastructure (Depends on Core)

| Story ID | Name | Type | Depends On |
|----------|------|------|------------|
| PIPE-ACTIVITIES-API | Activity Logging API | server-function | PIPE-CORE-SCHEMA |
| PIPE-QUOTE-BUILDER-API | Quote Builder API | server-function | PIPE-CORE-SCHEMA |
| PIPE-FORECASTING-API | Forecasting API | server-function | PIPE-CORE-API |
| PIPE-WINLOSS-API | Win/Loss Analysis API | server-function | PIPE-CORE-SCHEMA |
| PIPE-VALIDITY-API | Quote Validity API | server-function | PIPE-CORE-API |

#### Phase 3: UI Components (Each Depends on Server Functions)

| Story ID | Name | Type | Depends On | Wireframe |
|----------|------|------|------------|-----------|
| PIPE-BOARD-UI | Pipeline Board Interface | ui-component | PIPE-CORE-API | YES |
| PIPE-DETAIL-UI | Opportunity Detail Interface | ui-component | PIPE-CORE-API | YES |
| PIPE-ACTIVITIES-UI | Activity Logging Interface | ui-component | PIPE-ACTIVITIES-API | YES |
| PIPE-QUOTE-BUILDER-UI | Quote Builder Interface | ui-component | PIPE-QUOTE-BUILDER-API | YES |
| PIPE-FORECASTING-UI | Forecasting Report Interface | ui-component | PIPE-FORECASTING-API | YES |
| PIPE-WINLOSS-UI | Win/Loss Management Interface | ui-component | PIPE-WINLOSS-API | YES |
| PIPE-VALIDITY-UI | Quote Validity Interface | ui-component | PIPE-VALIDITY-API | YES |
| PIPE-QUICK-QUOTE-UI | Quick Quote Creation | ui-component | PIPE-CORE-API | YES |

---

## Recommended Execution Order

**Execute stories in this order to respect all dependencies:**

```
1.  PIPE-CORE-SCHEMA       - Pipeline Core Schema
2.  PIPE-CORE-API          - Pipeline Core API
3.  PIPE-ACTIVITIES-API    - Activity Logging API
4.  PIPE-QUOTE-BUILDER-API - Quote Builder API
5.  PIPE-FORECASTING-API   - Forecasting API
6.  PIPE-WINLOSS-API       - Win/Loss Analysis API
7.  PIPE-VALIDITY-API      - Quote Validity API
8.  PIPE-BOARD-UI          - Pipeline Board Interface (wireframe: pipeline-kanban-board.wireframe.md)
9.  PIPE-DETAIL-UI         - Opportunity Detail Interface (wireframe: pipeline-opportunity-card.wireframe.md)
10. PIPE-ACTIVITIES-UI     - Activity Logging Interface (wireframe: pipeline-activity-logging.wireframe.md)
11. PIPE-QUOTE-BUILDER-UI  - Quote Builder Interface (wireframe: pipeline-quote-builder.wireframe.md)
12. PIPE-FORECASTING-UI    - Forecasting Report Interface (wireframe: pipeline-forecasting-report.wireframe.md)
13. PIPE-WINLOSS-UI        - Win/Loss Management Interface (wireframe: pipeline-win-loss-reasons.wireframe.md)
14. PIPE-VALIDITY-UI       - Quote Validity Interface (wireframe: pipeline-quote-validity.wireframe.md)
15. PIPE-QUICK-QUOTE-UI    - Quick Quote Creation (wireframe: pipeline-quick-quote.wireframe.md)
```

---

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **For UI stories**: Read the corresponding wireframe file
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>` (use the completion_promise from PRD)
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

---

## Domain-Specific Constraints

### DO
- Store all monetary amounts in AUD cents (e.g., $1,500.00 = 150000)
- Apply 10% GST on all quote calculations
- Use probability-weighted value calculations (value × probability / 100)
- Distinguish residential vs commercial accounts by deal size ($5K-$20K vs $50K+)
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Use DataTable for list views, Dialog/Sheet for forms
- Implement proper loading skeletons and empty states
- Ensure WCAG 2.1 AA accessibility compliance
- Track all stage changes with activity history
- Enforce quote validity validation on conversion

### DO NOT
- Use multi-currency (AUD only)
- Create complex tax calculations beyond 10% GST
- Modify files outside pipeline domain scope
- Skip acceptance criteria
- Create duplicate UI components - use existing patterns
- Implement manual lead scoring - focus on structured pipeline only
- Skip RLS policies for organization isolation

### File Structure
```
renoz-v3/
├── src/
│   ├── routes/_authed/pipeline/
│   │   ├── index.tsx                    # Pipeline board (PIPE-BOARD-UI)
│   │   ├── $opportunityId.tsx           # Opportunity detail (PIPE-DETAIL-UI)
│   │   ├── reports/
│   │   │   └── forecast.tsx             # Forecasting report (PIPE-FORECASTING-UI)
│   │   └── settings/
│   │       └── win-loss-reasons.tsx     # Win/loss management (PIPE-WINLOSS-UI)
│   ├── components/domain/pipeline/
│   │   ├── pipeline-board.tsx           # Kanban board container
│   │   ├── pipeline-column.tsx          # Stage column with drag-drop
│   │   ├── opportunity-card.tsx         # Opportunity card in kanban
│   │   ├── opportunity-detail.tsx       # Detail panel (PIPE-DETAIL-UI)
│   │   ├── opportunity-form.tsx         # Edit form
│   │   ├── activity-logger.tsx          # Activity input (PIPE-ACTIVITIES-UI)
│   │   ├── activity-timeline.tsx        # Activity history
│   │   ├── follow-up-scheduler.tsx      # Follow-up scheduling
│   │   ├── quote-builder.tsx            # Quote editor (PIPE-QUOTE-BUILDER-UI)
│   │   ├── quote-pdf.tsx                # PDF preview
│   │   ├── quote-version-history.tsx    # Version management
│   │   ├── quote-validity-badge.tsx     # Expiration indicator (PIPE-VALIDITY-UI)
│   │   ├── extend-validity-dialog.tsx   # Extend validity form
│   │   ├── expired-quotes-alert.tsx     # Expiration warnings
│   │   ├── mark-won-dialog.tsx          # Win confirmation (PIPE-WINLOSS-UI)
│   │   ├── mark-lost-dialog.tsx         # Loss confirmation (PIPE-WINLOSS-UI)
│   │   ├── forecast-chart.tsx           # Forecast visualization (PIPE-FORECASTING-UI)
│   │   ├── forecast-table.tsx           # Forecast data table
│   │   ├── product-search.tsx           # Product search for quotes
│   │   └── quick-quote-dialog.tsx       # Quick quote (PIPE-QUICK-QUOTE-UI)
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── opportunities.ts
│   │   │   ├── opportunity-activities.ts
│   │   │   ├── quote-versions.ts
│   │   │   └── win-loss-reasons.ts
│   │   └── schemas/
│   │       └── pipeline.ts              # Zod validation schemas
│   └── server/functions/
│       ├── pipeline.ts                  # Core CRUD and metrics
│       ├── quote-versions.ts            # Quote operations
│       └── win-loss-reasons.ts          # Reason management
└── drizzle/
    └── schema/                          # Migration files
```

---

## External Dependencies

### Required Before Pipeline Domain
- **schema-foundation**: Base tables (organizations, users, customers)
- **DOM-PROD (Products)**: Pipeline depends on products for quote building
- **DOM-ORD (Orders)**: Pipeline converts opportunities to orders

### What Pipeline Enables
- **DOM-REPORTS (Reports)**: Uses pipeline metrics and forecasting
- **WF-SALES (Sales Workflow)**: Uses pipeline lifecycle
- **WF-INV (Invoicing)**: Uses won opportunities for order conversion

---

## Completion

When ALL pipeline stories pass:
```xml
<promise>DOM_PIPELINE_COMPLETE</promise>
```

---

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Wireframe mismatch → Re-read wireframe file for exact component structure
  - Drag-drop setup → Check DnD Kit patterns in reference implementation

---

## Progress Template

```markdown
# Pipeline Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
### Phase 1: Core Infrastructure
- [ ] PIPE-CORE-SCHEMA: Pipeline Core Schema
- [ ] PIPE-CORE-API: Pipeline Core API

### Phase 2: Supporting Infrastructure
- [ ] PIPE-ACTIVITIES-API: Activity Logging API
- [ ] PIPE-QUOTE-BUILDER-API: Quote Builder API
- [ ] PIPE-FORECASTING-API: Forecasting API
- [ ] PIPE-WINLOSS-API: Win/Loss Analysis API
- [ ] PIPE-VALIDITY-API: Quote Validity API

### Phase 3: UI Components
- [ ] PIPE-BOARD-UI: Pipeline Board Interface
- [ ] PIPE-DETAIL-UI: Opportunity Detail Interface
- [ ] PIPE-ACTIVITIES-UI: Activity Logging Interface
- [ ] PIPE-QUOTE-BUILDER-UI: Quote Builder Interface
- [ ] PIPE-FORECASTING-UI: Forecasting Report Interface
- [ ] PIPE-WINLOSS-UI: Win/Loss Management Interface
- [ ] PIPE-VALIDITY-UI: Quote Validity Interface
- [ ] PIPE-QUICK-QUOTE-UI: Quick Quote Creation

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
**Target:** renoz-v3 Pipeline Domain Phase
