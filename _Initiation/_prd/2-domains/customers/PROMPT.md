# Ralph Loop: Customers Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Implement complete customer relationship management (CRM) system with 360-degree customer views, health scoring, segmentation, and comprehensive customer data management across the business ecosystem.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CUST-CORE-SCHEMA.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server stories (CUST-CORE-API, etc.) | Saga pattern for multi-step ops, proper retry logic |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | API & UI stories | List <500ms, detail <300ms, pagination limit 50 |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | UI stories | Cmd+N new customer, hover preview actions |

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/customers/customers.prd.json` - Complete customer domain specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: TanStack Query

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CUST-*`
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

Execute stories in dependency order from customers.prd.json:

### Phase 1: Core Infrastructure (CUST-CORE)
1. **CUST-CORE-SCHEMA** - Customer database schema foundation
   - Wireframes: `DOM-CUST-001c.wireframe.md`
   - Dependencies: Foundation (schema, auth)
   - Creates: All 7 customer tables with RLS
   - Promise: `CUST_CORE_SCHEMA_COMPLETE`

2. **CUST-CORE-API** - Customer lifecycle and relationship APIs
   - Wireframes: `DOM-CUST-002c.wireframe.md`, `DOM-CUST-005c.wireframe.md`
   - Dependencies: CUST-CORE-SCHEMA
   - Creates: Server functions for all customer operations
   - Promise: `CUST_CORE_API_COMPLETE`

### Phase 2: User Interfaces (CUST-UI)
3. **CUST-DIRECTORY-UI** - Customer search and management interface
   - Wireframes: `DOM-CUST-003b.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: List view, advanced filters, bulk operations
   - Promise: `CUST_DIRECTORY_UI_COMPLETE`

4. **CUST-360-VIEW-UI** - Customer relationship dashboard
   - Wireframes: `DOM-CUST-004a.wireframe.md`, `DOM-CUST-004b.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: Metrics, activity timeline, relationships
   - Promise: `CUST_360_VIEW_UI_COMPLETE`

5. **CUST-FORM-MANAGEMENT** - Customer creation and editing
   - Wireframes: `DOM-CUST-004b.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: Multi-section wizard, contacts, addresses, tags
   - Promise: `CUST_FORM_MANAGEMENT_COMPLETE`

### Phase 3: Advanced Features (CUST-ADVANCED)
6. **CUST-HEALTH-MANAGEMENT** - Health scoring and monitoring
   - Wireframes: `DOM-CUST-005c.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: Score calculation, trends, recommendations, alerts
   - Promise: `CUST_HEALTH_MANAGEMENT_COMPLETE`

7. **CUST-SEGMENTATION-UI** - Dynamic customer segmentation
   - Wireframes: `DOM-CUST-006c.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: Segment builder, targeting, analytics
   - Promise: `CUST_SEGMENTATION_UI_COMPLETE`

8. **CUST-COMMUNICATION-HUB** - Centralized communication management
   - Wireframes: `DOM-CUST-007b.wireframe.md`
   - Dependencies: CUST-CORE-API
   - Features: Timeline, templates, campaigns
   - Promise: `CUST_COMMUNICATION_HUB_COMPLETE`

### Phase 4: Integration & Analytics (CUST-FINAL)
9. **CUST-ANALYTICS-REPORTING** - Analytics and automated reporting
   - Dependencies: CUST-CORE-API
   - Features: Lifecycle, segmentation, value analysis, dashboards
   - Promise: `CUST_ANALYTICS_REPORTING_COMPLETE`

10. **CUST-INTEGRATION-API** - System integration layer
    - Dependencies: CUST-CORE-API
    - Features: Context providers, hooks, utilities
    - Promise: `CUST_INTEGRATION_API_COMPLETE`

11. **CUST-MERGE-DEDUPLICATION** - Record merging and deduplication
    - Dependencies: CUST-CORE-API
    - Features: Duplicate detection, merge comparison, rollback
    - Promise: `CUST_MERGE_DEDUPLICATION_COMPLETE`

12. **CUST-BULK-OPERATIONS** - Efficient bulk management
    - Dependencies: CUST-CORE-API
    - Features: Selection, batch updates, import/export
    - Promise: `CUST_BULK_OPERATIONS_COMPLETE`

### Phase 5: Duplicate Detection (CUST-DEDUP)
13. **CUST-DEDUP-001** - Real-time Duplicate Detection
    - Dependencies: None (can run after CUST-CORE-API)
    - Features: Fuzzy matching during creation, warning panel, pg_trgm
    - Promise: `CUST_DEDUP_001_COMPLETE`

14. **CUST-DEDUP-002** - Duplicate Merge Tool Enhancement
    - Dependencies: CUST-DEDUP-001
    - Features: Find duplicates scan, review queue, merge with audit trail
    - Promise: `CUST_DEDUP_002_COMPLETE`

## Wireframe References

All customer domain wireframes follow the naming pattern `DOM-CUST-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| DOM-CUST-001c | CUST-CORE-SCHEMA | Core customer tables design |
| DOM-CUST-002c | CUST-CORE-API | API endpoint structure and responses |
| DOM-CUST-003b | CUST-DIRECTORY-UI | Customer list, filters, search interface |
| DOM-CUST-004a | CUST-360-VIEW-UI | Customer detail metrics and tabs |
| DOM-CUST-004b | CUST-FORM-MANAGEMENT | Customer form wizard and sections |
| DOM-CUST-005c | CUST-HEALTH-MANAGEMENT | Health score visualizations and factors |
| DOM-CUST-006c | CUST-SEGMENTATION-UI | Segment builder and analytics |
| DOM-CUST-007b | CUST-COMMUNICATION-HUB | Communication timeline and templates |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL customer domain stories pass successfully:
```xml
<promise>DOM_CUSTOMERS_COMPLETE</promise>
```

