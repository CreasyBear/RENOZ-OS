# Container/Presenter Standardization - Phase 2 Sprint Plan

## Goal

Complete standardization for partially-compliant domains by:
1. Centralizing query keys in `@/lib/query-keys.ts`
2. Extracting inline `useQuery`/`useMutation` into custom hooks
3. Creating missing container routes
4. Removing mock data and wiring real APIs
5. Relocating misplaced components

## Success Criteria

- All query keys use centralized `queryKeys.*` factory pattern
- Custom hooks exist for all data fetching (e.g., `useSuppliers()`, `useProcurementMetrics()`)
- Presenters receive data via props only (no `useQuery` in presenters)
- No mock/sample data in containers
- `window.location.reload()` replaced with cache invalidation
- Activities components moved to `src/components/domain/activity/`

## Scope

| Domain | Current | Target | Effort |
|--------|---------|--------|--------|
| Dashboard | 95% | 100% | 1-2h |
| Activities | 85% | 100% | 1-2h |
| Settings | 80% | 100% | 3-4h |
| Reports | 75% | 100% | 8-11h |
| Suppliers | 70% | 100% | 1-2h |
| Purchase Orders | 70% | 100% | 1-2h |
| Approvals | 50% | 100% | 2-3h |
| Procurement | 30% | 100% | 4-6h |

**Total Estimated Effort: 21-32 hours**

---

## Sprint 1: Quick Wins (4-6 hours)

### 1.1 Dashboard Widget Fix (1-2h)

**File:** `src/components/domain/dashboard/expiring-warranties-widget.tsx`

**Current Issue:** Widget calls `useExpiringWarranties()` directly instead of receiving data via props.

**Tasks:**
- [ ] Move `useExpiringWarranties()` call to `src/routes/_authenticated/dashboard.tsx`
- [ ] Add `warranties`, `isLoading`, `error` props to widget interface
- [ ] Update widget to render from props
- [ ] Add JSDoc documenting hook source

**Verification:** Widget renders same data, no hooks in presenter.

---

### 1.2 Activities Relocation (1-2h)

**Current Location:** `src/components/activity/`
**Target Location:** `src/components/domain/activity/`

**Tasks:**
- [ ] Create `src/components/domain/activity/` directory
- [ ] Move all files from `src/components/activity/` to new location
- [ ] Update all imports across codebase (use search/replace)
- [ ] Create barrel export `src/components/domain/activity/index.ts`
- [ ] Delete old `src/components/activity/` directory
- [ ] Verify no broken imports

**Files to Move:**
- activity-dashboard.tsx
- activity-feed.tsx
- activity-filters.tsx
- activity-item.tsx
- activity-leaderboard.tsx
- activity-timeline.tsx
- activity-charts.tsx
- activity-heatmap.tsx
- change-diff.tsx

**Verification:** All activity routes render correctly.

---

### 1.3 Suppliers Query Key Centralization (1-2h)

**Files:**
- `src/routes/_authenticated/suppliers/index.tsx`
- `src/lib/query-keys.ts`
- `src/hooks/suppliers/use-suppliers.ts` (new)

**Tasks:**
- [ ] Add to `queryKeys` in `src/lib/query-keys.ts`:
  ```typescript
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters?: SupplierFilters) => [...queryKeys.suppliers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
  },
  ```
- [ ] Create `src/hooks/suppliers/use-suppliers.ts`:
  ```typescript
  export function useSuppliers(filters?: SupplierFilters) {
    return useQuery({
      queryKey: queryKeys.suppliers.list(filters),
      queryFn: () => listSuppliers({ data: filters }),
    });
  }

  export function useDeleteSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => deleteSupplier({ data: { id } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
      },
    });
  }
  ```
- [ ] Update route container to use new hooks
- [ ] Remove inline query keys from route

**Verification:** Supplier list loads, delete invalidates cache.

---

### 1.4 Purchase Orders Query Key Centralization (1-2h)

**Files:**
- `src/routes/_authenticated/purchase-orders/index.tsx`
- `src/lib/query-keys.ts`
- `src/hooks/purchase-orders/use-purchase-orders.ts` (new)

**Tasks:**
- [ ] Add to `queryKeys` in `src/lib/query-keys.ts`:
  ```typescript
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    lists: () => [...queryKeys.purchaseOrders.all, 'list'] as const,
    list: (filters?: POFilters) => [...queryKeys.purchaseOrders.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.purchaseOrders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.details(), id] as const,
    pendingApprovals: () => [...queryKeys.purchaseOrders.all, 'pending-approvals'] as const,
  },
  ```
- [ ] Create `src/hooks/purchase-orders/use-purchase-orders.ts`
- [ ] Update route container to use new hooks
- [ ] Remove inline query keys from route

**Verification:** PO list loads, actions invalidate cache correctly.

---

## Sprint 2: Approvals & Procurement (6-9 hours)

