# Ralph Loop: Admin/Manager Role Optimization

## Objective
Build the Admin/Manager role experience with business health visibility, exception alerts, approval workflows, and comprehensive dashboards. This enables owners and managers to monitor KPIs, detect issues, and make informed decisions.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with ROLE-ADMIN-001a.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/4-roles/admin.prd.json` - Admin/Manager optimization stories

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **AI**: Vercel AI SDK + Anthropic

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>[STORY_COMPLETION_PROMISE]</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase: Admin/Manager Role (ROLE-ADMIN)
Execute stories in priority order from admin.prd.json:

1. ROLE-ADMIN-001a: Add Date Range Selector to Dashboard Header
2. ROLE-ADMIN-001b: Add KPI Drill-Down Navigation
3. ROLE-ADMIN-002a: Add Exception Detection Server Functions
4. ROLE-ADMIN-002b: Add Exceptions Widget
5. ROLE-ADMIN-002c: Add Exception Alert Badge in Navigation
6. ROLE-ADMIN-003: Approval Queue
7. ROLE-ADMIN-004a: Add Team Performance Server Functions
8. ROLE-ADMIN-004b: Add Team Performance Page
9. ROLE-ADMIN-004c: Add User Trend Charts
10. ROLE-ADMIN-005a: Create Trends Page Route
11. ROLE-ADMIN-005b: Add Multiple Trend Charts
12. ROLE-ADMIN-005c: Add Chart Export
13. ROLE-ADMIN-006a: Add System Health Server Function
14. ROLE-ADMIN-006b: Add System Health Section in Settings
15. ROLE-ADMIN-007a: Add Customer Quick Stats Server Function
16. ROLE-ADMIN-007b: Add Product Quick Stats Server Function
17. ROLE-ADMIN-007c: Add Quick Stats Component to Detail Pages
18. ROLE-ADMIN-008a: Create Scheduled Reports Schema
19. ROLE-ADMIN-008b: Add Scheduled Reports Server Functions
20. ROLE-ADMIN-008c: Add Scheduled Reports UI
21. ROLE-ADMIN-008d: Add Trigger.dev Cron Job for Delivery

## Completion

When ALL admin stories pass:
```xml
<promise>ROLE_ADMIN_PHASE_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Implement server-side business logic first
- Add proper role-based access checks

### DO NOT
- Modify files outside role scope
- Skip acceptance criteria
- Use client-side checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values
- Implement features for other roles

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── admin/                 # Admin-specific routes
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── exceptions.tsx
│   │   │   │   ├── approvals.tsx
│   │   │   │   ├── team/
│   │   │   │   ├── trends/
│   │   │   │   └── reports/
│   ├── components/
│   │   ├── admin/                     # Admin-specific components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── ExceptionsWidget.tsx
│   │   │   ├── ApprovalQueue.tsx
│   │   │   └── ...
│   │   └── shared/
│   └── lib/
│       ├── admin/                     # Admin business logic
│       ├── server/                    # Server functions
│       └── schemas/
├── drizzle/
│   └── schema/
└── tests/
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Date range state management → Use React Context or URL params

## Progress Template

```markdown
# Admin Role Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ROLE-ADMIN-001a: Add Date Range Selector to Dashboard Header
- [ ] ROLE-ADMIN-001b: Add KPI Drill-Down Navigation
- [ ] ROLE-ADMIN-002a: Add Exception Detection Server Functions
...

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
**Target:** renoz-v3 Admin/Manager Role Phase
**Completion Promise:** ROLE_ADMIN_PHASE_COMPLETE