## Constraints

### Database Extensions
- **pg_trgm**: Required for CUST-DEDUP-001 fuzzy matching
  - Enable via migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - Used for similarity() function with 0.3 threshold

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure for all files
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Implement RLS policies for organization isolation
- Run `bun run typecheck` after each story
- Reference wireframes for UI/UX compliance

### DO NOT
- Modify files outside customers domain scope
- Skip acceptance criteria from PRD
- Use client-side validation alone (always server-side)
- Create components that duplicate shadcn/ui
- Hardcode configuration values
- Create database tables without migrations

## File Structure

Customer domain files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── customers.ts
│   │   │   ├── contacts.ts
│   │   │   ├── addresses.ts
│   │   │   ├── customer-activities.ts
│   │   │   ├── customer-tags.ts
│   │   │   ├── customer-health.ts
│   │   │   ├── customer-priorities.ts
│   │   │   └── index.ts
│   │   └── server/
│   │       ├── functions/
│   │       │   ├── customers.ts
│   │       │   ├── contacts.ts
│   │       │   ├── addresses.ts
│   │       │   ├── customer-activities.ts
│   │       │   ├── customer-tags.ts
│   │       │   ├── customer-health.ts
│   │       │   ├── customer-analytics.ts
│   │       │   ├── customer-duplicates.ts
│   │       │   ├── customer-duplicate-scan.ts
│   │       │   └── index.ts
│   │       └── schemas/
│   │           └── customers.ts
│   ├── contexts/
│   │   └── customer-context.tsx
│   └── hooks/
│       ├── use-customers.ts
│       ├── use-customer-health.ts
│       ├── use-customer-activities.ts
│       └── use-duplicate-detection.ts
│   ├── components/
│   │   └── domain/
│   │       └── customers/
│   │           ├── customer-directory.tsx
│   │           ├── customer-filters.tsx
│   │           ├── customer-table.tsx
│   │           ├── customer-360-view.tsx
│   │           ├── metrics-dashboard.tsx
│   │           ├── activity-timeline.tsx
│   │           ├── customer-form.tsx
│   │           ├── customer-wizard.tsx
│   │           ├── contact-manager.tsx
│   │           ├── address-manager.tsx
│   │           ├── health-dashboard.tsx
│   │           ├── health-score-gauge.tsx
│   │           ├── health-recommendations.tsx
│   │           ├── segment-builder.tsx
│   │           ├── communication-timeline.tsx
│   │           ├── duplicate-warning-panel.tsx
│   │           ├── duplicate-scan-button.tsx
│   │           ├── duplicate-review-queue.tsx
│   │           ├── duplicate-comparison.tsx
│   │           └── ... (other components)
│   └── routes/
│       └── _authed/
│           └── customers/
│               ├── index.tsx
│               ├── $customerId.tsx
│               ├── segments/
│               │   └── index.tsx
│               └── communications.tsx
└── drizzle/
    └── migrations/
        └── 012_customers.ts
```

## Key Success Metrics

- Complete CRUD operations for customers and related entities
- All acceptance criteria from PRD implemented
- All wireframes referenced in UI implementation
- Zero TypeScript errors
- All tests passing
- RLS policies protecting customer data
- Performance targets met:
  - Customer search < 200ms
  - Customer detail load < 500ms
  - List 100 customers < 1 second
  - Health score calculation < 100ms

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - API response structure → Reference DOM-CUST-002c wireframe

## Progress Template

```markdown
# Customers Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CUST-CORE-SCHEMA: Customer Core Schema
- [ ] CUST-CORE-API: Customer Core API
- [ ] CUST-DIRECTORY-UI: Customer Directory Interface
- [ ] CUST-360-VIEW-UI: Customer 360 View Interface
- [ ] CUST-FORM-MANAGEMENT: Customer Form Management
- [ ] CUST-HEALTH-MANAGEMENT: Customer Health Management
- [ ] CUST-SEGMENTATION-UI: Customer Segmentation Interface
- [ ] CUST-COMMUNICATION-HUB: Customer Communication Hub
- [ ] CUST-ANALYTICS-REPORTING: Customer Analytics and Reporting
- [ ] CUST-INTEGRATION-API: Customer System Integration Layer
- [ ] CUST-MERGE-DEDUPLICATION: Customer Merge and Deduplication
- [ ] CUST-BULK-OPERATIONS: Customer Bulk Operations

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
**Target:** renoz-v3 Customers Domain
**Completion Promise:** DOM_CUSTOMERS_COMPLETE
