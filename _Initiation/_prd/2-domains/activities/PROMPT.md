# Ralph Loop: Activities Domain Implementation

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## UI Implementation Constraints

> **IMPORTANT:** All UI stories MUST follow these constraints from the project's /ui skill.

### Critical Requirements (Block Deployment)

| Component | Requirement |
|-----------|-------------|
| All inputs | `aria-label` on icon-only buttons, associated labels |
| Navigation | Use `<a>`/`<Link>` not `div onClick` |
| Focus | Visible `:focus-visible` rings on all interactive elements |
| Keyboard | Full keyboard support per WAI-ARIA APG patterns |

### Activities-Specific UI Rules

#### ACTIVITY-FEED-UI
- [ ] MUST virtualize if >50 activities (`@tanstack/react-virtual`)
- [ ] Infinite scroll MUST show loading skeleton at bottom
- [ ] Filter state MUST be reflected in URL (deep-linkable)
- [ ] Real-time updates MUST use `aria-live="polite"`
- [ ] Empty state MUST have clear next action (e.g., "Log first activity")

#### ACTIVITY-TIMELINE-UI
- [ ] Vertical timeline MUST use semantic list (`<ul>` or `<ol>`)
- [ ] Collapsible date groups MUST use `aria-expanded`
- [ ] Change diff viewer MUST use tabular layout for comparisons
- [ ] Entity links MUST use `<a>`/`<Link>`, NEVER `div onClick`
- [ ] Activity type icons MUST have `aria-label` or visible text

#### ACTIVITY-DASHBOARD-UI
- [ ] Heatmap MUST use accessible color scale + tooltip with values
- [ ] Date range picker MUST have full keyboard support
- [ ] Leaderboard MUST use `tabular-nums` for score alignment
- [ ] All charts MUST be color-blind-friendly (not color-only info)
- [ ] Dashboard widgets MUST have skeleton loaders matching final layout

### Animation Rules
- NEVER add animation unless explicitly requested in wireframe
- MUST honor `prefers-reduced-motion`
- MUST animate only `transform`/`opacity` (compositor props)
- NEVER use `transition: all` - list properties explicitly
- NEVER exceed 200ms for interaction feedback

### Component Primitives
Use existing shadcn/ui components:
- Dialogs: `Dialog` (Radix-based)
- Tabs: `Tabs` from shadcn
- Data Tables: `DataTable` + TanStack Table
- Timeline: Custom with semantic HTML
- Virtualization: `@tanstack/react-virtual`

### Consolidation Note
This domain takes precedence over CROSS-TIMELINE. After completion, CROSS-TIMELINE stories will be consolidated into these components.

## Consolidation Notice

> **WARNING:** This domain overlaps with CROSS-TIMELINE. See `_meta/consolidation-activities.md` for analysis.
>
> **Stories potentially deprecated:**
> - ACTIVITY-FEED-UI - Replaced by CROSS-TIMELINE-004
> - ACTIVITY-TIMELINE-UI - Replaced by CROSS-TIMELINE-006
> - ACTIVITY-DASHBOARD-UI - May move to CROSS-TIMELINE-007
>
> **Stories to implement:**
> - ACTIVITY-CORE-SCHEMA - Foundation (required by CROSS-TIMELINE)
> - ACTIVITY-LOGGING-API - Partial (Drizzle hooks only, retrieval moves to CROSS-TIMELINE)
>
> **Check consolidation document before implementing any story in this domain.**

---

## Objective

Build comprehensive audit trail and activity logging system providing complete visibility into user actions, system changes, and data modifications across all entities in the application. This domain enables compliance, debugging, and user behavior analysis.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with ACTIVITY-CORE-SCHEMA.

## Context

### PRD Files (in execution order)

1. `opc/_Initiation/_prd/2-domains/activities/activities.prd.json` - Complete Activities domain specification with all stories and system requirements

### Reference Files

- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Wireframes directory: `./wireframes/`

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
3. **Review wireframes** referenced in the story (if UI-related)
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

### Phase 1: Core Schema (ACTIVITY-CORE)

- **ACTIVITY-CORE-SCHEMA**: Activity Logging Core Schema
  - Database table: activities with all required fields
  - Composite indexes for all query patterns
  - Monthly partitioning setup on createdAt
  - RLS policies for organization-level isolation
  - TypeScript types exported
  - Migration script with proper indexes
  - Promise: `ACTIVITY_CORE_SCHEMA_COMPLETE`

### Phase 2: Logging API (ACTIVITY-API)

- **ACTIVITY-LOGGING-API**: Activity Logging API and Hooks
  - Drizzle lifecycle hooks for automatic logging
  - Context injection middleware for userId/ipAddress/userAgent
  - Manual activity logging utility functions
  - Activity retrieval endpoints with filtering
  - Activity statistics aggregation
  - Export functionality for compliance
  - Proper error handling and retry logic
  - Dependencies: ACTIVITY-CORE-SCHEMA
  - Promise: `ACTIVITY_LOGGING_API_COMPLETE`

### Phase 3: User Interfaces (ACTIVITY-UI)

- **ACTIVITY-FEED-UI**: Activity Feed Component
  - Timeline view with date grouping
  - User attribution with avatars
  - Action type icons and color coding
  - Filter by entity type, action, user, date range
  - Infinite scroll pagination
  - Real-time updates (websocket or polling)
  - Link to entity detail pages
  - Expandable change details
  - Dependencies: ACTIVITY-LOGGING-API
  - Promise: `ACTIVITY_FEED_UI_COMPLETE`

