---
title: "refactor: Technical Debt Standardization"
type: refactor
date: 2026-01-25
brainstorm: docs/brainstorms/2026-01-25-technical-debt-standardization-brainstorm.md
---

# Technical Debt Standardization Plan

## Overview

Systematic cleanup to bring all domains to the same quality bar as the financial domain. Three phases: Jobs hook consolidation (foundation), Approvals full stack (new feature), and Procurement analytics (new feature).

**Scope:**
- Jobs: 14 hook files → 5 logical groupings + validation refactor to Zod
- Approvals: Complete approval workflow with escalation, delegation, rule evaluation
- Procurement: Full analytics dashboard with all 4 metric types

**Reference patterns:**
- `src/hooks/financial/use-financial.ts` - Gold standard (30 hooks, 8 sections)
- `src/server/functions/suppliers/purchase-orders.ts` - Server function pattern (869 lines)
- `STANDARDS.md` - Authoritative patterns
- `_development/_audit/container-presenter-standardization/design-patterns.md` - Wiring patterns

---

## Phase 1: Jobs Hook Consolidation

**Goal:** Reduce 14 hook files to 5 logical groupings, following financial domain patterns.

### 1.1 Create New Hook Files

#### Task 1.1.1: Create `use-jobs.ts` (Core CRUD)

**File:** `src/hooks/jobs/use-jobs.ts`

**Move from:**
- `use-unified-job-data.ts`: `useUnifiedJobList`, `useUnifiedJob`
- `use-job-batch-operations.ts`: `useProcessJobBatchOperations`

**Structure:**
```typescript
/**
 * Jobs Core Hooks
 *
 * CRUD operations and batch processing for job management.
 *
 * @see src/server/functions/jobs/job-assignments.ts
 */

// ============================================================================
// JOB LIST HOOKS
// ============================================================================

export function useJobs(filters?: JobFilters) { ... }
export function useJob(jobId: string) { ... }

// ============================================================================
// JOB MUTATIONS
// ============================================================================

export function useCreateJob() { ... }
export function useUpdateJob() { ... }
export function useDeleteJob() { ... }

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export function useBatchJobOperations() { ... }
```

**Acceptance:**
- [x] File created with section dividers
- [x] All hooks use centralized `queryKeys.jobs.*`
- [x] Mutations invalidate both list and detail caches
- [x] JSDoc comments on each hook

---

#### Task 1.1.2: Create `use-job-scheduling.ts` (Calendar & Timeline)

**File:** `src/hooks/jobs/use-job-scheduling.ts`

**Consolidate from:**
- `use-job-calendar.ts` (entire file - 9 hooks)
- `use-job-calendar-oauth.ts` (entire file - 8 hooks)

**Structure:**
```typescript
/**
 * Job Scheduling Hooks
 *
 * Calendar views, timeline management, and OAuth calendar sync.
 *
 * @see src/server/functions/jobs/job-calendar.ts
 */

// ============================================================================
// CALENDAR VIEW HOOKS
// ============================================================================

export function useCalendarJobs(options) { ... }
export function useUnscheduledJobs(options) { ... }
export function useCalendarInstallers() { ... }

// ============================================================================
// TIMELINE VIEW HOOKS
// ============================================================================

export function useTimelineJobs(options) { ... }
export function useTimelineStats(options) { ... }
export function useJobsTimeline(options) { ... }

// ============================================================================
// KANBAN CALENDAR HOOKS
// ============================================================================

export function useCalendarTasksForKanban(options) { ... }
export function useJobCalendarKanban(options) { ... }

// ============================================================================
// SCHEDULING MUTATIONS
// ============================================================================

export function useRescheduleJob() { ... }

// ============================================================================
// OAUTH CALENDAR SYNC
// ============================================================================

export function useCalendarOAuthConnection(organizationId) { ... }
export function useAvailableCalendars(connectionId) { ... }
export function useSyncJobToCalendar() { ... }
export function useUpdateJobCalendarEvent() { ... }
export function useRemoveJobFromCalendar() { ... }
export function useCalendarOAuthStatus(organizationId) { ... }
export function useCalendarSyncStats(organizationId) { ... }
```

