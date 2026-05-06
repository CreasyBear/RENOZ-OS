# Documents Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Document Preview Tenant Scope and Domain Truth

### Problem

Document preview verified the parent order by organization, then fetched order line items by `orderId` only. The same preview surface also carried generic renovation sample data, including kitchen cabinetry and an unrelated sample company, even though RENOZ-V3 supports a lithium-ion battery OEM operation.

Preview is not production document generation, but it still teaches operators and maintainers what the product thinks the business is. It should be tenant-safe and domain-honest.

### Workflow Spine

Document preview modal/action
-> `previewDocument`
-> organization branding read
-> sample data path or tenant-scoped real order read
-> tenant-scoped customer/address/line item reads
-> preview document data builder
-> preview renderer
-> base64 PDF response.

### Touched Domains

- Documents preview.
- Orders line item preview reads.
- Document sample data/domain copy.
- Document preview contract tests.

### Business Value Protected

RENOZ operators should see previews that match battery OEM sales, fulfillment, commissioning, and warranty workflows. Real-order preview reads should also follow the same child-row tenant discipline as generated document reads.

### Scope Constraints

- Do not change generated document persistence, PDF storage, generation routes, query keys, cache invalidation, generated-document history, document templates, or production generation handlers.
- Do not broaden into project/service/warranty PDF jobs.
- Keep this as a preview-path slice.

### Changes

- Scoped real-order preview line item reads by order id and organization id.
- Replaced renovation/kitchen sample organization, customer, order, warranty, job, task, and material data with RENOZ battery OEM examples.
- Added `document-preview-contract.test.ts` to lock tenant-scoped preview line reads and prevent the old renovation placeholders from returning.

### Standards Checked

- Domain ownership: preview-specific behavior stays in the Documents preview server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked preview server function, order/customer/address/line item tables, preview builders/renderers, and existing document surfaces; no query-key or cache contract changed.
- Tenant isolation/data integrity: improved. Real-order preview line items now carry organization scope at the query point.
- Transactional inventory and finance integrity: unchanged; preview rendering does not write inventory or finance state.
- Serialized lineage continuity: unchanged; no serial identity or lineage path changed.
- Honest UI states/operator-safe errors: improved at the preview content layer by removing misleading renovation placeholders.
- Reviewability: bounded diff across one preview server function, one focused contract test, and this closeout.

### Smells Removed

- Preview line item read by order id only.
- Renovation-focused sample company and customer data.
- Kitchen cabinetry/material sample line items.
- Renovation job/warranty examples that did not match RENOZ Energy's battery OEM workflows.

### Deferred

- Visual PDF preview QA remains a future slice because templates/renderers were not structurally changed.
- Project, service, warranty, handover, and report preview data can receive their own deeper domain review.
- Preview UI loading/error states were not changed.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/document-preview-contract.test.ts tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/render-contracts.test.ts tests/unit/documents/builders.test.ts tests/unit/orders/order-document-surfaces.test.tsx` - 5 files, 16 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible app layout, build-time behavior, financial calculations, release packaging, deployment paths, or PDF renderer structure.

### Goal Adaptation

Declined. The dedicated Documents maintainer path established in Sprint 1 already covers this preview-domain slice.

### Residual Risk

Low for preview line-item tenant scope and removal of the old renovation placeholders. Moderate for broader preview quality because current evidence is source-level contract coverage plus adjacent document render/surface tests, not browser-based visual PDF preview QA.
