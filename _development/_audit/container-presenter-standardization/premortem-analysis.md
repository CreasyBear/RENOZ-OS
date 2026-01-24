# Pre-Mortem: Container/Presenter Refactoring

**Date:** 2026-01-23
**Mode:** Deep
**Context:** Applying container/presenter patterns to 5 remaining domains (Financial, Communications, Dashboard, Settings, Reports)

---

## Potential Risks (Pass 1: Initial Scan)

From analyzing the breakdown documents and design patterns:

1. **Financial-dashboard.tsx**: 4 parallel queries - prop explosion risk
2. **Communications**: No routes exist - need to create routing structure first
3. **Complex mutations**: Many components have 3-4 mutations each
4. **Template-editor hook**: Custom hook with business logic - unclear if should refactor
5. **Missing route files**: Several Financial components reference non-existent routes
6. **Cache invalidation complexity**: Multiple queryClient.invalidateQueries patterns
7. **Parallel query timing**: Financial-dashboard needs all 4 queries - loading state complexity
8. **Dialog vs. Route decision**: Communications has dialogs that may not need routes

---

## Verified Risks (Pass 2: After Analysis)

### TIGERS 🐯

#### 1. [HIGH] Parallel Query Prop Explosion
**Location:** Financial-dashboard.tsx (4 queries), Campaign-detail-panel.tsx (2 queries)
**Severity:** HIGH
**Category:** Implementation complexity

**Risk:** Components with multiple parallel queries will have very large prop interfaces.

**Evidence:**
```typescript
// financial-dashboard.tsx has 4 parallel queries:
const { data: metrics, isLoading: metricsLoading } = useQuery(...)
const { data: revenueData, isLoading: revenueLoading } = useQuery(...)
const { data: topCustomers, isLoading: customersLoading } = useQuery(...)
const { data: outstanding, isLoading: outstandingLoading } = useQuery(...)

// This creates a prop interface with:
// - 4 data props
// - 4 individual loading states OR 1 combined loading state
// - Potential for 4 error states
```

**Mitigation Checked:** Pattern documentation shows individual loading states but doesn't address how to combine them elegantly for components needing ALL data before rendering.

**Suggested Fix:**
```typescript
// Option 1: Combine loading states in container
const isLoading = metricsLoading || revenueLoading || customersLoading || outstandingLoading;

// Option 2: Create aggregate prop
interface FinancialDashboardProps {
  /** @source Multiple useQuery calls aggregated */
  dashboardData: {
    metrics?: DashboardMetrics;
    revenue?: RevenueData;
    topCustomers?: Customer[];
    outstanding?: Invoice[];
  };
  /** @source Combined loading state from all queries */
  isLoading: boolean;
}
```

**Recommendation:** Add pattern to documentation for handling parallel queries with aggregate data prop pattern.

---

#### 2. [HIGH] Communications Domain Routing Missing
**Location:** All 17 Communications presenters
**Severity:** HIGH
**Category:** Architectural prerequisite

**Risk:** Cannot refactor Communications presenters without first creating route structure. This is a TWO-PHASE refactoring, not just hook migration.

**Evidence:** From audit:
```
### Communications
- Route (container):
  - No dedicated communications routes found yet.
- Presenter: (17 components listed)
```

**Mitigation Checked:** Breakdown document mentions this but doesn't provide clear decision criteria for:
1. Which dialogs should become routes vs stay as dialogs
2. Tab-based vs separate routes architecture
3. Order of operations (routes first vs incremental)

**Suggested Fix:**
1. User decision required: Tab-based (`/communications` with tabs) vs separate routes (`/communications/campaigns`, `/communications/emails`, etc.)
2. Must create ALL routes before ANY hook migration
3. Document dialog vs route criteria:
   - **Route**: Needs deep-linking, browser back/forward
   - **Dialog**: Modal action within current context

**Recommendation:** BLOCK Communications refactoring until routing decision made and routes created.

---

#### 3. [MEDIUM] Missing Route Files for Financial Components
**Location:** payment-plans-list.tsx, credit-notes-list.tsx, customer-statements.tsx
**Severity:** MEDIUM
**Category:** Implementation gap

**Risk:** Breakdown assumes routes exist but they may not.

**Evidence:** From breakdown:
```markdown
### May Need to Create ❓
- `src/routes/_authenticated/financial/payment-plans.tsx`
- `src/routes/_authenticated/financial/credit-notes.tsx`
- `src/routes/_authenticated/financial/statements.tsx`
```

**Mitigation Checked:** Need to verify which routes actually exist before starting refactoring.

**Suggested Fix:**
```bash
# Before starting Financial refactoring, verify:
ls src/routes/_authenticated/financial/*.tsx

# Create missing routes using Orders/Inventory pattern
```

**Recommendation:** Add route verification step to Financial refactoring workflow.

---

#### 4. [MEDIUM] Custom Hook with Business Logic
**Location:** template-editor/hooks/use-template-editor.ts
**Severity:** MEDIUM
**Category:** Pattern ambiguity

**Risk:** Pattern documentation says "NO hooks in presenters" but doesn't clarify custom hooks with business logic that aren't just data fetching.