**Acceptance:**
- [x] All 17 hooks consolidated into single file
- [x] Section dividers for each concern
- [x] OAuth hooks grouped together
- [x] No breaking changes to exports

---

#### Task 1.1.3: Enhance `use-job-tasks.ts` (Tasks & Kanban)

**File:** `src/hooks/jobs/use-job-tasks.ts` (existing, enhance)

**Merge from:**
- `use-job-tasks-kanban.ts` (entire file)

**Add sections:**
```typescript
// ============================================================================
// KANBAN VIEW HOOKS (merged from use-job-tasks-kanban.ts)
// ============================================================================

export function useJobTasksKanban(jobId) { ... }
export function useUpdateJobTaskStatus() { ... }
export function useJobTaskKanbanConfig() { ... }
```

**Acceptance:**
- [x] Kanban hooks merged into existing file
- [x] Section divider added for kanban section
- [x] use-job-tasks-kanban.ts deleted

---

#### Task 1.1.4: Create `use-job-resources.ts` (Materials, Time, Costing)

**File:** `src/hooks/jobs/use-job-resources.ts`

**Consolidate from:**
- `use-job-materials.ts` (entire file)
- `use-job-time.ts` (entire file)
- `use-job-costing.ts` (entire file)

**Structure:**
```typescript
/**
 * Job Resources Hooks
 *
 * Materials, time tracking, and cost analysis for jobs.
 *
 * @see src/server/functions/jobs/job-materials.ts
 * @see src/server/functions/jobs/job-time.ts
 */

// ============================================================================
// MATERIALS HOOKS
// ============================================================================

export function useJobMaterials(jobId) { ... }
export function useJobMaterial(materialId) { ... }
export function useJobMaterialCost(jobId) { ... }
export function useAddJobMaterial() { ... }
export function useUpdateJobMaterial() { ... }
export function useRemoveJobMaterial() { ... }
export function useReserveJobStock() { ... }

// ============================================================================
// TIME TRACKING HOOKS
// ============================================================================

export function useJobTimeEntries(jobId) { ... }
export function useTimeEntry(entryId) { ... }
export function useJobLaborCost(jobId) { ... }
export function useStartTimer() { ... }
export function useStopTimer() { ... }
export function useCreateManualEntry() { ... }
export function useUpdateTimeEntry() { ... }
export function useDeleteTimeEntry() { ... }

// ============================================================================
// COSTING ANALYSIS HOOKS
// ============================================================================

export function useJobCost(jobId) { ... }
export function useJobProfitability(jobId) { ... }
export function useJobCostingReport(jobId) { ... }
```

**Acceptance:**
- [x] All 18 hooks consolidated
- [x] Three clear sections (materials, time, costing)
- [x] Original files deleted

---

#### Task 1.1.5: Create `use-job-templates-config.ts` (Templates & Checklists)

**File:** `src/hooks/jobs/use-job-templates-config.ts`

**Consolidate from:**
- `use-job-templates.ts` (entire file)
- `use-checklists.ts` (entire file)

**Structure:**
```typescript
/**
 * Job Templates & Configuration Hooks
 *
 * Job templates, checklist templates, and configuration management.
 *
 * @see src/server/functions/jobs/job-templates.ts
 * @see src/server/functions/jobs/checklists.ts
 */

// ============================================================================
// JOB TEMPLATE HOOKS
// ============================================================================

export function useJobTemplates() { ... }
export function useJobTemplate(templateId) { ... }
export function useCreateJobTemplate() { ... }
export function useUpdateJobTemplate() { ... }
export function useDeleteJobTemplate() { ... }
export function useCreateJobFromTemplate() { ... }
export function useExportCalendarData() { ... }

// ============================================================================
// CHECKLIST TEMPLATE HOOKS
// ============================================================================

export function useChecklistTemplates() { ... }
export function useChecklistTemplate(templateId) { ... }
export function useCreateChecklistTemplate() { ... }
export function useUpdateChecklistTemplate() { ... }
export function useDeleteChecklistTemplate() { ... }

// ============================================================================
// CHECKLIST APPLICATION HOOKS
// ============================================================================

export function useJobChecklist(jobId) { ... }
export function useChecklistItem(itemId) { ... }
export function useApplyChecklistToJob() { ... }
export function useUpdateChecklistItem() { ... }
```

