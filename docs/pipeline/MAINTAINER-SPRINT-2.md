# Pipeline Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Quote Detail Actions Surfaced Raw Mutation Errors

### Problem

The quote detail container displayed raw thrown mutation messages for PDF generation, quote sending, and quote deletion. Those actions sit directly in the sales workflow and can fail from validation, permission, stale state, email, document, or backend errors. Operators should see actionable recovery copy, not SQL, runtime, or infrastructure details.

### Workflow Spine

Quote detail action
-> `QuoteDetailContainer`
-> quote mutation hook
-> quote server function
-> pipeline/documents/activity cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quote detail action feedback.
- Pipeline mutation error formatting.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quotes are the customer-facing bridge from opportunity to order. PDF generation, send, and delete failures now preserve operator confidence and reduce support friction by naming the failed action while suppressing implementation details.

### Scope Constraints

- Do not change quote route behavior, quote server functions, email sending, document generation, schemas, database predicates, query keys, cache invalidation, opportunity stage updates, activity logging, or visible success states.
- Keep this to quote detail mutation feedback. Broader Pipeline raw-error cleanup should remain domain-sliced.

### Changes

- Added `formatPipelineQuoteMutationError` in `src/hooks/pipeline/_mutation-errors.ts`.
- Exported the formatter from the Pipeline hooks barrel.
- Routed quote detail PDF, send-result, send-throw, and delete failures through the formatter.
- Added focused formatter and source-contract coverage for quote detail action feedback.

### Standards Checked

- Domain ownership: quote mutation feedback now lives in the Pipeline hook layer instead of local raw-message branches.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the quote detail action path through mutation feedback; route, server, schema, database, query keys, and cache policy were intentionally unchanged.
- Tenant isolation/data integrity: unchanged; no server functions, predicates, schemas, or write paths touched.
- Query/cache contract: unchanged; quote send/PDF invalidation remains covered by Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quote PDF generation, sending, and deletion failures.
- Reviewability: bounded diff across one formatter, one container import/use site, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` quote action toasts in the live quote detail container.
- Generic `Failed to ...` fallback strings for quote detail thrown failures.
- Missing Pipeline-owned formatter contract for quote action feedback.

### Deferred

- Other Pipeline raw-error surfaces remain separate workflow slices, including opportunity quote tabs, quote builder/dialog flows, quick opportunity dialogs, and kanban/list mutation feedback.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for quote detail action feedback. Moderate across the broader Pipeline domain because other quote and opportunity mutation surfaces may still expose raw or inconsistent feedback and should be cleaned in separate sprints.
