# Warranty Maintainer Sprint 52

## Status

Closed in commit-ready state.

## Issue 1: Warranty Entitlement Review Read-State Copy

### Problem

The warranty entitlement review dialog loaded entitlement detail data through a normalized read hook, but its dialog error state rendered `error.message` directly. A failed entitlement review could expose database or infrastructure wording while an operator is inspecting delivery-backed warranty coverage.

### Workflow Spine

Warranty entitlement queue
-> `WarrantyEntitlementReviewDialog`
-> `useWarrantyEntitlement`
-> `getWarrantyEntitlement`
-> entitlement schemas and database records
-> centralized warranty entitlement detail query key
-> normalized detail read error
-> warranty-owned read-state formatter
-> operator-safe entitlement review copy.

### Touched Domains

- Warranty entitlement review dialog read-state UI.
- Warranty read-error source contract test.
- Warranty entitlement review runtime read-state test.
- Warranty maintainer closeout docs.

### Business Value Protected

Delivery-backed warranty entitlements preserve coverage before activation. When a review record cannot load, operators need a clear recovery instruction without backend details so they can safely retry or return to the queue.

### Scope Constraints

- Do not change entitlement activation, review status badges, commercial/source display, warranty links, query keys, cache policy, server functions, tenant predicates, schemas, or activation mutation behavior.
- Keep this as entitlement review detail read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed entitlement review dialog error copy through `formatWarrantyReadError`.
- Extended warranty read-error source coverage so the dialog remains behind the warranty formatter.
- Added runtime dialog coverage proving backend-shaped entitlement detail failures do not render.

### Standards Checked

- Domain ownership: entitlement review read-state copy now uses the warranty read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the dialog display boundary after the existing detail read fails.
- Query/cache policy: unchanged. Warranty entitlement detail query keys and stale-time behavior were not changed.
- Tenant isolation/data integrity: unchanged. Entitlement detail reads still flow through existing server functions and tenant predicates.
- Serialized lineage/inventory/finance: unchanged. This is display-only error handling around delivery-backed coverage review.
- UI states/error handling: strengthened. The dialog no longer renders raw detail read error text.
- Reviewability: the diff is limited to one formatter call site, one source contract addition, one runtime test, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in the warranty entitlement review dialog.
- Missing runtime coverage for operator-safe entitlement detail read failures.

### Deferred

- Other non-warranty raw error surfaces remain separate domain slices.
- Browser QA was not run because this is read-state copy behavior with no intended layout change.

### Gates

- Passed: focused warranty read-error and entitlement review read-state tests, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-read-error-messages.test.ts tests/unit/warranty/warranty-entitlement-review-dialog-read-state.test.tsx` - 2 files, 3 tests.
- Passed: broader warranty suite, `./node_modules/.bin/vitest run tests/unit/warranty` - 50 files, 153 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader warranty suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, warranty domain ownership, query/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for entitlement review read-state copy. Remaining warranty raw-error risk appears concentrated in formatter internals and operator-safe partial-failure messages, not this dialog display boundary.
