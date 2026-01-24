# Financial Domain - Detailed Refactoring Breakdown

**Status:** Partially complete (revenue-reports done)
**Priority:** High
**Estimated Complexity:** MEDIUM-HIGH (7 presenters with extensive hooks)

---

## Components Inventory

### Presenters WITH Data Hooks ❌

1. **`financial-dashboard.tsx`** (10 hook usages) - COMPLEX
   - Multiple `useServerFn` calls (4 different server functions)
   - Multiple `useQuery` calls (4 separate queries)
   - Parallel data fetching pattern

2. **`payment-reminders.tsx`** (11 hook usages) - COMPLEX
   - CRUD operations (create/update/delete)
   - Multiple `useMutation` calls
   - `useQueryClient` for cache invalidation

3. **`payment-plans-list.tsx`** (8 hook usages) - MEDIUM
   - Create payment plan mutation
   - Record installment mutation
   - Query payment schedules

4. **`credit-notes-list.tsx`** (12 hook usages) - COMPLEX
   - Create, issue, void, apply mutations
   - List query with filters
   - Multiple queryClient invalidations

5. **`xero-sync-status.tsx`** (7 hook usages) - MEDIUM
   - List invoices by sync status
   - Resync mutation
   - Error handling for sync failures

6. **`customer-statements.tsx`** (9 hook usages) - MEDIUM
   - Generate statement mutation
   - List statements query
   - Email/mark sent mutations

7. **`ar-aging-report.tsx`** (3 hook usages) - LOW
   - Single query for AR aging data
   - Straightforward refactor

### Presenters WITHOUT Data Hooks ✅
- `revenue-reports.tsx` (already refactored ✅)

---

## Refactoring Strategy

### Phase 1: Simple Components (Start Here)
**Order:** ar-aging-report → xero-sync-status

**Rationale:** These have simpler data flows, good for warming up

### Phase 2: Medium Complexity
**Order:** payment-plans-list → customer-statements

**Rationale:** Standard CRUD patterns, similar to Orders domain

### Phase 3: Complex Components
**Order:** payment-reminders → credit-notes-list → financial-dashboard

**Rationale:** Multiple mutations, parallel queries, need careful prop design

---

## Detailed Task Breakdown

### Task 1: ar-aging-report.tsx (EASY)
**Container:** `src/routes/_authenticated/financial/ar-aging.tsx`

**Hooks to move:**
- `useServerFn(getARAgingReport)`
- `useQuery` for AR aging data

**Props to add:**
```typescript
interface ARAgingReportProps {
  /** @source useQuery(getARAgingReport) in /financial/ar-aging.tsx */
  data: ARAgingData | undefined;
  /** @source useQuery loading state */
  isLoading: boolean;
  /** @source useQuery error state */
  error: Error | null;
}
```

---

### Task 2: xero-sync-status.tsx (MEDIUM)
**Container:** `src/routes/_authenticated/financial/xero-sync.tsx`

**Hooks to move:**
- `useServerFn(listInvoicesBySyncStatus)`
- `useServerFn(resyncInvoiceToXero)`
- `useQuery` for invoice list
- `useMutation` for resync action
- `useQueryClient`

**Props to add:**
```typescript
interface XeroSyncStatusProps {
  /** @source useQuery(listInvoicesBySyncStatus) */
  data: InvoiceSyncData | undefined;
  /** @source useQuery loading state */
  isLoading: boolean;
  /** @source useQuery error state */
  error: Error | null;
  /** @source useMutation(resyncInvoiceToXero) handler */
  onResync: (invoiceId: string) => Promise<void>;
  /** @source useMutation isPending state */
  isResyncing: boolean;
}
```

---

### Task 3: payment-plans-list.tsx (MEDIUM)
**Container:** `src/routes/_authenticated/financial/payment-plans.tsx` (may need to create)

**Hooks to move:**
- `useServerFn(createPaymentPlan)`
- `useServerFn(recordInstallmentPayment)`
- `useServerFn(getPaymentSchedule)`
- `useMutation` for create
- `useMutation` for record payment
- `useQuery` for schedule
- `useQueryClient`

**Props to add:**
```typescript
interface PaymentPlansListProps {
  /** @source useQuery(getPaymentSchedule) */
  data: PaymentSchedule | undefined;
  /** @source useQuery loading state */
  isLoading: boolean;
  /** @source useQuery error state */
  error: Error | null;
  /** @source useMutation(createPaymentPlan) handler */
  onCreatePlan: (plan: CreatePaymentPlanInput) => Promise<void>;
  /** @source useMutation(recordInstallmentPayment) handler */
  onRecordPayment: (installmentId: string, amount: number) => Promise<void>;
  /** @source useMutation isPending states */
  isCreating: boolean;
  isRecording: boolean;
}
```

