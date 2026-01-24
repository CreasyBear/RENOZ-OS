# Container/Presenter Standardization

---
category: architecture
tags: [tanstack-query, query-keys, cache-invalidation, hooks, container-presenter]
severity: high
domains: [suppliers, purchase-orders, activities]
date_solved: 2025-01-24
---

## Problem Statement

Multiple route files were bypassing the centralized hook architecture by:

1. **Hardcoded query keys** - Using inline arrays like `['purchaseOrder', poId]` instead of `queryKeys.suppliers.purchaseOrderDetail(poId)`
2. **Inline mutations** - Defining `useMutation` directly in route components instead of using centralized hooks
3. **Cache invalidation failures** - Hardcoded keys don't match centralized keys, causing stale data after mutations
4. **Import path drift** - Components relocated but import paths not updated

### Symptoms

- Data not refreshing after create/update/delete operations
- Inconsistent cache behavior across different views
- TypeScript errors from missing type exports
- Duplicate query key definitions across files

## Root Cause

The container/presenter pattern was not consistently applied. Routes (containers) should:
- Call centralized hooks from `@/hooks/*`
- Use `queryKeys.*` from `@/lib/query-keys.ts`
- Pass data down to presenter components via props

Instead, several routes had evolved to define their own inline queries and mutations, breaking cache coherence.

## Solution

### 1. Centralized Hooks Pattern

**Before (anti-pattern):**
```typescript
// In route file - WRONG
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchaseOrder, approvePurchaseOrder } from '@/server/functions/suppliers/purchase-orders';

function PurchaseOrderDetailPage() {
  const { data: po } = useQuery({
    queryKey: ['purchaseOrder', poId],  // Hardcoded key!
    queryFn: () => getPurchaseOrder({ data: { id: poId } }),
  });

  const approveMutation = useMutation({
    mutationFn: approvePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', poId] });  // Won't match other views
    },
  });
}
```

**After (correct pattern):**
```typescript
// In route file - CORRECT
import { useQueryClient } from '@tanstack/react-query';
import { usePurchaseOrder, useApprovePurchaseOrder } from '@/hooks/suppliers';
import { queryKeys } from '@/lib/query-keys';

function PurchaseOrderDetailPage() {
  const { data: po } = usePurchaseOrder(poId);  // Centralized hook
  const approveMutation = useApprovePurchaseOrder();  // Centralized mutation

  // If manual invalidation needed:
  queryClient.invalidateQueries({
    queryKey: queryKeys.suppliers.purchaseOrderDetail(poId),  // Centralized key
  });
}
```

### 2. Hook Definition Pattern

```typescript
// src/hooks/suppliers/use-purchase-orders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function usePurchaseOrder(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers.purchaseOrderDetail(id),
    queryFn: () => getPurchaseOrder({ data: { id } }),
    enabled: options.enabled !== false && !!id,
    staleTime: 60 * 1000,
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvePurchaseOrder,
    onSuccess: (_, variables) => {
      // Invalidate both list and detail views
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.purchaseOrderDetail(variables.data.id),
      });
    },
  });
}
```

### 3. Query Keys Structure

```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  suppliers: {
    // Lists
    suppliersList: () => ['suppliers', 'list'] as const,
    suppliersListFiltered: (filters: SupplierFilters) => ['suppliers', 'list', filters] as const,
    purchaseOrdersList: () => ['purchase-orders', 'list'] as const,
    purchaseOrdersListFiltered: (filters: PurchaseOrderFilters) => ['purchase-orders', 'list', filters] as const,

    // Details
    supplierDetail: (id: string) => ['suppliers', 'detail', id] as const,
    purchaseOrderDetail: (id: string) => ['purchase-orders', 'detail', id] as const,

    // Related data
    supplierPerformance: (id: string) => ['suppliers', 'performance', id] as const,
  },
};
```

## Files Modified

| File | Change |
|------|--------|
| `src/routes/_authenticated/purchase-orders/$poId.tsx` | Replaced inline queries/mutations with centralized hooks |
| `src/routes/_authenticated/purchase-orders/index.tsx` | Use `usePurchaseOrders`, `useDeletePurchaseOrder` hooks |
| `src/routes/_authenticated/suppliers/index.tsx` | Use `useSuppliers`, `useDeleteSupplier` hooks |
| `src/routes/_authenticated/activities/index.tsx` | Updated import path to `@/components/domain/activity` |
| `src/routes/_authenticated/admin/activities/index.tsx` | Updated import path to `@/components/domain/activity` |
| `src/hooks/suppliers/use-suppliers.ts` | Added missing `SupplierFilters` type import |

## Prevention Strategies

### 1. Code Review Checklist

When reviewing route files, verify:

- [ ] No direct `useQuery` calls - should use centralized hooks
- [ ] No direct `useMutation` calls - should use centralized hooks
- [ ] No hardcoded query key arrays like `['something', id]`
- [ ] All `invalidateQueries` use `queryKeys.*`
- [ ] Import paths match current component locations

### 2. Detection Commands

```bash
# Find hardcoded query keys in routes
grep -rn "queryKey: \['" src/routes/ --include="*.tsx"

# Find inline useQuery in routes (should only import from hooks)
grep -rn "useQuery({" src/routes/ --include="*.tsx"

# Find inline useMutation in routes
grep -rn "useMutation({" src/routes/ --include="*.tsx"

# Find mismatched invalidation keys
grep -rn "invalidateQueries.*queryKey: \[" src/ --include="*.ts" --include="*.tsx"
```

### 3. ESLint Rule (Recommended)

Consider adding a custom ESLint rule or using `eslint-plugin-import` to enforce:

```javascript
// .eslintrc.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@tanstack/react-query'],
        importNames: ['useQuery', 'useMutation'],
        message: 'Import query hooks from @/hooks/* instead. Only useQueryClient is allowed directly.',
      }],
    }],
  },
}
```

### 4. Architecture Decision Record

Routes (containers) may only:
- Import hooks from `@/hooks/*`
- Import `useQueryClient` from `@tanstack/react-query` (for manual invalidation)
- Import `queryKeys` from `@/lib/query-keys` (for invalidation keys)

Routes may NOT:
- Import `useQuery` or `useMutation` directly
- Define query keys inline
- Import server functions directly

## Known Technical Debt

An audit found **181 inline query key occurrences** across 57 files in other domains:

| Domain | Approximate Count |
|--------|-------------------|
| communications | ~30 |
| financial | ~25 |
| inventory | ~30 |
| pipeline | ~14 |
| customer | ~8 |
| oauth | ~4 |

These should be addressed in future sprints using the same pattern documented here.

## Related Documentation

- [CLAUDE.md - Data Fetching Rules](../../../CLAUDE.md#data-fetching-rules-critical)
- [Hook Architecture Rules](../../../.claude/rules/hook-architecture.md)
- [Query Keys Reference](../../../src/lib/query-keys.ts)
- [Suppliers Hooks](../../../src/hooks/suppliers/)

## Testing Verification

After applying this pattern, verify:

1. **Create operation** - New items appear in list views immediately
2. **Update operation** - Changes reflect in both list and detail views
3. **Delete operation** - Items removed from all views
4. **Navigation** - Data fresh when navigating between list and detail
5. **Browser refresh** - Data loads correctly from cache then refetches
