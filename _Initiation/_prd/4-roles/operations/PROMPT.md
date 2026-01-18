# Ralph Loop: Operations Role Optimization

## Objective
Build the Operations/Warehouse role experience optimized for warehouse and fulfillment workflows. Enable operations teams to manage picking, receiving, inventory tracking, shipping coordination, and barcode scanning with real-time stock visibility.

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
If progress.txt doesn't exist, start with ROLE-OPS-001.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/4-roles/operations.prd.json` - Operations role optimization stories

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
- **Tables**: TanStack Table (for order/inventory lists)
- **Mobile**: Responsive design for warehouse devices and tablets
- **Integrations**: Barcode scanning APIs

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

### Phase: Operations/Warehouse Role (ROLE-OPS)
Execute stories in priority order from operations.prd.json:

1. ROLE-OPS-001: Warehouse Dashboard
2. ROLE-OPS-002: Streamlined Picking Workflow
3. ROLE-OPS-003: Batch Picking for Multiple Orders
4. ROLE-OPS-004: Low-Stock Alert System
5. ROLE-OPS-005: Quick Receiving Flow Enhancements
6. ROLE-OPS-006: Shipment Coordination View
7. ROLE-OPS-007: Real-time Stock on Order Screen
8. ROLE-OPS-008a: Mobile Responsive Layouts
9. ROLE-OPS-008b: Barcode Scanning Integration
10. ROLE-OPS-008c: Offline Support

## Completion

When ALL operations stories pass:
```xml
<promise>ROLE_OPS_PHASE_COMPLETE</promise>
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
- Design for warehouse workflows (fast, simple, offline-ready)
- Optimize for barcode scanning integration
- Ensure real-time inventory updates
- Handle batch operations efficiently

### DO NOT
- Modify files outside operations scope
- Skip acceptance criteria
- Design for desktop-only experience
- Implement slow or data-heavy interfaces
- Create components that require complex gestures
- Implement features for other roles
- Forget to handle offline scenarios in warehouse
- Create layouts that don't work on tablets and mobile

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── operations/             # Operations-specific routes
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── picking/
│   │   │   │   ├── receiving.tsx
│   │   │   │   ├── inventory.tsx
│   │   │   │   ├── shipments.tsx
│   │   │   │   └── scanning.tsx
│   ├── components/
│   │   ├── operations/                 # Operations-specific components
│   │   │   ├── WarehouseDashboard.tsx
│   │   │   ├── PickingWorkflow.tsx
│   │   │   ├── BatchPicking.tsx
│   │   │   ├── LowStockAlert.tsx
│   │   │   ├── BarcodeScanner.tsx
│   │   │   ├── ShipmentCoordinator.tsx
│   │   │   └── ...
│   │   └── shared/
│   └── lib/
│       ├── operations/                 # Operations business logic
│       ├── barcode/                    # Barcode scanning utilities
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
  - Barcode scanning integration → Verify scanner device compatibility
  - Real-time updates → Check Supabase real-time subscriptions
  - Batch operation performance → Optimize queries for large order counts
  - Mobile responsiveness → Ensure all workflows work on tablets
  - Offline support → Verify service worker and sync logic

## Progress Template

```markdown
# Operations Role Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ROLE-OPS-001: Warehouse Dashboard
- [ ] ROLE-OPS-002: Streamlined Picking Workflow
- [ ] ROLE-OPS-003: Batch Picking for Multiple Orders
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
- **Swipe Right** - Mark item picked / Quick receive
- **Swipe Left** - Report shortage
- **Scan Barcode** - Auto-advance after 2s confirmation
- **Pull Down** - Refresh (mobile)

Key UX patterns:
- Warehouse dashboard is default landing page (1 click to see orders to pick)
- Low stock alerts with one-click PO creation
- Start Picking / Receive Goods quick actions
- Batch picking with consolidated list
- 44px+ touch targets for tablet/mobile warehouse use

Audit status: **PASSED**

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Operations/Warehouse Role Phase
**Completion Promise:** ROLE_OPS_PHASE_COMPLETE
