# Activity Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Entity Activity Logging Mutation Feedback

### Problem

`useEntityActivityLogging` showed raw mutation failure messages when entity activity logging failed, with a generic `Failed to log activity` fallback. That left a shared operator workflow able to expose infrastructure strings such as database constraint failures instead of safe, domain-owned feedback.

### Workflow Spine

Entity detail views
-> `useEntityActivityLogging`
-> `EntityActivityLogger` submit
-> `useLogEntityActivity`
-> `logEntityActivity` server function
-> activity and unified-activity cache invalidation
-> operator-safe mutation toast.

### Touched Domains

- Shared entity activity logging mutation feedback.
- Activity mutation error formatting.
- Activity logging cache-invalidation contract tests.

### Business Value Protected

Operators use activity logging to record notes, calls, meetings, follow-ups, and other operational context across customers, orders, service systems, support, warranty, and adjacent workflows. Logging failures should tell the operator what to do next without leaking database, Supabase, or internal error details.

### Scope Constraints

- Do not change activity server functions, schemas, mutation payloads, success toasts, or dialog failure state.
- Do not change `useLogEntityActivity` mutation behavior or cache invalidation policy.
- Do not broaden into activity export feedback or analytics widgets.
- Do not reopen serialized gates as routine evidence for this activity feedback slice.

### Changes

- Added `ACTIVITY_MUTATION_MESSAGES` and `formatActivityMutationError(error, action)` in `src/lib/activities/mutation-error-messages.ts`.
- Exported the mutation formatter from `src/lib/activities/index.ts`.
- Routed `useEntityActivityLogging` failure toasts through `formatActivityMutationError(error, 'logEntity')`.
- Preserved the existing rethrow behavior so the dialog can keep its failure state and entered values.
- Added formatter tests and a source contract that pins the safe toast path and the existing activity invalidation contract.

### Standards Checked

- Domain ownership: activity mutation copy now lives in `src/lib/activities/mutation-error-messages.ts`.
- Route -> container/page -> hook -> server flow: detail surfaces still use the logging hook; the hook owns the operator toast; `useLogEntityActivity` still owns mutation/cache behavior; server functions are unchanged.
- Query/cache policy: entity activity, unified entity activity, unified entity audit-with-related, and feed invalidations are unchanged.
- Tenant isolation/data integrity: no server function, schema, RLS predicate, mutation payload, or transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: unsafe infrastructure messages now fall back to activity-owned unavailable copy, while safe validation and known authorization/not-found messages remain usable.
- Reviewability: the diff is limited to one activity helper, one hook call site, focused tests, and this closeout note.

### Smells Removed

- Raw `error.message` activity logging toast.
- Generic `Failed to log activity` fallback copy.
- Missing mutation-side activity formatter next to the existing activity read-state formatter.
- Unpinned cache-invalidation expectations for the activity logging feedback path.

### Deferred

- Activity export mutation feedback remains a separate candidate if it exposes raw or generic errors.
- Activity analytics widgets may need their own read-state and empty-state review.
- A cross-domain mutation error abstraction remains deferred until at least one more domain proves the activity/service/warranty patterns should be unified.
- Browser QA was not selected because this was source-covered toast/error wiring with no layout or interaction structure change.

### Gates

- Passed: focused activity mutation/logging contracts, `./node_modules/.bin/vitest run tests/unit/activities/activity-mutation-error-messages.test.ts tests/unit/activities/activity-mutation-feedback-contract.test.ts tests/unit/activities/use-entity-activity-logging.test.tsx tests/unit/activities/use-quick-log-invalidation.test.ts` - 4 files, 7 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/activities` - 16 files, 41 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `formatActivityMutationError`, `ACTIVITY_MUTATION_MESSAGES`, removed raw logging failure copy, preserved activity logging invalidations, and unsafe database-message fallback coverage.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered error feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Adapted execution, not objective. Serialized gates are retired from routine closeout because that workstream is complete; the maintainer goal still applies through domain ownership, operator-safe errors, meaningful tests, and risk-selected evidence.

### Residual Risk

This slice is covered by formatter tests, hook behavior tests, and source contracts rather than a live API rejection payload or browser interaction. Unsupported backend error shapes intentionally fall back to the activity-owned unavailable message.