---

### Task 4: customer-statements.tsx (MEDIUM)
**Container:** `src/routes/_authenticated/financial/statements.tsx` (may need to create)

**Hooks to move:**
- `useServerFn(generateStatement)`
- `useServerFn(listStatements)`
- `useServerFn(markStatementSent)`
- `useMutation` for generate
- `useMutation` for email/send
- `useQuery` for list
- `useQueryClient`

**Props pattern:** Similar to payment-plans-list

---

### Task 5: payment-reminders.tsx (COMPLEX)
**Container:** `src/routes/_authenticated/financial/reminders.tsx`

**Hooks to move:**
- `useServerFn(createReminderTemplate)`
- `useServerFn(updateReminderTemplate)`
- `useServerFn(listReminderTemplates)`
- `useServerFn(deleteReminderTemplate)`
- `useServerFn(getReminderHistory)`
- 2x `useQuery` (templates + history)
- 1x `useMutation` (create/update)
- 1x `useMutation` (delete)
- 2x `useQueryClient`

**Props to add:** Complex - multiple handlers + states

---

### Task 6: credit-notes-list.tsx (COMPLEX)
**Container:** `src/routes/_authenticated/financial/credit-notes.tsx` (may need to create)

**Hooks to move:**
- `useServerFn(createCreditNote)`
- `useServerFn(applyCreditNoteToInvoice)`
- `useServerFn(listCreditNotes)`
- `useServerFn(issueCreditNote)`
- `useServerFn(voidCreditNote)`
- 1x `useQuery` (list)
- 3x `useMutation` (issue, void, apply)
- 3x `useQueryClient`

**Props to add:** Very complex - many handlers

---

### Task 7: financial-dashboard.tsx (VERY COMPLEX)
**Container:** `src/routes/_authenticated/financial/dashboard.tsx` (may exist)

**Hooks to move:**
- `useServerFn(getFinancialDashboardMetrics)`
- `useServerFn(getRevenueByPeriod)`
- `useServerFn(getTopCustomersByRevenue)`
- `useServerFn(getOutstandingInvoices)`
- 4x `useQuery` (parallel fetching!)
- Individual loading states for each query

**Props to add:**
```typescript
interface FinancialDashboardProps {
  /** @source useQuery(getFinancialDashboardMetrics) */
  metrics: DashboardMetrics | undefined;
  /** @source useQuery(getRevenueByPeriod) */
  revenueData: RevenueData | undefined;
  /** @source useQuery(getTopCustomersByRevenue) */
  topCustomers: Customer[] | undefined;
  /** @source useQuery(getOutstandingInvoices) */
  outstanding: Invoice[] | undefined;
  /** @source Individual useQuery loading states */
  loading: {
    metrics: boolean;
    revenue: boolean;
    customers: boolean;
    outstanding: boolean;
  };
}
```

---

## Route Files Status

### Existing Routes ✅
- `src/routes/_authenticated/financial/revenue.tsx` (revenue-reports container)
- `src/routes/_authenticated/financial/ar-aging.tsx`
- `src/routes/_authenticated/financial/xero-sync.tsx`
- `src/routes/_authenticated/financial/reminders.tsx`

### May Need to Create ❓
- `src/routes/_authenticated/financial/payment-plans.tsx`
- `src/routes/_authenticated/financial/credit-notes.tsx`
- `src/routes/_authenticated/financial/statements.tsx`
- `src/routes/_authenticated/financial/dashboard.tsx` (check if exists)

---

## Success Criteria

- [ ] All 7 presenters have NO hook imports
- [ ] All props have JSDoc `@source` annotations
- [ ] Loading/error states handled in presenters
- [ ] All mutations have proper error handling
- [ ] QueryClient invalidations moved to containers
- [ ] Tests pass
- [ ] No TypeScript errors

---

## Estimated Effort

**Total Time:** 4-6 hours
**Risk:** MEDIUM - Complex data flows, many mutations
**Complexity:** HIGH - Parallel queries, CRUD operations, cache invalidation

**Breakdown by task:**
1. ar-aging-report: 15 min
2. xero-sync-status: 30 min
3. payment-plans-list: 45 min
4. customer-statements: 45 min
5. payment-reminders: 60 min
6. credit-notes-list: 60 min
7. financial-dashboard: 90 min

---

## Notes

- Start with ar-aging-report (easiest) to establish pattern
- financial-dashboard has parallel queries - preserve that pattern in container
- Several components may need new route files created
- Cache invalidation logic must be carefully preserved
- Consider batching similar components (e.g., do credit-notes + payment-plans together)