**Acceptance:**
- [x] All 16 hooks consolidated
- [x] Three sections (job templates, checklist templates, application)
- [x] Original files deleted

---

### 1.2 Refactor Validation to Zod

#### Task 1.2.1: Create Zod validation schemas

**File:** `src/lib/schemas/jobs/job-validation.ts`

**Move from:** `src/hooks/jobs/use-job-data-validation.ts`

**Convert useState validation to Zod:**
```typescript
/**
 * Job Validation Schemas
 *
 * Zod schemas for job form validation.
 *
 * @see src/routes/_authenticated/jobs/
 */

import { z } from 'zod';

// ============================================================================
// CONTACT VALIDATION
// ============================================================================

export const jobContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format').optional(),
  email: z.string().email('Invalid email').optional(),
});

export type JobContact = z.infer<typeof jobContactSchema>;

// ============================================================================
// JOB FORM VALIDATION
// ============================================================================

export const jobFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledDate: z.coerce.date().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  contacts: z.array(jobContactSchema).optional(),
});

export type JobFormInput = z.infer<typeof jobFormSchema>;
```

**Acceptance:**
- [ ] All validation logic converted to Zod schemas
- [ ] Types exported with schemas
- [ ] Added to `src/lib/schemas/jobs/index.ts` barrel
- [ ] `use-job-data-validation.ts` deleted

---

### 1.3 Update Barrel Exports

#### Task 1.3.1: Update `src/hooks/jobs/index.ts`

**New structure:**
```typescript
/**
 * Jobs Hooks
 *
 * Provides hooks for job management, scheduling, tasks, resources, and templates.
 */

// Core job management
export * from './use-jobs';

// Scheduling and calendar
export * from './use-job-scheduling';

// Tasks and kanban
export * from './use-job-tasks';

// Resources: materials, time, costing
export * from './use-job-resources';

// Templates and checklists
export * from './use-job-templates-config';

// View sync utilities
export * from './use-jobs-view-sync';

// Unified data layer (simplified)
export { useUnifiedRealtimeSync, useOptimizedJobData } from './use-unified-job-data';

// Re-export types
export type { JobFilters } from '@/lib/query-keys';
```

**Acceptance:**
- [ ] All new files exported
- [ ] Section comments for each group
- [ ] Type re-exports included
- [ ] No breaking changes to public API

---

### 1.4 Cleanup Old Files

#### Task 1.4.1: Delete consolidated files

**Files to delete after verification:**
- [ ] `src/hooks/jobs/use-job-calendar.ts`
- [ ] `src/hooks/jobs/use-job-calendar-oauth.ts`
- [ ] `src/hooks/jobs/use-job-tasks-kanban.ts`
- [ ] `src/hooks/jobs/use-job-materials.ts`
- [ ] `src/hooks/jobs/use-job-time.ts`
- [ ] `src/hooks/jobs/use-job-costing.ts`
- [ ] `src/hooks/jobs/use-job-templates.ts`
- [ ] `src/hooks/jobs/use-checklists.ts`
- [ ] `src/hooks/jobs/use-job-data-validation.ts`
- [ ] `src/hooks/jobs/use-job-batch-operations.ts`

**Verification before delete:**
- [ ] `npm run typecheck` passes
- [ ] All imports updated to new files
- [ ] No grep results for old file imports

---

### Phase 1 Success Criteria

- [ ] 5 consolidated hook files (down from 14)
- [ ] All hooks use centralized query keys
- [ ] Validation moved to Zod schemas
- [ ] `npm run typecheck` passes
- [ ] No breaking changes to existing imports

---

