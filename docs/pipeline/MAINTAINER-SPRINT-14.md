# Pipeline Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Activity And Follow-Up Mutations Used Local Generic Failure Copy

### Problem

Pipeline activity surfaces still used local generic failure toasts for logging activities, scheduling follow-ups, and completing activities. These actions are part of the opportunity operating loop and should follow the same domain-owned formatter pattern as quote and opportunity mutations.

### Workflow Spine

Opportunity activity surface
-> activity logger, follow-up scheduler, timeline container, or opportunity detail container
-> activity mutation hook
-> pipeline activity server function
-> activity/follow-up/opportunity query invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline activity mutation feedback.
- Pipeline activity formatter action map.
- Pipeline activity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Activities and follow-ups are how RENOZ operators keep sales work moving. Failures should name the action that could not complete and avoid exposing database or runtime details.

### Scope Constraints

- Do not change activity payloads, follow-up scheduling behavior, completion behavior, server functions, schemas, database predicates, query keys, cache invalidation, success copy, or read-state copy.
- Keep this as activity mutation feedback only. Follow-up read-state copy and broader activity UI cleanup remain separate slices.

### Changes

- Added `formatPipelineActivityMutationError` with `log`, `scheduleFollowUp`, and `complete` action fallbacks.
- Exported the activity formatter from the Pipeline hooks barrel.
- Routed activity logger failures through the formatter.
- Routed follow-up schedule and complete failures through the formatter.
- Routed activity completion failures in the activity timeline and opportunity detail containers through the formatter.
- Added a focused activity mutation feedback contract test.

### Standards Checked

- Domain ownership: activity mutation feedback now uses the Pipeline activity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked activity UI surfaces -> activity mutation hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; activity/follow-up/opportunity invalidation stayed in existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for activity log, follow-up schedule, and activity completion failures.
- Reviewability: bounded diff across one formatter, four activity consumers, one focused test, and this closeout.

### Smells Removed

- Local generic activity log failure toast.
- Local generic follow-up schedule failure toast.
- Local generic follow-up/activity completion failure toasts across activity timeline and opportunity detail surfaces.

### Deferred

- Follow-up read-state copy, quote quick-form feedback, and broader activity UI state cleanup remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/activity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts` - 3 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for activity mutation feedback. Moderate across Pipeline because follow-up read-state copy, quote quick-form feedback, and read-state copy remain separate bounded cleanup candidates.