- **ACTIVITY-TIMELINE-UI**: Entity Activity Timeline Component
  - Vertical timeline with milestone markers
  - Entity-specific activity filtering
  - Expandable change diff viewer
  - Export timeline to PDF/CSV
  - Responsive layout for sidebar/tab placement
  - Loading and empty states
  - Pagination controls
  - Dependencies: ACTIVITY-LOGGING-API
  - Promise: `ACTIVITY_TIMELINE_UI_COMPLETE`

### Phase 4: Analytics (ACTIVITY-ANALYTICS)

- **ACTIVITY-DASHBOARD-UI**: Activity Analytics Dashboard
  - Activity heatmap by time
  - Top users leaderboard
  - Action distribution charts
  - Activity trends over time
  - Entity type breakdown
  - Date range selector
  - Export reports
  - Anomaly detection alerts
  - Dependencies: ACTIVITY-LOGGING-API
  - Promise: `ACTIVITY_DASHBOARD_UI_COMPLETE`

## Completion

When ALL activities domain stories pass:
```xml
<promise>DOM_ACTIVITIES_COMPLETE</promise>
```

## Story Wireframes

| Story ID | Wireframe File | Components |
|----------|----------------|------------|
| ACTIVITY-CORE-SCHEMA | (Schema - no UI) | Database tables, migrations |
| ACTIVITY-LOGGING-API | (API - no UI) | Server functions, middleware |
| ACTIVITY-FEED-UI | (Activity UI patterns) | Timeline, filters, infinite scroll |
| ACTIVITY-TIMELINE-UI | (Activity UI patterns) | Entity timeline, change diff |
| ACTIVITY-DASHBOARD-UI | (Analytics patterns) | Charts, heatmap, leaderboard |

## Constraints

### DO

- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for UI components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Implement RLS policies for organization isolation
- Use append-only pattern for activities table (no updates/deletes)
- Log asynchronously to avoid blocking transactions

### DO NOT

- Modify files outside activities domain scope without approval
- Skip acceptance criteria
- Log sensitive data (passwords, tokens, secrets)
- Delete or update activity records after creation
- Block main transactions with activity logging
- Skip pagination for activity queries

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── admin/
│   │   │   │   └── activities/
│   │   │   │       └── index.tsx           # Activity dashboard page
│   ├── components/
│   │   ├── domain/
│   │   │   └── activities/
│   │   │       ├── activity-feed.tsx
│   │   │       ├── activity-item.tsx
│   │   │       ├── activity-filters.tsx
│   │   │       ├── activity-timeline.tsx
│   │   │       ├── change-diff.tsx
│   │   │       ├── activity-dashboard.tsx
│   │   │       └── activity-charts.tsx
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── shared/                    # Custom shared components
│   │   └── layout/                    # Shell components
│   ├── lib/
│   │   ├── server/
│   │   │   └── functions/
│   │   │       └── activities.ts      # Activity server functions
│   │   ├── activity-logger.ts         # Activity logging utility
│   │   └── schemas/
│   │       └── activities.ts          # Zod schemas
│   ├── server/
│   │   └── middleware/
│   │       └── activity-context.ts    # Context injection
│   ├── hooks/
│   │   ├── use-activity-feed.ts
│   │   ├── use-entity-activities.ts
│   │   └── use-activity-stats.ts
├── drizzle/
│   ├── schema/
│   │   └── activities.ts
│   └── migrations/
│       └── 010_activities.ts
└── tests/
    └── integration/
        └── activities/
            └── [integration tests]
```

## Key Technologies & Patterns

### Database

- **Drizzle ORM** for type-safe database access
- **PostgreSQL** for persistence with partitioning
- **Row-Level Security (RLS)** for multi-tenant isolation
- **JSONB** for changes and metadata storage
- **Append-only** pattern (no updates or deletes)

### API

- **Server functions** (TanStack Start pattern)
- **Zod validation** for request/response
- **Async logging** to avoid blocking
- **Pagination** required for all queries (max 100 per page)

### UI

- **Timeline components** for activity display
- **Infinite scroll** for large activity sets
- **Real-time updates** via polling or websocket
- **Diff viewer** for change visualization
- **Chart.js or recharts** for analytics

### Performance

- **Query optimization**: All queries must use organizationId
- **Index strategy**: Composite indexes starting with organizationId
- **Caching**: Activity counts cached with 5-minute TTL
- **Rate limiting**: 1 request per 10 seconds per user for polling

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues - Check Drizzle $inferSelect patterns
  - JSONB typing - Use proper Zod schemas for changes/metadata
  - Partition setup - Check PostgreSQL partition syntax
  - Performance issues - Verify indexes are being used

## Progress Template

```markdown
# Activities Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ACTIVITY-CORE-SCHEMA: Activity Logging Core Schema
- [ ] ACTIVITY-LOGGING-API: Activity Logging API and Hooks
- [ ] ACTIVITY-FEED-UI: Activity Feed Component
- [ ] ACTIVITY-TIMELINE-UI: Entity Activity Timeline Component
- [ ] ACTIVITY-DASHBOARD-UI: Activity Analytics Dashboard

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
**Created:** 2026-01-13
**Target:** renoz-v3 Activities Domain
**Completion Promise:** DOM_ACTIVITIES_COMPLETE