## Phase 2: Approvals Full Stack

**Goal:** Complete approval workflow with escalation, delegation, and rule evaluation.

### 2.1 Create Approvals Server Functions

#### Task 2.1.1: Create `src/server/functions/suppliers/approvals.ts`

**Structure:**
```typescript
/**
 * Approval Workflow Server Functions
 *
 * Multi-level approval workflow for purchase orders with:
 * - Rule-based approval routing
 * - Escalation (automatic + manual)
 * - Delegation (approve on behalf of)
 *
 * @see drizzle/schema/suppliers/purchase-order-approvals.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPendingApprovalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'escalated']).optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

const approveRejectSchema = z.object({
  approvalId: z.string().uuid(),
  comments: z.string().optional(),
});

const escalateSchema = z.object({
  approvalId: z.string().uuid(),
  escalateTo: z.string().uuid(),
  reason: z.string(),
});

const delegateSchema = z.object({
  approvalId: z.string().uuid(),
  delegateTo: z.string().uuid(),
});

// ============================================================================
// LIST & QUERY FUNCTIONS
// ============================================================================

export const listPendingApprovals = createServerFn({ method: 'GET' })
  .inputValidator(listPendingApprovalsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE_PURCHASE_ORDER });
    // Query approvals where approverId = ctx.userId OR escalatedTo = ctx.userId
  });

export const getApprovalDetails = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ approvalId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Get approval with PO details, history, rule info
  });

export const getApprovalHistory = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Get all approvals for a PO with timestamps
  });

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

export const approvePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(approveRejectSchema)
  .handler(async ({ data }) => {
    // 1. Verify user is authorized approver
    // 2. Update approval record (status, approvedAt)
    // 3. Check if more levels required
    // 4. If final level, update PO status to 'approved'
  });

export const rejectPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(approveRejectSchema)
  .handler(async ({ data }) => {
    // 1. Update approval record (status, rejectedAt, comments)
    // 2. Update PO status back to 'draft'
  });

// ============================================================================
// ESCALATION
// ============================================================================

export const escalateApproval = createServerFn({ method: 'POST' })
  .inputValidator(escalateSchema)
  .handler(async ({ data }) => {
    // 1. Update approval (status='escalated', escalatedTo, escalatedAt, escalationReason)
    // 2. Create notification for escalation recipient
  });

export const autoEscalateOverdue = createServerFn({ method: 'POST' })
  .handler(async () => {
    // Called by Trigger.dev job
    // Find approvals past dueAt, escalate based on rules
  });

// ============================================================================
// DELEGATION
// ============================================================================

export const delegateApproval = createServerFn({ method: 'POST' })
  .inputValidator(delegateSchema)
  .handler(async ({ data }) => {
    // 1. Update approval (delegatedFrom = current user)
    // 2. Set new approverId to delegateTo
  });

// ============================================================================
// RULE EVALUATION
// ============================================================================

export const evaluateApprovalRules = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // 1. Get PO total amount
    // 2. Find matching rules by amount range
    // 3. Create approval records for each required level
    // Returns: { requiredLevels, approvers[] }
  });
```

**Acceptance:**
- [x] 10 server functions created
- [x] All use Zod validation
- [x] Permission checks on all operations
- [x] Multi-level approval logic implemented
- [x] Escalation with automatic and manual triggers
- [x] Delegation with delegatedFrom tracking

---

### 2.2 Create Approvals Schemas

#### Task 2.2.1: Create `src/lib/schemas/suppliers/approvals.ts`

