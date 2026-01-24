# Suppliers Domain - Detailed Refactoring Breakdown

**Status:** Ready for refactoring
**Priority:** Next in queue
**Estimated Complexity:** LOW (only 1 presenter with hooks)

---

## Components Inventory

### Presenters WITH Data Hooks ❌
1. **`src/components/domain/approvals/approval-dashboard.tsx`** (3 hook usages)
   - `useQueryClient()` - line 77
   - `useQuery()` - line 90 (fetching approval items)
   - Need to move these to container

### Presenters WITHOUT Data Hooks ✅
1. `src/components/domain/procurement/procurement-dashboard.tsx`
2. `src/components/domain/procurement/procurement-stats.tsx`
3. `src/components/domain/procurement/procurement-alerts.tsx`
4. `src/components/domain/procurement/dashboard-widgets.tsx`
5. `src/components/domain/purchase-orders/po-directory.tsx`
6. `src/components/domain/purchase-orders/po-table.tsx`
7. `src/components/domain/purchase-orders/po-filters.tsx`

---

## Refactoring Tasks

### Task 1: approval-dashboard.tsx
**File:** `src/components/domain/approvals/approval-dashboard.tsx`
**Container:** `src/routes/_authenticated/approvals/index.tsx`

**Changes Required:**
1. Move `useQuery` hook from presenter to container route
2. Move `useQueryClient` from presenter to container route
3. Add props interface with JSDoc annotations
4. Pass `approvalItems` + `isLoading` state as props
5. Add loading state handling in presenter

**Pattern to follow:**
```typescript
// In route (container):
const ApprovalsDashboard = () => {
  const queryClient = useQueryClient();
  const { data: approvalItems = [], isLoading } = useQuery({...});

  return <ApprovalDashboard approvalItems={approvalItems} isLoading={isLoading} />;
};

// In presenter:
interface ApprovalDashboardProps {
  /** @source useQuery(getApprovals) in /approvals/index.tsx */
  approvalItems: ApprovalItem[];
  /** @source useQuery loading state in /approvals/index.tsx */
  isLoading: boolean;
}

export function ApprovalDashboard({ approvalItems, isLoading }: ApprovalDashboardProps) {
  if (isLoading) return <LoadingSpinner />;
  // ... rest of component
}
```

---

## Success Criteria

- [ ] `approval-dashboard.tsx` has NO `useQuery`, `useMutation`, or `useServerFn` imports
- [ ] All props have JSDoc annotations with `@source` tag
- [ ] Loading states handled in presenter
- [ ] Container route passes all necessary data/handlers
- [ ] Tests still pass
- [ ] No TypeScript errors

---

## Files to Modify

### Must Edit:
1. `src/components/domain/approvals/approval-dashboard.tsx` - Remove hooks, add props
2. `src/routes/_authenticated/approvals/index.tsx` - Add hooks, pass props

### May Need to Check:
- Server functions being called (verify they exist)
- Query keys being used (ensure consistency)

---

## Estimated Effort

**Time:** ~15-20 minutes
**Risk:** LOW - Single component, straightforward refactor
**Complexity:** LOW - Similar to completed domains

---

## Notes

- This is the ONLY Suppliers-related presenter with hooks
- The procurement and purchase-orders presenters are already compliant
- Follow the exact pattern from Customers/Orders/Pipeline domains
- Ensure proper TypeScript types for all props
