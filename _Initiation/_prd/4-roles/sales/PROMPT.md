# Ralph Loop: Sales Role Optimization

## Objective
Build the Sales role experience with quote generation, customer intelligence, forecasting, and follow-up tracking. Enable sales teams to create quotes quickly, maintain customer relationships, and track sales pipelines with minimal friction.

## Required Reading

Before implementing any story, review these critical resources:

### Frontend Components
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories |
| 3-Click Rule | `_meta/patterns/ux-3-click-rule.md` | UI stories - verify click counts |
| Performance | `_meta/patterns/performance-benchmarks.md` | API endpoints - verify response times |

**IMPORTANT**: Pattern compliance is part of acceptance criteria.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with ROLE-SALES-001.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/4-roles/sales.prd.json` - Sales role optimization stories

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
- **Wizards**: Multi-step quote creation wizard
- **Analytics**: Forecasting and win/loss analysis

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

### Phase: Sales Role (ROLE-SALES)
Execute stories in priority order from sales.prd.json:

1. ROLE-SALES-001: Quote Creation Wizard (<5 min)
2. ROLE-SALES-003: Customer 360 Quick Actions
3. ROLE-SALES-004a: Sales Dashboard Route
4. ROLE-SALES-004b: Forecasting Widgets
5. ROLE-SALES-005a: Follow-up Date Schema
6. ROLE-SALES-005b: Follow-up Server Functions
7. ROLE-SALES-005c: Follow-up Dashboard Widget and UI
8. ROLE-SALES-006: Quote Templates Library
9. ROLE-SALES-007: Quote Expiry Alerts Widget
10. ROLE-SALES-008: Win/Loss Analysis View

## Completion

When ALL sales stories pass:
```xml
<promise>ROLE_SALES_PHASE_COMPLETE</promise>
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
- Implement server-side quote generation logic
- Add proper role-based access checks
- Optimize for quick quote creation (target <5 min for wizard)
- Provide smart defaults and templates

### DO NOT
- Modify files outside sales scope
- Skip acceptance criteria
- Use client-side checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Make quote creation cumbersome or slow
- Implement features for other roles
- Forget to validate quote data comprehensively
- Create wizards with too many steps

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── sales/                  # Sales-specific routes
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── quotes/
│   │   │   │   ├── customers/
│   │   │   │   ├── followups.tsx
│   │   │   │   ├── forecasts.tsx
│   │   │   │   ├── templates.tsx
│   │   │   │   └── analysis.tsx
│   ├── components/
│   │   ├── sales/                      # Sales-specific components
│   │   │   ├── QuoteWizard.tsx
│   │   │   ├── QuoteCreationForm.tsx
│   │   │   ├── CustomerQuickActions.tsx
│   │   │   ├── ForecastingWidget.tsx
│   │   │   ├── FollowUpTracker.tsx
│   │   │   ├── QuoteTemplates.tsx
│   │   │   ├── QuoteExpiryAlert.tsx
│   │   │   └── WinLossAnalysis.tsx
│   │   └── shared/
│   └── lib/
│       ├── sales/                      # Sales business logic
│       ├── server/                     # Server functions
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
  - Wizard state management → Use React Context or form library state
  - Quote template inheritance → Verify schema relationships
  - Follow-up date reminders → Check scheduled job triggers
  - Forecasting calculations → Verify pipeline stage weighting logic
  - Win/loss analysis → Ensure proper opportunity status tracking

## Progress Template

```markdown
# Sales Role Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ROLE-SALES-001: Quote Creation Wizard (<5 min)
- [ ] ROLE-SALES-003: Customer 360 Quick Actions
- [ ] ROLE-SALES-004a: Sales Dashboard Route
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

## 3-Click Rule Compliance

See `_meta/patterns/ux-3-click-rule.md` for standards.

Key shortcuts for this role:
- **Cmd+Q** - New Quote (opens wizard)
- **Cmd+N** - New Customer
- **Cmd+L** - Log Call
- **Cmd+K** - Global Search / Command Palette

Key UX patterns:
- Sales dashboard is default landing page (1 click to view pipeline)
- Customer hover preview cards with quick actions (Call, Email, Quote)
- Follow-up widget with snooze/complete actions
- Quote wizard with timer (target <5 min completion)

Audit status: **PASSED**

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Sales Role Phase
**Completion Promise:** ROLE_SALES_PHASE_COMPLETE
