# Pipeline Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Detail Send Quote Bypassed The Pipeline Quote Formatter

### Problem

Pipeline Sprint 2 cleaned the quote detail action feedback path, but the opportunity detail composite hook still sent quotes through the same `useSendQuote` mutation while surfacing raw `result.error` and thrown `error.message` copy. That left the main opportunity screen inconsistent with the dedicated quote detail screen for the same business action.

### Workflow Spine

Opportunity detail send quote action
-> `useOpportunityDetail`
-> `useSendQuote`
-> quote send server function
-> pipeline/document/activity cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline opportunity detail action feedback.
- Pipeline quote mutation error formatter usage.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators often send quotes from the opportunity detail view while working a deal. The same quote-send failure should produce the same safe, useful feedback regardless of whether the action starts from quote detail or opportunity detail.

### Scope Constraints

- Do not change opportunity detail route behavior, quote selection, customer email validation, quote send server behavior, document/email generation, stage bump behavior, schemas, database predicates, query keys, cache invalidation, activity logging, or success copy.
- Keep this as opportunity detail quote-send feedback only; other opportunity actions need separate slices.

### Changes

- Imported `formatPipelineQuoteMutationError` into `useOpportunityDetail`.
- Routed unsuccessful quote-send result payloads through the Pipeline quote formatter.
- Routed thrown quote-send failures through the same formatter.
- Extended the Pipeline quote feedback source contract to cover both quote detail and opportunity detail send-quote entry points.

### Standards Checked

- Domain ownership: quote-send feedback uses the Pipeline quote formatter from both live entry points.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the opportunity detail route/container into `useOpportunityDetail` and `useSendQuote`; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; `useSendQuote` invalidation remains covered by Pipeline Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for opportunity detail quote-send failures.
- Reviewability: bounded diff across one hook, one focused test, and this closeout.

### Smells Removed

- Raw `result.error` quote-send toast in the opportunity detail composite hook.
- Raw thrown `error.message` quote-send toast in the opportunity detail composite hook.
- Inconsistent feedback ownership between quote detail and opportunity detail for the same send-quote mutation.

### Deferred

- Opportunity delete, stage update, update, convert-to-order, kanban/list mutations, quote builder save, quote tab save/PDF, activity scheduling, and quote restore/PDF preview feedback remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned operator-safe errors, mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for opportunity detail quote-send feedback. Moderate across Pipeline because several non-quote and quote-builder action surfaces still have raw or generic feedback and should be handled in separate domain slices.
