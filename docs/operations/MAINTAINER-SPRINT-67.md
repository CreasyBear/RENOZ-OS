# Operations Maintainer Sprint 67: Project BOM Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Project BOM Item Mutations Had Weak Tenant Scope And Unsafe Feedback

### Problem

The project BOM workflow is a core materials/procurement surface, but item mutations accepted item or BOM ids without carrying the route project boundary through the hook and server contracts. Add/update/remove/bulk-status paths could also mutate by id without explicit organization and project predicates, batch operations could report success after partial stale/cross-project matches, and live BOM controls still used generic or raw operator error feedback.

### Workflow Spine

Jobs project BOM workflow
-> `ProjectBomTab`, `AddBomItemDialog`, `EditBomItemDialog`, `BulkStatusDialog`, `BomAddItemDialog`
-> `useProjectBom`, `useCreateProjectBom`, `useAddBomItem`, `useUpdateBomItem`, `useRemoveBomItem`, `useRemoveBomItems`, `useUpdateBomItemsStatus`, `useImportBomFromCsv`, `useImportBomFromOrder`
-> `getProjectBom`, `createProjectBom`, `addBomItem`, `updateBomItem`, `removeBomItem`, `removeBomItems`, `updateBomItemsStatus`, import functions
-> `projectBom`, `projectBomItems`, `products`, `projects`
-> `queryKeys.projects.bom` and `queryKeys.projects.alerts`
-> tenant- and project-scoped BOM reads and writes with safe mutation feedback.

### Touched Domains

- Jobs project BOM UI and dialogs.
- Jobs project BOM TanStack Query hooks.
- Project BOM server functions.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

BOMs drive material planning, ordering, receiving, allocation, installation progress, and cost visibility for RENOZ Energy battery OEM workflows. This slice makes the materials workflow safer across tenants and projects while giving operators safer failure feedback.

### Scope Constraints

- Do not change the BOM read unavailable-state behavior, table layout, product search UX, CSV parser semantics, or query key shape.
- Keep cache invalidation on project BOM and project alert keys.
- Keep the slice limited to BOM item mutation feedback, route project scope propagation, server predicates, and batch stale-id handling.
- Defer inventory allocation/receiving semantics because this slice does not touch stock movements.

### Changes

- Added `formatProjectBomMutationError` with action-specific create/add/update/remove/status/import fallbacks and safe server-code messages.
- Exported the project BOM mutation formatter through the jobs hook barrel.
- Replaced generic/raw BOM mutation feedback in `ProjectBomTab`.
- Replaced raw add-item dialog feedback in `BomAddItemDialog`.
- Updated BOM item hooks to inject route `projectId` into add/update/remove/bulk-status server calls.
- Scoped BOM read item collection to BOM id, project id, and organization id.
- Scoped product joins in BOM reads to the current organization.
- Verified project ownership before BOM creation.
- Converted duplicate BOM creation to `ConflictError`.
- Scoped add-item BOM lookup to BOM id, project id, and organization id.
- Verified added products belong to the current organization.
- Scoped update/remove item final writes to item id, project id, and organization id.
- Made single-item removals fail on stale/cross-project ids.
- Made bulk remove and bulk status updates transactional and fail on stale/cross-project item ids.
- Added focused contract coverage for safe feedback, project scope propagation, cache invalidation, read predicates, product tenant scope, final write predicates, and batch stale-id handling.

### Standards Checked

- Domain ownership: BOM mutation concerns remain inside jobs BOM UI, hooks, and server functions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for BOM create/add/update/remove/status/import paths.
- Tenant isolation/data integrity: strengthened. Item reads/writes now include organization and project predicates, and product references are organization-scoped.
- Safe mutation/cache contracts: strengthened. Mutations retain BOM and project-alert invalidation and now use safe operator messages.
- Honest UI states: read degraded-state behavior preserved; mutation failure feedback is safer.
- Transactional inventory and finance integrity: inventory/finance writes were not touched; BOM item batch writes now use transactions where partial success would be misleading.
- Reviewability: the diff is limited to BOM mutation contracts, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- BOM item update by item id only.
- BOM item delete by item id only.
- Bulk BOM item remove/status loops that could silently skip stale or cross-project ids.
- Add-item BOM lookup without organization/project predicates.
- Product reference acceptance without organization verification.
- BOM item reads by BOM id only.
- Generic/raw BOM mutation failure feedback.
- Duplicate BOM creation as an untyped generic error.

### Deferred

- CSV and order imports still deserve a deeper product-rule review around duplicate items, existing BOM reconciliation, and cost policy.
- Physical inventory allocation, receiving, and installed quantity integrity remain separate materials/inventory workflow slices.
- BOM edit UX polish and material allocation to workstreams/site visits remain separate product slices.

### Gates

- Passed: `bun test tests/unit/jobs/project-bom-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-bom-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx` - 2 files, 7 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a focused project BOM mutation contract change covered by targeted tests plus type/lint gates.
- Skipped: browser QA because no layout or successful material workflow interaction changed; route project propagation and server predicates are covered by focused tests.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, safe mutation/cache contracts, tenant isolation, data integrity, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Medium. BOM mutation contracts are safer, but import reconciliation and true inventory/finance effects remain business-critical follow-up slices rather than incidental changes in this sprint.
