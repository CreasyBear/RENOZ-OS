# Financial Maintainer Sprint 47: Overdue Installment Query Key Ownership

## Status

Closed in commit-ready state.

## Issue 1: Payment-Plan Workbench Overdue Key Ownership

### Problem

`useOverdueInstallments` built its query key inline by appending `'overdue'` and filters to `queryKeys.financial.paymentSchedules()`. The shape was compatible with payment-schedule root invalidation, but the hook owned a financial cache contract that belongs in centralized query keys.

The overdue installment workbench is a cash-collection workflow. Its list key needs to be a named financial domain contract so future payment-plan read and mutation work does not drift between hook-local arrays and central invalidation roots.

### Workflow Spine

Payment-plan workbench route
-> `useOverdueInstallments`
-> overdue installment server function
-> tenant-scoped payment schedule reads
-> centralized payment schedule query keys
-> payment-plan mutation/root invalidation.

### Touched Domains

- Financial query key infrastructure.
- Payment-plan overdue installment hook.
- Financial query-key contract tests.
- Financial maintainer closeout docs.

### Business Value Protected

Finance operators use overdue installments to chase cash and resolve payment-plan risk. Centralizing the overdue workbench key keeps that read surface aligned with payment-schedule root invalidation after plan creation, installment edits, and recorded cash.

### Scope Constraints

- Do not change payment schedule server functions, tenant predicates, payment recording, ledger writes, order balance projection, reporting invalidation, visible UI, or route behavior.
- Keep this as a cache ownership cleanup slice.

### Changes

- Added `queryKeys.financial.overdueInstallments(filters)`.
- Updated `useOverdueInstallments` to use the centralized key.
- Extended the financial query-key contract test to prove overdue installment pages sit under `queryKeys.financial.paymentSchedules()` while preserving page/filter identity.

### Standards Checked

- Domain ownership: overdue installment cache ownership now lives in `queryKeys.financial`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the payment-plan workbench overdue installment read spine through the hook and centralized financial key root.
- Tenant isolation/data integrity: unchanged; no server functions, database predicates, schemas, payment writes, or projection code touched.
- Query/cache contract: improved by removing hook-local child key construction while preserving payment-schedule root invalidation behavior.
- Transactional inventory and finance integrity: finance write integrity unchanged; this slice only clarifies the read cache contract.
- Serialized lineage continuity: unchanged; no serial identity or inventory serialization path touched.
- Honest UI states/operator-safe errors: unchanged; existing read-error normalization stays in the hook.
- Reviewability: bounded diff across centralized query keys, one hook call site, one query-key test, and this closeout.

### Smells Removed

- Hook-local overdue installment query key construction.
- Unnamed payment-plan workbench child cache contract.
- A remaining literal child key under `queryKeys.financial.paymentSchedules()`.

### Deferred

- Broader payment-plan workbench UX and server read behavior remain separate slices.
- Browser QA remains deferred because this slice changes cache ownership without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Gates

- Passed: `bun run test:vitest tests/unit/financial/query-key-contract.test.tsx`.
- Passed: `rg -n "\\[\\.\\.\\.queryKeys\\.financial\\.paymentSchedules\\(\\), 'overdue'|overdueInstallments|paymentSchedules\\(\\), 'overdue'" src tests/unit/financial -g '*.ts' -g '*.tsx'`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, financial integrity awareness, domain-sliced cleanup, and evidence-based closeout.

### Residual Risk

Low for overdue installment cache ownership. Broader payment-plan workbench freshness still depends on existing mutation invalidation and was not expanded in this slice.
