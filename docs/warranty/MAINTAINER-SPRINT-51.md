# Warranty Maintainer Sprint 51

## Status

Closed in commit-ready state.

## Issue 1: Warranty List Read-State Copy

### Problem

The warranty list container already normalizes list-read failures through `useWarranties`, but the table presenter rendered `error.message` directly in its blocking error state. A warranty list outage could therefore expose database or infrastructure phrasing on a core battery warranty surface.

### Workflow Spine

Warranty list route
-> `WarrantyListContainer`
-> `WarrantyListTable`
-> `useWarranties`
-> `listWarranties`
-> warranty schemas and database records
-> centralized warranty list query key
-> normalized read-query error
-> warranty-owned read-state formatter
-> operator-safe warranty list copy.

### Touched Domains

- Warranty list table read-state UI.
- Warranty read-error source contract test.
- Warranty list runtime read-state test.
- Warranty maintainer closeout docs.

### Business Value Protected

Warranty lists are the operator entry point for battery entitlement, certificate, transfer, void, and support follow-up work. When the list cannot load, operators need clear recovery copy without database or provider details.

### Scope Constraints

- Do not change warranty list filtering, sorting, pagination, selection, row actions, transfer/void behavior, query keys, cache policy, server functions, tenant predicates, schemas, or table columns.
- Keep this as warranty list read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed warranty list table error copy through `formatWarrantyReadError`.
- Extended warranty read-error source coverage so the list table remains behind the warranty formatter.
- Added runtime table coverage proving backend-shaped list failures do not render.

### Standards Checked

- Domain ownership: warranty list read-state copy now uses the warranty read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the table display boundary after the existing list read fails.
- Query/cache policy: unchanged. Warranty list query keys and pagination/filter cache behavior were not changed.
- Tenant isolation/data integrity: unchanged. Warranty list reads still flow through existing server functions and tenant predicates.
- Serialized lineage/inventory/finance: unchanged. This is display-only error handling.
- UI states/error handling: strengthened. The blocking warranty list error no longer renders raw read error text.
- Reviewability: the diff is limited to one formatter call site, one source contract addition, one runtime test, and this closeout note.

### Smells Removed

- Direct `message={error.message}` rendering in the warranty list table.
- Missing runtime coverage for operator-safe warranty list read failures.

### Deferred

- Warranty entitlement review dialog copy remains a separate slice because it has different review-dialog data and activation context.
- Other non-warranty raw error surfaces remain separate domain slices.
- Browser QA was not run because this is read-state copy behavior with no intended layout change.

### Gates

- Passed: focused warranty read-error and list table read-state tests, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-read-error-messages.test.ts tests/unit/warranty/warranty-list-table-read-state.test.tsx tests/unit/warranty/query-normalization-wave3.test.tsx` - 3 files, 8 tests.
- Passed: broader warranty suite, `./node_modules/.bin/vitest run tests/unit/warranty` - 49 files, 152 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader warranty suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, warranty domain ownership, query/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for warranty list read-state copy. Remaining warranty raw-error risk should be handled through separate entitlement review, mutation feedback, or certificate/report-specific slices rather than expanding this table patch.
