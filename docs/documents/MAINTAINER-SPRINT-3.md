# Documents Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Project Document Reads Prove Active Tenant Scope

### Problem

Project document generation fetched the parent project by id and organization, but did not exclude soft-deleted projects. Work-order material reads then fetched `jobMaterials` by project id only and joined products by product id only.

Project PDFs are customer-facing operational documents. They should not be generated from deleted projects, and material/product evidence should carry tenant and active-product scope at the query point.

### Workflow Spine

Project document action
-> `generateProjectDocument`
-> tenant-scoped active project read
-> tenant-scoped customer read
-> tenant/product-scoped project material read
-> PDF template render
-> generated document storage/upsert
-> project activity log.

### Touched Domains

- Documents project generation.
- Jobs/projects read evidence for document generation.
- Products material evidence for work-order PDFs.
- Project document read-scope contract tests.

### Business Value Protected

Work orders, completion certificates, and handover packs can be handed to customers or technicians. Those documents should reflect active RENOZ projects and tenant-owned material/product data only.

### Scope Constraints

- Do not change project document templates, storage paths, generated document metadata, project hooks, job query keys, cache invalidation, project mutation behavior, product mutation behavior, or visible UI.
- Keep this as a project document read-scope slice, not a jobs/products refactor.

### Changes

- Required `isNull(projects.deletedAt)` when loading a project for document generation.
- Added `organizationId` to `fetchProjectMaterials`.
- Scoped project material reads by project id and job material organization.
- Scoped joined product rows by product organization and active product state.
- Passed `ctx.organizationId` through the project material document helper.
- Added `project-document-read-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: document-generation-specific project reads stay in the Documents project document server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked project document generation hook/function flow, project/customer/material/product tables, generated document upsert, and existing project document cache surface; no query-key or cache contract changed.
- Tenant isolation/data integrity: improved. Project materials and products now prove tenant scope locally for generated PDFs.
- Transactional inventory and finance integrity: unchanged; this slice only hardens document read evidence.
- Serialized lineage continuity: unchanged; no serial identity or lineage path changed.
- Honest UI states/operator-safe errors: improved at the data boundary by treating deleted projects as not found for document generation.
- Reviewability: bounded diff across one project document server function, one source contract test, and this closeout.

### Smells Removed

- Project document generation from soft-deleted projects.
- Work-order material reads by project id only.
- Product join for work-order materials without tenant or active-product evidence.

### Deferred

- Runtime DB-backed project document generation tests remain a future hardening slice.
- Visual PDF verification remains deferred because templates/renderers were not changed.
- Jobs/products server function read contracts remain separate domain reviews.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/project-document-read-scope-contract.test.ts tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/document-preview-contract.test.ts tests/unit/documents/render-contracts.test.ts tests/unit/documents/builders.test.ts tests/unit/jobs/project-active-record-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts` - 7 files, 18 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, financial calculations, release packaging, deployment paths, or PDF renderer structure.

### Goal Adaptation

Declined. The dedicated Documents maintainer path already covers this project-document slice.

### Residual Risk

Low for active project and material/product tenant scope in project document generation. Moderate for broader project document generation quality because evidence is source-level contract coverage plus adjacent document/jobs tests, not DB-backed end-to-end PDF generation.
