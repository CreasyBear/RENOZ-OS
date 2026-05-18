# Support Maintainer Sprint 69

## Status

Closed in commit-ready state.

## Issue 1: Support Query-Key Catalog Boundary

### Problem

`src/lib/query-keys.ts` remained a large shared cache monolith after the inventory and product catalog extractions. Support query keys were still embedded inline even though they define issue, RMA, knowledge-base, CSAT, support metrics, escalation, and SLA cache scopes.

Support cache keys are business-critical because issue queues, RMAs, customer feedback, knowledge-base administration, escalation rules, support dashboards, and SLA workflows all depend on exact query identity. The public interface should remain `queryKeys.support`, but the implementation should live in a support-owned module so future support behavior work does not require editing the global aggregate.

### Workflow Spine

Support reads and cache invalidations
-> support hooks for issues, RMAs, KB, CSAT, metrics, escalation, and SLA
-> public `queryKeys.support`
-> extracted `supportQueryKeys`
-> support-owned filter types
-> exact TanStack Query key tuples
-> unchanged support cache invalidation behavior.

### Touched Domains

- Shared query-key catalog.
- Support query-key implementation.
- Support issue, RMA, KB, CSAT, metrics, and SLA cache contracts.
- Support read-state source contracts.
- Sprint evidence.

### Business Value Protected

RENOZ Energy support operations need truthful issue queues, RMA recovery, customer feedback, knowledge-base content, and SLA visibility. This slice keeps support cache identity stable while making the support cache contract easier to review before future support workflow changes.

### Scope Constraints

- Do not change public caller syntax: callers keep using `queryKeys.support`.
- Do not change tuple shapes for issue, RMA, KB, CSAT, metrics, escalation, or SLA keys.
- Do not alter support server functions, schemas, hooks, UI state, RMA execution, warranty workflows, or SLA behavior.
- Preserve compatibility for support filter type imports from `@/lib/query-keys`.

### Changes

- Added `src/lib/query-key-catalog/support.ts`.
- Moved support filter types and the full `queryKeys.support` catalog into `supportQueryKeys`.
- Kept `src/lib/query-keys.ts` as the public aggregate adapter by assigning `support: supportQueryKeys`.
- Re-exported support filter types from `src/lib/query-keys.ts`.
- Removed support schema imports and support-specific `queryKeys.support` self-reference from the aggregate implementation.
- Added `tests/unit/support/support-query-key-catalog-contract.test.ts` to prove the adapter identity and representative issue, RMA, CSAT, KB, and SLA tuple shapes.
- Updated support read-state source contracts to inspect the support-owned catalog instead of requiring support key names to remain inline in the aggregate file.

### Standards Checked

- Domain ownership: support query-key implementation now lives with support cache contracts rather than inside the shared aggregate.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Hooks still call `queryKeys.support`, and checked tuple shapes are unchanged.
- Tenant isolation/data integrity: not directly applicable; no server reads, writes, tenant predicates, RMA execution, inventory quantities, serialized lineage, warranty state, or finance writes changed.
- Query/cache policy: preserved for issue, RMA, KB, CSAT, support metrics, escalation, and SLA key families.
- UI states/operator-safe errors: unchanged; existing support read-state contracts continue to verify operator-safe fallback copy and stale-data handling.
- Reviewability: one catalog module, one aggregate adapter assignment, focused source contracts, and this closeout.

### Smells Removed

- Reduced `src/lib/query-keys.ts` from 2,237 lines to 2,058 lines.
- Removed inline support catalog implementation from the shared query-key monolith.
- Removed support filter types from the global filter-type block.
- Removed support schema imports from the aggregate file.
- Removed support-specific global self-reference from the aggregate implementation.

### Deferred

- `src/lib/query-keys.ts` is still large at 2,058 lines and should continue shedding cohesive domain catalogs.
- Communications, financial, dashboard, customers, orders, warranty, suppliers, jobs, and activities key families remain inline.
- Browser QA is not useful for this slice because no rendered UI behavior changed.

### Gates

- Passed: `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/support.ts tests/unit/support/support-query-key-catalog-contract.test.ts tests/unit/support/csat-feedback-read-state-contract.test.ts tests/unit/support/issue-board-read-state-contract.test.ts tests/unit/support/issue-read-state-contract.test.ts tests/unit/support/issue-template-read-state-contract.test.ts tests/unit/support/kb-category-tree-read-state-contract.test.ts tests/unit/support/rma-detail-read-state-contract.test.ts tests/unit/support/rma-read-state-contract.test.ts tests/unit/support/support-metrics-read-state-contract.test.ts --report-unused-disable-directives`.
- Passed: `./node_modules/.bin/vitest run tests/unit/support/support-query-key-catalog-contract.test.ts tests/unit/support/csat-feedback-read-state-contract.test.ts tests/unit/support/issue-board-read-state-contract.test.ts tests/unit/support/issue-read-state-contract.test.ts tests/unit/support/issue-template-read-state-contract.test.ts tests/unit/support/kb-category-tree-read-state-contract.test.ts tests/unit/support/rma-detail-read-state-contract.test.ts tests/unit/support/rma-read-state-contract.test.ts tests/unit/support/support-metrics-read-state-contract.test.ts tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/query-normalization-wave1.test.tsx tests/unit/support/query-normalization-wave5e.test.tsx` - 12 files, 30 tests.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `git diff --check`.
- Passed: `npm run test:unit` - 766 files, 2,541 tests.
- Skipped: browser QA because no rendered UI behavior changed.
- Skipped: production build because this query-key catalog extraction was covered by focused cache contracts, full lint, typecheck, whitespace checks, and the full unit suite.

### Goal Adaptation

Declined. This is direct progress against the standing maintainer goal and current smell list: draw down `src/lib/query-keys.ts` through behavior-preserving, domain-owned catalog boundaries with evidence.

### Residual Risk

Low for behavior because the public `queryKeys.support` adapter remains unchanged and focused tests cover adapter identity, representative tuple shapes, support read-state contracts, RMA mutation invalidation, and support query normalization. Medium architecture risk remains because many other domain key families are still inline in the global aggregate.