### 2.1 Approvals Domain Standardization (2-3h)

**Files:**
- `src/routes/_authenticated/approvals/index.tsx`
- `src/components/domain/approvals/approval-dashboard.tsx`
- `src/hooks/approvals/use-approvals.ts` (new)

**Current Issues:**
1. Container returns mock/hardcoded data
2. Presenter has complex local state for selection/filtering
3. No custom hooks

**Tasks:**
- [ ] Create real server function `src/server/functions/approvals/get-approvals.ts`
- [ ] Add query keys to `src/lib/query-keys.ts`:
  ```typescript
  approvals: {
    all: ['approvals'] as const,
    lists: () => [...queryKeys.approvals.all, 'list'] as const,
    list: (filters?: ApprovalFilters) => [...queryKeys.approvals.lists(), filters ?? {}] as const,
    pending: () => [...queryKeys.approvals.all, 'pending'] as const,
    counts: () => [...queryKeys.approvals.all, 'counts'] as const,
  },
  ```
- [ ] Create `src/hooks/approvals/use-approvals.ts`:
  - `useApprovalItems(filters)`
  - `useApprovalCounts()`
  - `useApproveItem()`
  - `useRejectItem()`
- [ ] Extract selection logic from presenter to custom hook `useApprovalSelection()`
- [ ] Move filtering logic to server-side or dedicated hook
- [ ] Update container to wire real data
- [ ] Clean up presenter to be props-only

**Verification:** Approval dashboard shows real data, approve/reject updates list.

---

### 2.2 Procurement Domain Implementation (4-6h)

**Files:**
- `src/routes/_authenticated/procurement/dashboard.tsx`
- `src/components/domain/procurement/procurement-dashboard.tsx`
- `src/server/functions/procurement/` (new directory)
- `src/hooks/procurement/` (new directory)

**Current Issues:**
1. No data fetching layer implemented
2. Dashboard uses hardcoded sample data
3. Presenters are ready but not wired

**Tasks:**
- [ ] Create server functions:
  - `src/server/functions/procurement/get-procurement-metrics.ts`
  - `src/server/functions/procurement/get-pending-approvals.ts`
  - `src/server/functions/procurement/get-procurement-alerts.ts`
- [ ] Add query keys to `src/lib/query-keys.ts`:
  ```typescript
  procurement: {
    all: ['procurement'] as const,
    metrics: (dateRange?: DateRange) => [...queryKeys.procurement.all, 'metrics', dateRange] as const,
    pendingApprovals: () => [...queryKeys.procurement.all, 'pending'] as const,
    alerts: () => [...queryKeys.procurement.all, 'alerts'] as const,
  },
  ```
- [ ] Create custom hooks:
  - `src/hooks/procurement/use-procurement-metrics.ts`
  - `src/hooks/procurement/use-pending-approvals.ts`
  - `src/hooks/procurement/use-procurement-alerts.ts`
- [ ] Wire container route to fetch real data
- [ ] Remove sample data from presenter
- [ ] Pass data via props to `ProcurementDashboard`

**Verification:** Procurement dashboard loads real metrics, alerts update.

---

## Sprint 3: Settings Container (3-4 hours)

### 3.1 Win/Loss Reasons Container Route (3-4h)

**Files:**
- `src/routes/_authenticated/settings/win-loss-reasons.tsx` (new)
- `src/server/functions/pipeline/win-loss-reasons.ts` (new or verify exists)
- `src/hooks/pipeline/use-win-loss-reasons.ts` (new)

**Current Issue:** `win-loss-reasons-manager.tsx` is a compliant presenter but has no container route.

**Tasks:**
- [ ] Verify/create server functions:
  - `getWinLossReasons()`
  - `createWinLossReason()`
  - `updateWinLossReason()`
  - `deleteWinLossReason()`
- [ ] Add query keys to `src/lib/query-keys.ts`:
  ```typescript
  winLossReasons: {
    all: ['win-loss-reasons'] as const,
    lists: () => [...queryKeys.winLossReasons.all, 'list'] as const,
    list: (type?: 'win' | 'loss') => [...queryKeys.winLossReasons.lists(), type] as const,
  },
  ```
- [ ] Create `src/hooks/pipeline/use-win-loss-reasons.ts`:
  - `useWinLossReasons(type?)`
  - `useCreateWinLossReason()`
  - `useUpdateWinLossReason()`
  - `useDeleteWinLossReason()`
- [ ] Create container route `src/routes/_authenticated/settings/win-loss-reasons.tsx`:
  ```typescript
  function WinLossReasonsPage() {
    const { data: reasons, isLoading, error } = useWinLossReasons();
    const createMutation = useCreateWinLossReason();
    const updateMutation = useUpdateWinLossReason();
    const deleteMutation = useDeleteWinLossReason();

    return (
      <WinLossReasonsManager
        reasons={reasons ?? []}
        isLoading={isLoading}
        error={error}
        onCreateReason={(data) => createMutation.mutate(data)}
        onUpdateReason={(id, data) => updateMutation.mutate({ id, ...data })}
        onDeleteReason={(id) => deleteMutation.mutate(id)}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }
  ```
