# Documents Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Document Generation Reads Prove Tenant Scope

### Problem

Generated quotes, invoices, packing slips, and delivery notes verified the parent order by organization, but several child reads still relied on `orderId`, `shipmentId`, or line item ids alone. The shared shipment serial helper also resolved shipment and allocation serials without an organization argument.

Those documents are customer-facing business artifacts. Their line, shipment, and serial evidence should be scoped as strongly as the order and shipment mutation paths that create the underlying data.

### Workflow Spine

Order document action or background PDF job
-> document generation handler/task
-> tenant-scoped order read
-> tenant-scoped line item read
-> tenant-scoped shipment/allocated serial resolution
-> PDF template render
-> generated document storage/metadata.

Shipment-backed dispatch/delivery document action
-> tenant-scoped shipment read
-> tenant/order-scoped shipment item read
-> tenant/order-scoped line quantity readiness check
-> PDF template render
-> generated document storage/metadata.

### Touched Domains

- Documents generation.
- Orders line item document reads.
- Shipment serial evidence for packing slips and delivery notes.
- Trigger background PDF jobs.
- Document read-scope contract tests.

### Business Value Protected

RENOZ paperwork is operational evidence for customers, warehouse dispatch, finance, and warranty/support follow-up. Generated documents should not depend on parent scope alone when collecting line items or serial evidence.

### Scope Constraints

- Do not change PDF templates, visible document UI, storage paths, generated document metadata, query keys, cache invalidation, mutation behavior, finance calculations, shipment finalization, or warranty entitlement generation.
- Keep this as a document read-scope hardening slice, not a document system refactor.

### Changes

- Added `organizationId` to `fetchShipmentSerialsByOrderLineItem` and scoped canonical shipment serial reads by order shipment, shipment item, shipment item serial, and serialized item organization.
- Scoped legacy shipment item serial fallback reads by order shipment and shipment item organization.
- Added `organizationId` to `fetchAllocatedSerialsByOrderLineItem` and scoped allocation fallback reads by allocation and serialized item organization.
- Passed `ctx.organizationId` through synchronous document generation serial helpers.
- Passed `organizationId` through background packing slip and delivery note serial helpers.
- Scoped synchronous order line reads by order id and organization id.
- Scoped shipment-backed document shipment item reads by shipment id, shipment item organization, line item organization, and shipment order id.
- Scoped shipment-backed line quantity readiness reads by line item ids, organization id, and order id.
- Scoped background quote, invoice, packing slip, and delivery note line item reads by order id and organization id.
- Added `document-generation-read-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: document generation read hardening stays in Documents server functions and Trigger document jobs.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked order document surfaces through document action handlers/tasks, document generation functions, order/shipment/serial tables, and existing generated-document cache surfaces.
- Tenant isolation/data integrity: improved. Document child reads now carry organization scope at the query point.
- Transactional inventory and finance integrity: protected at the document evidence boundary. This slice does not change inventory or finance writes.
- Serialized lineage continuity: improved for generated operational documents by requiring organization-scoped shipped/allocation serial evidence.
- Honest UI states/operator-safe errors: unchanged at the UI layer; failed or missing scoped data still follows existing document error behavior.
- Reviewability: bounded diff across document read helpers, document generation callers, Trigger PDF jobs, one source contract test, and this closeout.

### Smells Removed

- Document line item reads by order id only.
- Shipment serial document helper without tenant input.
- Shipped serial fallback reads by shipment order id only.
- Allocation serial fallback reads by line ids and active flag only.
- Shipment-backed document item reads by shipment id only.
- Shipment-backed line quantity readiness reads by line ids only.

### Deferred

- Runtime DB-backed document generation integration tests remain a future hardening slice.
- Preview-only document flows and project/service/warranty PDF jobs remain separate document-domain reviews.
- Browser QA remains deferred because this slice does not change visible UI behavior.
- Full PDF artifact visual verification remains deferred because templates and rendering output were not changed.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/render-contracts.test.ts tests/unit/documents/builders.test.ts tests/unit/documents/serial-number-summary.test.ts tests/unit/orders/order-document-surfaces.test.tsx tests/unit/orders/order-document-action-feedback-contract.test.ts` - 6 files, 18 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, shared route contracts, financial calculations, release packaging, deployment paths, or PDF templates/rendered layout.

### Goal Adaptation

Accepted. Added a dedicated Documents maintainer closeout path for document-generation stewardship instead of filing document read-scope work under Orders or Operations.

### Residual Risk

Low for document generation child-read tenant scope in the touched order, shipment, and serial paths. Moderate for broader document generation quality because current evidence is source-level contract coverage plus adjacent document render/surface tests, not DB-backed end-to-end PDF generation.
