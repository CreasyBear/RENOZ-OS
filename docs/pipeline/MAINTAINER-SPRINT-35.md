# Pipeline Maintainer Sprint 35

## Status

Closed in commit-ready state.

## Issue 1: Quote Document Mutations Had Unnamed Cache Refresh Policies

### Problem

`useGenerateQuotePdf` and `useSendQuote` both carried important cache refresh policy inline in their success handlers. Those policies touch documents, Pipeline quote state, activities, opportunity lists, and broad Pipeline refresh, so they should be named and source-covered rather than embedded in UI-adjacent mutation callbacks.

### Workflow Spine

Quote document mutation
-> quote server function
-> quote mutation hook success handler
-> named generated-PDF or sent-quote cache refresh contract
-> document, Pipeline, quote version, opportunity list, and activity views.

### Touched Domains

- Pipeline quote mutation hooks.
- Pipeline quote mutation cache contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Generated PDFs and sent quotes are commercial artifacts. Operators need quote PDFs, document history, activity timelines, opportunity lists, and Pipeline views to stay coherent after those actions.

### Scope Constraints

- Do not change quote PDF or send server behavior, mutation inputs/outputs, query key definitions, cache invalidation breadth, UI rendering, routing, or operator-facing feedback.
- Keep this as a local quote mutation cache-policy cleanup.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Added `invalidateGeneratedQuotePdfCaches(queryClient, quoteVersionId)`.
- Added `invalidateSentQuoteCaches(queryClient, opportunityId)`.
- Replaced inline generate-PDF and send invalidations with the named helpers.
- Updated the focused quote mutation cache contract to protect those cache policies.

### Standards Checked

- Domain ownership: quote document mutation cache policy is now named inside the quote mutation hook module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook cache policy improved; server functions, schemas, database writes, query keys, route, and UI stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, transaction, inventory, or finance path touched.
- Query/cache contract: preserved generated PDF and sent quote invalidation breadth.
- Honest UI states/operator-safe errors: unchanged; mutation feedback stayed formatter-driven.
- Reviewability: bounded diff across one hook, one source contract, and this closeout.

### Smells Removed

- Inline generated-PDF invalidation group.
- Inline sent-quote document/activity invalidation group.
- Missing source contract for quote document mutation cache policy ownership.

### Deferred

- `quote-versions.tsx` still owns several quote workflows and remains a candidate for future focused extraction.
- Browser QA remains deferred because this source-covered slice changes cache-policy structure, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for generated-PDF and sent-quote invalidation helper ownership.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers clear cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote document mutation cache policy. Moderate for the broader quote server module because PDF generation and send server behavior remain large workflows that were intentionally not decomposed in this slice.