**Evidence:** From Communications breakdown:
```typescript
// This is a custom hook with business logic, not just a wrapper
// file: template-editor/hooks/use-template-editor.ts
```

**Mitigation Checked:** Pattern documentation Rule says "NEVER in Presenters: useQuery, useMutation, useServerFn, useQueryClient" but doesn't address:
- Custom hooks that encapsulate complex state machines
- Hooks that have business logic beyond data fetching
- When to extract to container vs keep as reusable hook

**Suggested Fix:** Add clarification to design-patterns.md:

```markdown
### Custom Hooks Decision Tree

**Keep as Hook (Reusable Logic):**
- Form state management (useFormController)
- Multi-step wizards (useWizardState)
- Complex UI state machines
- Reusable business logic used across domains

**Move to Container (Data Fetching):**
- Wrappers around useQuery/useMutation
- Server function calls
- Cache invalidation logic
- Domain-specific data transformations

**Example:**
```typescript
// KEEP as hook - reusable state machine
export function useTemplateEditor() {
  const [mode, setMode] = useState<'edit'|'preview'>('edit');
  const [isDirty, setIsDirty] = useState(false);
  // ... state logic
}

// MOVE to container - data fetching
export function useTemplates() {
  return useQuery({ queryKey: ['templates'], queryFn: listTemplates });
}
```

**Recommendation:** Review use-template-editor.ts - if it's purely state management, it can stay as a hook. If it has useQuery/useMutation, those parts move to container.

---

### ELEPHANTS 🐘

#### 1. [MEDIUM] Inconsistent Cache Invalidation Patterns
**Severity:** MEDIUM
**Category:** Code consistency

**Elephant:** Different domains use different cache invalidation patterns. Some use specific keys, some use partial matching, some invalidate too broadly.

**Evidence:** From pattern analysis:
```typescript
// Pattern 1: Broad invalidation
queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

// Pattern 2: Specific invalidation
queryClient.invalidateQueries({ queryKey: queryKeys.orders.list({ status: 'pending' }) });

// Pattern 3: Multiple invalidations
queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
```

**Why it matters:** During refactoring, developers/agents will copy-paste patterns. If the patterns are inconsistent, we'll perpetuate the inconsistency.

**Suggested Fix:**
1. Document WHEN to use each pattern in design-patterns.md
2. Add examples for common scenarios:
   - Create/Update: Invalidate lists + specific detail
   - Delete: Invalidate lists only
   - Bulk operations: Invalidate all related queries

---

#### 2. [MEDIUM] No Guidance on Handler Naming Conventions
**Severity:** MEDIUM
**Category:** Code consistency

**Elephant:** Different files use different handler naming patterns:
- `handleViewOrder` vs `onViewOrder` vs `viewOrder`
- When to use `handle` prefix?
- When to use `on` prefix?

**Evidence:** From Orders route:
```typescript
const handleViewOrder = useCallback(...)
const handleDuplicateOrder = useCallback(...)
const handleDeleteOrder = useCallback(...)

// But passed as:
onViewOrder={handleViewOrder}
onDuplicateOrder={handleDuplicateOrder}
```

**Why it matters:** Consistency makes code easier to read and refactor.

**Suggested Fix:** Add naming convention to design-patterns.md:

```markdown
### Handler Naming Convention

**In Container (Route):**
- Use `handle` prefix: `handleCreate`, `handleUpdate`, `handleDelete`
- These are **definitions** of what to do

**In Props Interface:**
- Use `on` prefix: `onCreate`, `onUpdate`, `onDelete`
- These are **callbacks** passed to presenters

**Example:**
```typescript
// Container
const handleDelete = useCallback((id: string) => {
  deleteMutation.mutate(id);
}, [deleteMutation]);

// Presenter Props
interface Props {
  /** @source handleDelete in /orders/index.tsx */
  onDelete: (id: string) => void;
}
```

---

### PAPER TIGERS 🧾

#### 1. Large Number of Components to Refactor (17 in Communications)
**Reason:** While it looks daunting, these follow the same pattern. Once we establish the pattern for 2-3 components, the rest are mechanical.

**Evidence:** We've already successfully refactored 7 domains (Customers, Pipeline, Orders, Products, Jobs, Support, Warranty) with similar numbers of components.

**Mitigation Found:** Tiered approach in Communications breakdown (Tier 1 → Tier 2 → Tier 3) breaks it into manageable chunks.

---

#### 2. TypeScript Errors During Refactoring
**Reason:** This is expected and resolvable. TypeScript helps us catch issues early.

**Evidence:** Pattern includes verification checklist with "No TypeScript errors" as final step. Errors are expected during refactoring and guide the fix process.

**Mitigation Found:** Incremental approach (move hooks → add props → verify) catches errors at each step.

---

### FALSE ALARMS ❌

#### 1. ~~Need to update all references to moved presenters~~
**Initial Concern:** If we move props around, we'll break all imports.

**Verification:** Presenters stay in same location (`src/components/domain/`). Only the **containers** (routes) change. No import paths change.

---

#### 2. ~~Parallel mutations causing race conditions~~
**Initial Concern:** Components with multiple mutations might have race conditions.

