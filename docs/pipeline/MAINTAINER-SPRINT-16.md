# Pipeline Maintainer Sprint 16

## Status

Closed in commit-ready state.

## Issue 1: Follow-Up Scheduler Read State Used Local Failed-Load Copy

### Problem

`FollowUpScheduler` still displayed local `Failed to load follow-ups.` copy for read failures. The activities domain already has `ACTIVITY_READ_MESSAGES` and `formatActivityReadError`, so follow-up read-state copy should live in that shared activity read-state contract instead of being hardcoded in the Pipeline component.

### Workflow Spine

Opportunity follow-up scheduler
-> `useFollowUps`
-> pipeline follow-up read query
-> activity read-state formatter
-> operator-safe unavailable copy.

### Touched Domains

- Pipeline follow-up scheduler read state.
- Shared activity read-error messages.
- Activity read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Follow-ups drive opportunity recovery and sales momentum. When the follow-up read path fails, operators should see recoverable unavailable copy instead of a dead-end failed-load message.

### Scope Constraints

- Do not change follow-up query hooks, server functions, schemas, database predicates, query keys, cache policy, scheduling/completion mutations, loading state, or empty state.
- Keep this as follow-up read-state copy only. Other Pipeline read states remain separate slices.

### Changes

- Added `ACTIVITY_READ_MESSAGES.followUps`.
- Routed `FollowUpScheduler` read failures through `formatActivityReadError`.
- Extended activity read-error and read-state contracts to cover follow-up read copy and source wiring.

### Standards Checked

- Domain ownership: follow-up read-state copy now lives in the shared activity read-error module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked follow-up scheduler -> `useFollowUps`; hook, server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; `useFollowUps` query behavior stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for follow-up read failures.
- Reviewability: bounded diff across one read-message module, one component, focused tests, and this closeout.

### Smells Removed

- Local hardcoded `Failed to load follow-ups.` copy.
- Missing centralized follow-up read-state copy in activity read messages.

### Deferred

- Pipeline board/list/detail/documents/quote-history read-state copy remains separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes read-state copy, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/activities/activity-read-error-messages.test.ts tests/unit/activities/activity-read-state-contract.test.tsx` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, domain ownership, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for follow-up read-state copy. Moderate across Pipeline because other read states still use local failed-load titles/copy and should be handled in separate bounded slices.
