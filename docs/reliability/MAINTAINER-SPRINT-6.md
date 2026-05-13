# Reliability Maintainer Sprint 6: Full Unit Contract Stabilization

## Status

Closed in commit-ready state.

## Issue 1: Full Unit Suite Still Failed After Audit Cleanup

### Problem

The health audit showed the full unit suite still red after broader repository cleanup. The failures were not broad implementation failures: they were concentrated in stale contract assertions, stale fixture inputs, missing test providers, and integration-style query-normalization tests timing out under full-suite concurrency.

### Workflow Spine

Product-context receiving
-> product detail launch
-> receiving route context validation
-> active inventory-tracked product gate
-> locked receiving form
-> cancel back to product.

Product-context purchase ordering
-> product detail launch
-> purchase-order create route
-> active purchasable product gate
-> supplier/pricing degraded alerts
-> generic PO fallback remains visible when supplier reads fail.

Customer and pipeline degraded list reads
-> stale rows remain visible
-> list container headline warning
-> QueryClient-backed mutation hooks remain render-safe.

Project file upload contract
-> client upload dialog
-> `createServerFn` upload action
-> authenticated project verification
-> organization-scoped storage path
-> rollback verifies project-owned storage path before delete.

Query-normalization contract tests
-> dashboard, jobs, orders, products, suppliers
-> degraded or cached UI remains visible
-> full-suite execution stays stable under realistic repository load.

### Touched Domains

- Dashboard overview query-normalization contract.
- Customers and pipeline query-normalization contract.
- Inventory receiving contextual launch contract.
- Jobs project files, site visits, installer availability, and BOM query-normalization contracts.
- Orders fulfillment tab contract.
- Products image-read query-normalization contract.
- Suppliers detail and purchase-order contextual launch contracts.
- Reliability maintainer closeout docs.

### Business Value Protected

This suite protects the operator workflows that keep RENOZ Energy moving: receiving lithium-ion battery stock, creating purchase orders, seeing fulfillment shipments, reading supplier/order context, keeping dashboard metrics honest, and preserving degraded states instead of silently presenting fake empty data.

### Scope Constraints

- Do not change runtime behavior for this slice.
- Do not weaken degraded-state or cached-data assertions.
- Keep the work limited to test contracts and harness stability.
- Preserve full-suite evidence as the closure gate.

### Changes

- Updated the project file upload contract to match the current `createServerFn` `data.projectId` server action shape.
- Added a real QueryClient provider to the customer/pipeline container degradation test because it renders mutation hooks that require React Query context.
- Updated inventory receiving fixture data to satisfy the route's active inventory-tracked product predicate.
- Updated supplier product-context fixture data to satisfy the purchase-order route's active purchasable product predicate.
- Calibrated a small set of integration-style query-normalization tests with explicit full-suite timeouts based on observed focused execution cost.

### Standards Checked

- Domain ownership: tests remain in their existing domain-owned unit suites.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through route/container contract tests and server function source-contract tests.
- Tenant isolation/data integrity: project file upload verification still proves organization-scoped project verification and owned storage-path rollback.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI states: improved full-suite evidence for degraded/cached/unavailable states.
- Operator-safe error handling: preserved unavailable-state assertions instead of fake empty-state fallbacks.
- Query/cache contract: full query-normalization suite now passes.
- Reviewability: narrow test-only diff plus this closeout.

### Smells Removed

- Stale fixture products that no longer satisfied production safety gates.
- Stale source-contract assertion from the pre-`createServerFn` project upload shape.
- Missing React Query provider in a container test that rendered real mutation hooks.
- Full-suite-only timeout failures hiding otherwise valid query-normalization contracts.

### Deferred

- Test-environment noise remains: repeated `--localstorage-file` warnings, missing Upstash env warnings, and router-provider warnings in some query-normalization tests.
- Production build was not rerun in this sprint because the audit build reached Vercel output/dependency tracing and then hung; this slice touched tests only.
- Some integration-style unit tests remain slow and should eventually be split into smaller presenter/container contracts.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/dashboard/query-normalization-wave7d.test.tsx tests/unit/customers-pipeline/query-normalization-wave6e.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/jobs/project-files-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx tests/unit/jobs/query-normalization-wave4b-admin.test.tsx tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/orders/order-fulfillment-tab.test.tsx tests/unit/products/query-normalization-wave5b.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx`.
- Passed: `./node_modules/.bin/vitest run tests/unit --reporter=dot` (`672` files, `2255` tests).
- Passed: `./node_modules/.bin/eslint tests/unit/dashboard/query-normalization-wave7d.test.tsx tests/unit/customers-pipeline/query-normalization-wave6e.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/jobs/project-files-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx tests/unit/jobs/query-normalization-wave4b-admin.test.tsx tests/unit/jobs/query-normalization-wave4b.test.tsx tests/unit/orders/order-fulfillment-tab.test.tsx tests/unit/products/query-normalization-wave5b.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `node scripts/check-route-casts.mjs`.
- Passed: `node scripts/check-pending-dialog-guards.mjs`.
- Passed: `node scripts/check-read-path-query-guards.mjs`.
- Passed: `node scripts/check-serialized-read-auto-upsert.mjs`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the standing maintainer goal by turning audit findings into a bounded, evidence-backed reliability slice.

### Residual Risk

Low for runtime behavior because this slice changes tests only. Medium for test maintainability: the full suite is green, but several query-normalization tests are still expensive and should be decomposed when the next related domain slice touches them.