**Verification:** React Query handles mutation queuing automatically. Pattern documentation shows proper `onSuccess` with invalidation - this serializes updates correctly.

---

## Risk Summary by Domain

| Domain | Tigers | Elephants | Blocking? | Recommendation |
|--------|--------|-----------|-----------|----------------|
| **Financial** | 1 (route verification) | 0 | No | Start with ar-aging-report, verify routes exist |
| **Communications** | 1 (routing missing) | 0 | **YES** | BLOCK until routing decided + created |
| **Suppliers** | 0 | 0 | No | Safe to proceed (only 1 component) |
| **Dashboard** | 0 | 0 | No | Safe to proceed |
| **Settings** | 0 | 0 | No | Safe to proceed |
| **Reports** | 0 | 0 | No | Safe to proceed |

---

## Mitigation Plan

### Immediate Actions (Before Any Refactoring)

1. **Update design-patterns.md** with:
   - [ ] Parallel query aggregate data pattern (Tiger #1 mitigation)
   - [ ] Custom hooks decision tree (Tiger #4 mitigation)
   - [ ] Handler naming convention (Elephant #2 mitigation)
   - [ ] Cache invalidation guidelines (Elephant #1 mitigation)

2. **Communications Domain Routing Decision:**
   - [ ] User decides: Tab-based vs separate routes
   - [ ] Create ALL route files before hook migration
   - [ ] Document dialog vs route criteria

3. **Financial Domain Route Verification:**
   - [ ] Verify which routes exist
   - [ ] Create missing routes before refactoring presenters

### Refactoring Order (Revised)

**Phase 1: Simple Domains (Build Confidence)**
1. Suppliers (1 component) - Easiest
2. Dashboard (1 component with hook) - Simple
3. Settings (1 component with hook) - Simple
4. Reports (2 components) - Medium

**Phase 2: Financial Domain (Progressive Complexity)**
1. ar-aging-report (3 hooks) - Easy
2. xero-sync-status (7 hooks) - Medium
3. payment-plans-list (8 hooks) - Medium
4. customer-statements (9 hooks) - Medium
5. payment-reminders (11 hooks) - Complex
6. credit-notes-list (12 hooks) - Complex
7. financial-dashboard (10 hooks + parallel queries) - Very Complex

**Phase 3: Communications Domain (After Routing Complete)**
1. Create routing structure first
2. Tier 1 components (simple queries)
3. Tier 2 components (medium complexity)
4. Tier 3 components (complex/parallel)

---

## Success Criteria

### Per-Component
- [ ] No `useQuery`/`useMutation`/`useServerFn` in presenter
- [ ] All props have `@source` JSDoc annotations
- [ ] Loading/error states render correctly
- [ ] No TypeScript errors
- [ ] Tests pass (if exist)

### Per-Domain
- [ ] All presenters follow same pattern
- [ ] Cache invalidation consistent
- [ ] Handler naming consistent
- [ ] Documentation updated if new patterns discovered

### Overall
- [ ] Design patterns document includes all discovered edge cases
- [ ] No regressions in completed domains
- [ ] All 5 remaining domains successfully refactored

---

## Blocking Decisions Required

### Decision 1: Communications Routing Architecture
**Who:** User
**When:** Before starting Communications refactoring
**Options:**
1. Tab-based (`/communications` with client-side tabs)
2. Separate routes (`/communications/campaigns`, `/communications/emails`, etc.)
3. Hybrid (tabs for some, routes for others)

**Recommendation:** Separate routes for better deep-linking and code splitting.

---

### Decision 2: Financial Missing Routes
**Who:** User/Developer
**When:** Before refactoring payment-plans, credit-notes, statements
**Question:** Should these get dedicated routes or stay embedded in existing pages?

**Recommendation:** Create dedicated routes following Orders/Inventory pattern for consistency.

---

## Timeline Impact

**Original Estimate:** 7-10 hours total
**Revised Estimate:** 10-14 hours total

**Breakdown:**
- Design pattern updates: +1 hour
- Communications routing creation: +2 hours
- Financial route creation: +1 hour
- Actual refactoring: 10 hours (unchanged)

**Critical Path:** Communications domain blocks on routing decision.

---

## Recommended Next Steps

1. **Update design-patterns.md** (30 min)
   - Add parallel query pattern
   - Add custom hooks decision tree
   - Add naming conventions
   - Add cache invalidation guidelines

2. **Make Communications routing decision** (User decision)
   - Review proposed structure
   - Choose tab-based vs routes
   - Approve proposed route list

3. **Verify Financial routes** (15 min)
   - List existing routes
   - Identify which need creation
   - Create missing routes (30-60 min)

4. **Start with Suppliers domain** (15 min)
   - Easiest domain (1 component)
   - Validates pattern still works
   - Builds confidence before complex domains

5. **Proceed to Financial** (4-6 hours)
   - Follow tiered approach
   - Start simple (ar-aging)
   - Progress to complex (financial-dashboard)

6. **Communications last** (after routing) (3-4 hours)
   - Routes must exist first
   - Follow tier structure
   - Review template-editor hook decision
