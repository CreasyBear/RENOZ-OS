# Pipeline Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Quote Mutation Test Drifted From Centralized Query Keys

### Problem

`tests/unit/pipeline/use-quote-mutations.test.tsx` asserted literal query key arrays for quote send and quote PDF invalidation. After the Documents Sprint 7 prefix fix, the test still expected the old sentinel-terminated document history key even though the production hook used `queryKeys.documents.history(...)`.

That made a focused Pipeline test fail and, worse, encoded a stale cache contract in a quote workflow test.

### Workflow Spine

Quote detail / opportunity quote send
-> `useSendQuote`
-> quote server mutation
-> centralized pipeline, opportunity, document, and activity query keys
-> quote version, opportunity, document history, and activity surfaces refresh.

Quote PDF generation
-> `useGenerateQuotePdf`
-> quote PDF server mutation
-> centralized document and pipeline query keys
-> quote PDF/document state refresh.

### Touched Domains

- Pipeline quote mutation tests.
- Pipeline quote send cache contract evidence.
- Document history query-key contract consumer evidence.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quotes are the sales-to-order bridge. Sending a quote should refresh the opportunity, quote history, generated document history, and activity surfaces. The test that protects that workflow should follow the centralized cache contract rather than hard-coded stale arrays.

### Scope Constraints

- Do not change quote server functions, quote mutation hooks, document generation, email sending, opportunity stage behavior, activity logging, visible UI, or route behavior.
- Keep this as a test/contract alignment slice after the query-key architecture change.

### Changes

- Imported `queryKeys` into `use-quote-mutations.test.tsx`.
- Replaced literal pipeline, opportunities, documents, and activity query key expectations with centralized `queryKeys` calls.
- Added missing assertions for infinite opportunity list and opportunity activity invalidation.
- Updated the document history expectation to the current prefix-safe `queryKeys.documents.history('opportunity', opportunityId)` shape.

### Standards Checked

- Domain ownership: Pipeline quote mutation evidence now references centralized domain query keys instead of local literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked quote send/PDF mutation hooks through query key invalidation surfaces.
- Tenant isolation/data integrity: unchanged; no server functions, schemas, database predicates, or write behavior touched.
- Query/cache contract: improved test fidelity. The test now protects the current centralized query-key contract instead of a stale literal shape.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or inventory serialization path touched.
- Honest UI states/operator-safe errors: unchanged; this slice does not alter UI feedback.
- Reviewability: bounded diff across one focused test and this closeout.

### Smells Removed

- Literal query key arrays in a Pipeline mutation contract test.
- Stale document history key expectation with an empty string sentinel.
- Missing test expectation for activity invalidation after quote send.

### Deferred

- Raw quote/pipeline operator error formatting remains a separate follow-up slice.
- Browser QA remains deferred because this slice changes test contract alignment only.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Failed before fix: `bun run test:vitest tests/unit/pipeline/use-quote-mutations.test.tsx` failed on the stale document history key.
- Passed after fix: `bun run test:vitest tests/unit/pipeline/use-quote-mutations.test.tsx`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, financial calculations, document generation behavior, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers meaningful tests, centralized query keys, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for quote mutation invalidation evidence. Broader Pipeline operator-safe error formatting remains a visible follow-up risk and was intentionally not mixed into this test-alignment slice.