```typescript
/**
 * Approval Workflow Schemas
 *
 * Validation schemas for approval operations.
 */

import { z } from 'zod';

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const approvalFilterSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'escalated']).optional(),
  type: z.enum(['purchase_order', 'expense', 'budget']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  search: z.string().optional(),
});

export const listApprovalsQuerySchema = z.object({
  ...approvalFilterSchema.shape,
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const approvalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

export const escalationSchema = z.object({
  approvalId: z.string().uuid(),
  escalateTo: z.string().uuid(),
  reason: z.string().min(1, 'Escalation reason required'),
});

export const delegationSchema = z.object({
  approvalId: z.string().uuid(),
  delegateTo: z.string().uuid(),
  expiresAt: z.coerce.date().optional(),
});

export const bulkApprovalSchema = z.object({
  approvalIds: z.array(z.string().uuid()).min(1),
  decision: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export type ApprovalFilter = z.infer<typeof approvalFilterSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type Escalation = z.infer<typeof escalationSchema>;
export type Delegation = z.infer<typeof delegationSchema>;
export type BulkApproval = z.infer<typeof bulkApprovalSchema>;
```

**Acceptance:**
- [x] All schemas created with JSDoc (already existed in src/lib/schemas/approvals/)
- [x] Types exported
- [x] Added to `src/lib/schemas/approvals/index.ts`

---

### 2.3 Create Approvals Hooks

#### Task 2.3.1: Create `src/hooks/suppliers/use-approvals.ts`

```typescript
/**
 * Approval Workflow Hooks
 *
 * TanStack Query hooks for approval management.
 *
 * @see src/server/functions/suppliers/approvals.ts
 */

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function usePendingApprovals(options?: UsePendingApprovalsOptions) { ... }
export function useApprovalDetails(approvalId: string) { ... }
export function useApprovalHistory(purchaseOrderId: string) { ... }
export function useMyApprovalStats() { ... }

// ============================================================================
// DECISION MUTATIONS
// ============================================================================

export function useApproveItem() { ... }
export function useRejectItem() { ... }
export function useBulkApprove() { ... }
export function useBulkReject() { ... }

// ============================================================================
// ESCALATION MUTATIONS
// ============================================================================

export function useEscalateApproval() { ... }

// ============================================================================
// DELEGATION MUTATIONS
// ============================================================================

export function useDelegateApproval() { ... }
export function useRevokeDelegation() { ... }
```

**Acceptance:**
- [x] 12 hooks created (4 query + 8 mutation hooks)
- [x] All use `queryKeys.approvals.*`
- [x] Proper cache invalidation on mutations
- [x] Options interfaces follow `UseXxxOptions` pattern

---

### 2.4 Add Query Keys

#### Task 2.4.1: Add approvals query keys to `src/lib/query-keys.ts`

```typescript
approvals: {
  all: ['approvals'] as const,
  lists: () => [...queryKeys.approvals.all, 'list'] as const,
  list: (filters?: ApprovalFilter) =>
    [...queryKeys.approvals.lists(), filters ?? {}] as const,
  pending: () => [...queryKeys.approvals.all, 'pending'] as const,
  details: () => [...queryKeys.approvals.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.approvals.details(), id] as const,
  history: (poId: string) => [...queryKeys.approvals.all, 'history', poId] as const,
  stats: () => [...queryKeys.approvals.all, 'stats'] as const,
},
```

---

### 2.5 Wire Route to Real Data

#### Task 2.5.1: Update `src/routes/_authenticated/approvals/index.tsx`

**Changes:**
- [x] Remove mock data
- [x] Import hooks from `@/hooks/suppliers`
- [x] Use `usePendingApprovals()` for data
- [x] Wire handlers to mutations
- [x] Add loading/error states

---

### Phase 2 Success Criteria

- [x] All 10 server functions implemented
- [x] All 12 hooks created (4 query + 8 mutation)
- [x] Route displays real data
- [x] Approve/Reject workflow functional
- [x] Escalation workflow functional
- [x] Delegation workflow functional
- [x] Rule evaluation creates approval records

**Commit:** `8d2da19 - feat(approvals): implement approval workflow server functions and hooks`

---

## Phase 3: Procurement Analytics

**Goal:** Full analytics dashboard with all 4 metric types.

### 3.1 Create Analytics Server Function

#### Task 3.1.1: Create `src/server/functions/suppliers/procurement-analytics.ts`

