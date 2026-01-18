# Ralph Loop: Finance Role Optimization

## Objective
Build the Finance role experience with comprehensive financial controls, reporting, and reconciliation capabilities. Enable finance teams to manage invoicing, payments, AR aging, financial reports, and automated payment reminders.

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
If progress.txt doesn't exist, start with ROLE-FIN-001a.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/4-roles/finance.prd.json` - Finance role optimization stories

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
- **Tables**: TanStack Table (for financial data)
- **Integrations**: Xero API for sync and reporting

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

### Phase: Finance Role (ROLE-FINANCE)
Execute stories in priority order from finance.prd.json:

1. ROLE-FIN-001a: Add Role-Based Dashboard Routing
2. ROLE-FIN-001b: Add Revenue MTD and Cash Flow Widgets
3. ROLE-FIN-001c: Add Invoices Awaiting Send and Recent Payments Widgets
4. ROLE-FIN-002a: Add Orders Ready to Invoice List
5. ROLE-FIN-002b: Add Invoice Generation Actions
6. ROLE-FIN-003a: Implement Payment Recording Server Functions
7. ROLE-FIN-003b: Add Payment Auto-Match and Multi-Invoice Allocation
8. ROLE-FIN-004a: Add Reconciliation Data Server Functions
9. ROLE-FIN-004b: Add Reconciliation View UI
10. ROLE-FIN-005a: Add AR Aging Server Function
11. ROLE-FIN-005b: Add AR Aging Dashboard UI
12. ROLE-FIN-006a: Add Financial Report Server Functions
13. ROLE-FIN-006b: Add Financial Reports UI
14. ROLE-FIN-007a: Add Payment Reminder Configuration
15. ROLE-FIN-007b: Add Payment Reminder Automation
16. ROLE-FIN-008a: Add Xero Sync Status Server Function
17. ROLE-FIN-008b: Add Xero Sync Status Dashboard Widget

## Completion

When ALL finance stories pass:
```xml
<promise>ROLE_FINANCE_PHASE_COMPLETE</promise>
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
- Implement server-side financial logic with proper audit trails
- Add proper role-based access checks
- Ensure data accuracy and reconciliation capabilities
- Handle currency and decimal precision correctly

### DO NOT
- Modify files outside finance scope
- Skip acceptance criteria
- Use client-side checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode financial calculations
- Implement features for other roles
- Store sensitive financial data insecurely
- Forget audit trail logging for financial transactions

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── finance/                # Finance-specific routes
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── invoicing/
│   │   │   │   ├── payments/
│   │   │   │   ├── reconciliation.tsx
│   │   │   │   ├── aging.tsx
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   ├── components/
│   │   ├── finance/                    # Finance-specific components
│   │   │   ├── RevenueWidget.tsx
│   │   │   ├── CashFlowWidget.tsx
│   │   │   ├── InvoiceGenerator.tsx
│   │   │   ├── PaymentRecorder.tsx
│   │   │   ├── ReconciliationView.tsx
│   │   │   ├── ARAging.tsx
│   │   │   └── ...
│   │   └── shared/
│   └── lib/
│       ├── finance/                    # Finance business logic
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
  - Decimal precision in calculations → Use appropriate number types
  - Xero API integration → Verify API credentials and sync logic
  - Currency handling → Ensure proper currency code usage
  - AR aging calculations → Verify date-based filtering logic

## Progress Template

```markdown
# Finance Role Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ROLE-FIN-001a: Add Role-Based Dashboard Routing
- [ ] ROLE-FIN-001b: Add Revenue MTD and Cash Flow Widgets
- [ ] ROLE-FIN-001c: Add Invoices Awaiting Send and Recent Payments Widgets
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
- **Cmd+I** - Create Invoice
- **Cmd+P** - Record Payment
- **Cmd+K** - Global Search / Command Palette

Key UX patterns:
- Financial dashboard is default landing page (1 click to view AR aging)
- Orders ready to invoice list with one-click invoice generation
- Bulk invoice creation for multiple orders
- Payment auto-match by reference number
- Xero sync status widget with Sync Now button

Audit status: **PASSED**

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Finance Role Phase
**Completion Promise:** ROLE_FINANCE_PHASE_COMPLETE
