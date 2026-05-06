# Warranty Maintainer Sprint 54

## Status

Closed in commit-ready state.

## Issue 1: Warranty Bulk Import Row Result Feedback

### Problem

Warranty bulk registration already had safe hook-level mutation toasts, but the server-side per-row result path still persisted `err.message` into `failed[]` rows. A registration row can fail inside the warranty creation transaction, serialized item lookup, lineage event write, or database insert. Those failures are shown back to operators in the import dialog, so row-result copy needs its own server-side safety boundary.

### Workflow Spine

Warranty import settings route
-> bulk import dialog
-> `useBulkRegisterWarranties`
-> `bulkRegisterWarrantiesFromCsv`
-> per-row warranty registration transaction
-> optional serialized item resolution and `warranty_registered` lineage event
-> `failed[]` row result
-> operator import result review and retry decision.

### Touched Domains

- Warranty bulk import server result feedback.
- Warranty serialized bulk-import row failure feedback.
- Warranty bulk import source tests.
- Warranty maintainer closeout docs.

### Business Value Protected

Bulk warranty import lets RENOZ register coverage for battery products at scale. Operators need row-level repair guidance when a serial-backed warranty cannot be imported, without seeing database, stack, or JavaScript implementation details in the import result table.

### Scope Constraints

- Do not change CSV parsing, preview validation, warranty creation, warranty item creation, warranty numbering, serialized item lookup behavior, lineage event behavior, notification behavior, schemas, query keys, cache invalidation, hook mutation feedback, or dialog rendering.
- Preserve the existing row failure shape: `{ rowIndex, error }`.
- Preserve the serial-backed import invariant: rows with serial numbers must resolve a canonical serialized item before importing.
- Change only the message formatter used before storing a per-row failure result.

### Changes

- Added `formatWarrantyBulkImportRowFailure` beside the warranty bulk import server function.
- Mapped unsafe, unknown, database-shaped, SQL-shaped, JavaScript runtime, and stack-shaped row failures to stable import-row fallback copy.
- Preserved operator-actionable serialized-item repair guidance for safe validation failures.
- Routed the bulk registration row catch path through the formatter.
- Added focused tests for serialized row guidance, unsafe fallback behavior, and source wiring.

### Standards Checked

- Domain ownership: warranty bulk import row-result copy is now owned by a workflow-local server helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only server result-message formatting after an existing row transaction fails.
- Query/cache policy: unchanged. Bulk import hook invalidation and warranty query keys were not changed.
- Tenant isolation/data integrity: unchanged. Organization predicates, row transactions, warranty inserts, warranty item inserts, serialized lookup, lineage event writes, notification dispatch, and result shapes are unchanged.
- Serialized lineage continuity: preserved. Serial-backed rows still fail if canonical serialized items cannot be resolved; this sprint only makes that failure copy safe.
- UI states/error handling: strengthened. Import result rows no longer display raw caught error messages.
- Reviewability: one helper, one catch-path call-site change, focused tests, and this closeout note.

### Smells Removed

- Raw `err.message` row-result pass-through in warranty bulk registration.
- `Unknown error` fallback in operator-visible import row failures.
- Missing source contract for server-side bulk import row-result feedback.

### Deferred

- Browser QA was deferred because this is server result-copy behavior with no intended layout change.
- Broader import preview validation copy was not changed; it already returns explicit row validation errors before registration.
- Other server-side row-result workflows outside warranty remain separate domain slices.

### Gates

- Passed: focused warranty bulk import result set, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-bulk-import-result-feedback.test.ts tests/unit/warranty/warranty-bulk-import-serialization.test.ts tests/unit/warranty/warranty-bulk-import-dialog-action-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts` - 4 files, 15 tests.
- Passed: broader warranty suite, `./node_modules/.bin/vitest run tests/unit/warranty` - 51 files, 156 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Declined. The current maintainer process already supports focused evidence for serial-lineage-adjacent slices without reviving retired gate packs.

### Residual Risk

Low for warranty bulk import row-result feedback. Moderate for other import/result workflows because they may still have independent server-side result-message policies.