```typescript
/**
 * Procurement Analytics Server Functions
 *
 * Aggregated analytics for procurement dashboard.
 */

// ============================================================================
// SPEND METRICS
// ============================================================================

export const getSpendMetrics = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    // Aggregate: total spend, vs budget, vs last period, by category
  });

// ============================================================================
// ORDER METRICS
// ============================================================================

export const getOrderMetrics = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    // Aggregate: PO counts by status, avg processing time, fulfillment rate
  });

// ============================================================================
// SUPPLIER METRICS
// ============================================================================

export const getSupplierMetrics = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    // Aggregate: top suppliers, performance scores, on-time delivery
  });

// ============================================================================
// ALERTS
// ============================================================================

export const getProcurementAlerts = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Query: overdue POs, budget warnings, pending approvals count
  });

// ============================================================================
// COMBINED DASHBOARD
// ============================================================================

export const getProcurementDashboard = createServerFn({ method: 'GET' })
  .inputValidator(dateRangeSchema)
  .handler(async ({ data }) => {
    // Parallel fetch all metrics + alerts
  });
```

---

### 3.2 Create Analytics Hooks

#### Task 3.2.1: Create `src/hooks/suppliers/use-procurement-analytics.ts`

```typescript
/**
 * Procurement Analytics Hooks
 */

export function useSpendMetrics(dateRange?: DateRange) { ... }
export function useOrderMetrics(dateRange?: DateRange) { ... }
export function useSupplierMetrics(dateRange?: DateRange) { ... }
export function useProcurementAlerts() { ... }
export function useProcurementDashboard(dateRange?: DateRange) { ... }
```

---

### 3.3 Wire Dashboard Route

#### Task 3.3.1: Update `src/routes/_authenticated/reports/procurement/index.tsx`

- [x] Remove mock data
- [x] Import `useProcurementDashboard` from hooks
- [x] Wire to presenter components
- [x] Add date range picker integration

---

### Phase 3 Success Criteria

- [x] 5 server functions implemented
- [x] 5 hooks created
- [x] Dashboard shows real spend metrics
- [x] Dashboard shows real order metrics
- [x] Dashboard shows real supplier metrics
- [x] Alerts display real data
- [x] Date range filtering works

**Completed:** 2026-01-25

**Files Created:**
- `src/server/functions/suppliers/procurement-analytics.ts` - 5 server functions
- `src/hooks/suppliers/use-procurement-analytics.ts` - 5 hooks

**Files Modified:**
- `src/lib/query-keys.ts` - Added procurement section
- `src/hooks/suppliers/index.ts` - Added procurement exports
- `src/server/functions/suppliers/index.ts` - Added procurement-analytics export
- `src/routes/_authenticated/reports/procurement/index.tsx` - Wired to real hooks

---

## Dependencies & Risks

### Dependencies

| Dependency | Phase | Notes |
|------------|-------|-------|
| Schema exists | 2, 3 | Approvals and PO schemas already exist |
| Query keys | 1, 2, 3 | Need to add new keys for approvals |
| Permission constants | 2 | May need new `PERMISSIONS.APPROVALS.*` |

### Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing imports | Maintain re-exports from old paths temporarily |
| Merge conflicts | Work on separate branches per phase |
| Performance of analytics queries | Add indexes, consider materialized views |

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Jobs hook files | 14 | 5 |
| useState validation hooks | 1 | 0 (moved to Zod) |
| Approvals with mock data | Yes | No |
| Procurement with mock data | Yes | No |
| TypeScript errors | 0 | 0 |

---

## References

### Internal References
- `src/hooks/financial/use-financial.ts` - Gold standard pattern
- `src/server/functions/suppliers/purchase-orders.ts` - Server function pattern
- `STANDARDS.md` - Authoritative coding standards
- `design-patterns.md` - Container/presenter patterns
- `docs/solutions/architecture/container-presenter-standardization.md` - Learnings

### Related Work
- `docs/brainstorms/2026-01-25-technical-debt-standardization-brainstorm.md` - Brainstorm decisions
- `docs/plans/2026-01-25-feat-ui-ux-route-standardization-phase2-plan.md` - Related standardization
