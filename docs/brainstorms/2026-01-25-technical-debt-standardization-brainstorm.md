---
date: 2026-01-25
topic: technical-debt-standardization
---

# Technical Debt & Standardization Brainstorm

## What We're Building

A systematic cleanup of the codebase to bring all domains to the same quality bar as the financial domain (the gold standard). This includes:

1. **Jobs domain hook consolidation** - 13 files → 5 logical groupings
2. **Approvals full stack** - Complete approval workflow with escalation/delegation
3. **Procurement analytics** - Full dashboard with all metric types
4. **Validation refactor** - Move useState validation to Zod schemas

## Why This Approach

**Consistency first** was chosen over feature completeness or highest-impact-first because:
- Establishes clear patterns for future development
- Reduces cognitive load when working across domains
- Makes onboarding easier (one pattern to learn)
- Financial domain proves the pattern works at scale

**Foundation first sequencing** (Jobs → Approvals → Procurement) because:
- Jobs consolidation is pure refactor with no dependencies
- Establishes the organizational pattern before building new features
- Approvals and Procurement can then follow the established pattern

## Key Decisions

### 1. Jobs Hook Consolidation

**Decision**: Split by concern into 5 files (not single mega-file)

| New File | Consolidates From |
|----------|-------------------|
| `use-jobs.ts` | Core CRUD, batch ops from unified-job-data |
| `use-job-scheduling.ts` | use-job-calendar.ts, use-job-calendar-oauth.ts |
| `use-job-tasks.ts` | use-job-tasks.ts + use-job-tasks-kanban.ts |
| `use-job-resources.ts` | use-job-materials.ts, use-job-time.ts, use-job-costing.ts |
| `use-job-templates-config.ts` | use-job-templates.ts, use-checklists.ts |

**Keep**: `use-jobs-view-sync.ts` (small utility, single concern)

**Delete/Refactor**: `use-job-data-validation.ts` → move to `src/lib/schemas/jobs/job-validation.ts` as Zod schemas

**Rationale**: Logical groupings make it easier to find related hooks while keeping files manageable (~100-150 lines each vs 500+ in single file).

### 2. Approvals: Full Workflow

**Decision**: Implement complete approval system, not MVP

**Scope includes**:
- List pending approvals (by approver, by status)
- Approve/Reject with multi-level workflow
- Escalation (automatic based on rules, manual trigger)
- Delegation (approve on behalf of)
- Rule evaluation (match PO amount to approval rules)

**Implementation stack**:
```
drizzle/schema/suppliers/purchase-order-approvals.ts  ✅ EXISTS
src/server/functions/suppliers/approvals.ts           ❌ CREATE
src/hooks/suppliers/use-approvals.ts                  ❌ CREATE
src/routes/_authenticated/approvals/index.tsx         ⚠️ WIRE TO REAL DATA
```

**Rationale**: Schema already supports full workflow. Building MVP would leave dead schema fields and require revisiting later.

### 3. Procurement: All Metrics

**Decision**: Full dashboard with all 4 metric types

| Metric Type | Description |
|-------------|-------------|
| SpendMetrics | Total spend, vs budget, vs last period |
| OrderMetrics | PO counts by status, avg processing time |
| SupplierMetrics | Top suppliers, performance scores |
| Alerts | Overdue POs, budget warnings, pending approvals |

**Implementation stack**:
```
src/server/functions/suppliers/procurement-analytics.ts  ❌ CREATE
src/hooks/suppliers/use-procurement-analytics.ts         ❌ CREATE
src/routes/_authenticated/reports/procurement/index.tsx  ⚠️ WIRE TO REAL DATA
```

**Rationale**: Components already exist expecting this data. Mock data just needs to be replaced with real queries.

### 4. Validation Refactor

**Decision**: Move `use-job-data-validation.ts` to Zod schemas

**Current** (violates STANDARDS.md):
```typescript
// use-job-data-validation.ts - uses useState, not TanStack Query
export function useJobDataValidation() {
  const [errors, setErrors] = useState({});
  // validation logic with useState
}
```

**Target** (follows STANDARDS.md):
```typescript
// src/lib/schemas/jobs/job-validation.ts
import { z } from 'zod';

export const jobFormSchema = z.object({
  // validation rules as Zod schema
});

export const contactValidationSchema = z.object({
  // contact validation rules
});
```

**Rationale**: STANDARDS.md requires Zod for validation. useState hooks for validation break the architecture pattern.

## Sequencing

```
Phase 1: Jobs Consolidation (Foundation)
├── Consolidate 13 → 5 hook files
├── Refactor validation to Zod
├── Update index.ts exports
└── Verify no breaking changes

Phase 2: Approvals Full Stack
├── Create server functions (8-10 functions)
├── Create hooks (use-approvals.ts)
├── Wire route to real data
└── Test full workflow

Phase 3: Procurement Analytics
├── Create analytics server function
├── Create hooks
├── Wire dashboard to real data
└── Verify all 4 metric types work
```

## Open Questions

None - all decisions made.

## Success Criteria

- [ ] Jobs domain: 5 hook files, all exports working, no TypeScript errors
- [ ] Approvals: Full workflow functional (list, approve, reject, escalate, delegate)
- [ ] Procurement: Dashboard shows real data for all 4 metric types
- [ ] Validation: No useState-based validation hooks remain
- [ ] All routes using centralized hooks (no direct useQuery in routes)

## References

- STANDARDS.md - Authoritative patterns for the codebase
- design-patterns.md - Container/presenter and wiring patterns
- src/hooks/financial/use-financial.ts - Gold standard hook organization
- docs/plans/2026-01-25-feat-ui-ux-route-standardization-phase2-plan.md - Related standardization work

## Next Steps

→ `/workflows:plan` to create detailed implementation plan with file-by-file tasks