- [ ] Add route to settings navigation
- [ ] Test CRUD operations

**Verification:** Settings > Win/Loss Reasons page loads, CRUD works with cache invalidation.

---

## Sprint 4: Reports Domain (8-11 hours)

### 4.1 Pipeline Forecast Hooks (4-5h)

**Files:**
- `src/routes/_authenticated/reports/pipeline-forecast.tsx`
- `src/hooks/pipeline/use-pipeline-forecast.ts` (new)
- `src/hooks/pipeline/use-pipeline-velocity.ts` (new)
- `src/hooks/pipeline/use-revenue-attribution.ts` (new)

**Current Issues:**
1. Three separate `useQuery` calls with inline keys
2. No custom hooks wrapping data fetching
3. Inline server function calls

**Tasks:**
- [ ] Add query keys to `src/lib/query-keys.ts`:
  ```typescript
  pipelineReports: {
    all: ['pipeline-reports'] as const,
    forecast: (params: ForecastParams) => [...queryKeys.pipelineReports.all, 'forecast', params] as const,
    velocity: (params: VelocityParams) => [...queryKeys.pipelineReports.all, 'velocity', params] as const,
    attribution: (params: AttributionParams) => [...queryKeys.pipelineReports.all, 'attribution', params] as const,
  },
  ```
- [ ] Create `src/hooks/pipeline/use-pipeline-forecast.ts`
- [ ] Create `src/hooks/pipeline/use-pipeline-velocity.ts`
- [ ] Create `src/hooks/pipeline/use-revenue-attribution.ts`
- [ ] Update route to use new hooks
- [ ] Add JSDoc to presenter props documenting sources

**Verification:** Pipeline forecast page loads with all three data sources.

---

### 4.2 Win/Loss Analysis Hooks (2-3h)

**Files:**
- `src/routes/_authenticated/reports/win-loss.tsx`
- `src/hooks/pipeline/use-win-loss-analysis.ts` (new)
- `src/hooks/pipeline/use-competitors.ts` (new)

**Current Issues:**
1. Inline query keys: `['win-loss-analysis', ...]`
2. No cache invalidation pattern defined
3. Direct server function calls without hooks

**Tasks:**
- [ ] Add query keys to `src/lib/query-keys.ts`:
  ```typescript
  winLossAnalysis: {
    all: ['win-loss-analysis'] as const,
    analysis: (params: WinLossParams) => [...queryKeys.winLossAnalysis.all, 'analysis', params] as const,
    competitors: (params: WinLossParams) => [...queryKeys.winLossAnalysis.all, 'competitors', params] as const,
  },
  ```
- [ ] Create `src/hooks/pipeline/use-win-loss-analysis.ts`
- [ ] Create `src/hooks/pipeline/use-competitors.ts`
- [ ] Update route to use new hooks
- [ ] Add manual refresh mutation support

**Verification:** Win/Loss analysis page loads both analysis and competitor data.

---

### 4.3 Procurement Reports (2-3h)

**Files:**
- `src/routes/_authenticated/reports/procurement/index.tsx`
- `src/hooks/procurement/use-procurement-analytics.ts` (new)

**Current Issues:**
1. Uses mock data in `queryFn`
2. Query key not centralized

**Tasks:**
- [ ] Create/verify server function `getProcurementAnalytics()`
- [ ] Add query keys (may reuse procurement keys from Sprint 2)
- [ ] Create `src/hooks/procurement/use-procurement-analytics.ts`
- [ ] Replace mock data with real API call
- [ ] Update route to use new hook

**Verification:** Procurement reports show real data.

---

## Verification Checklist

After completing all sprints:

- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run lint` - no errors
- [ ] Grep for inline query keys: `grep -r "useQuery.*queryKey: \['" src/routes/` should return minimal results
- [ ] Grep for hooks in presenters: `grep -r "useQuery\|useMutation" src/components/domain/` should only show containers
- [ ] Manual smoke test of each domain route
- [ ] No `window.location.reload()` in new code

---

## Domain Close-Out Template

```markdown
### Domain: [Name]
- Status: Complete
- Verification: [What was checked]
- Query Keys: Added to queryKeys.[domain].*
- Custom Hooks: src/hooks/[domain]/use-*.ts
- Notes: [Any follow-up items]
```

---

## Notes

- Complete Sprint 1 first as quick wins build momentum
- Sprints 2-4 can be parallelized if multiple developers available
- Use Dashboard as reference implementation for container pattern
- Always invalidate related queries on mutations
- Add staleTime: 5 * 60 * 1000 for most queries (5 min default)
