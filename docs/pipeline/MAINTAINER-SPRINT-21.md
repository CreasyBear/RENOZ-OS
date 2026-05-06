# Pipeline Maintainer Sprint 21

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Activity Hook Read Fallbacks Bypassed the Activity Read Contract

### Problem

`FollowUpScheduler` and shared activity presenters already route read failures through `ACTIVITY_READ_MESSAGES`, but Pipeline's `use-activities` hook still normalized activity, timeline, follow-up, and analytics read failures with inline fallback strings. Because normalized read-query errors preserve the hook fallback message, this could bypass the activity-domain copy even when presenters used the activity formatter.

### Workflow Spine

Pipeline activity read hooks
-> Pipeline activity read server functions
-> `requireReadResult` / `normalizeReadQueryError`
-> Activity read-state message map
-> activity/follow-up presenters.

### Touched Domains

- Pipeline activity read hooks.
- Activity read-state source contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Activity and follow-up reads drive operator follow-through on sales opportunities. Centralizing their read-normalization copy keeps follow-up errors aligned with the activity UI contract and prevents raw operational failures from drifting into inconsistent guidance.

### Scope Constraints

- Do not change activity query keys, query options, server functions, schemas, filters, pagination, date handling, result shapes, cache policy, loading behavior, mutation behavior, or UI rendering.
- Keep this as activity hook read-normalization copy only. Extended opportunity detail read hooks remain a separate bounded slice.

### Changes

- Routed Pipeline activity list read fallbacks through `ACTIVITY_READ_MESSAGES.feed`.
- Routed Pipeline activity timeline read fallbacks through `ACTIVITY_READ_MESSAGES.history`.
- Routed Pipeline follow-up read fallbacks through `ACTIVITY_READ_MESSAGES.followUps`.
- Routed Pipeline activity analytics read fallbacks through `ACTIVITY_READ_MESSAGES.statistics`.
- Extended the activity read-state source contract so `src/hooks/pipeline/use-activities.ts` cannot reintroduce literal `fallbackMessage` copy.

### Standards Checked

- Domain ownership: activity read-normalization copy now uses the established activity-domain read-error helper instead of Pipeline-local literals.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the hook -> read-error contract; server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; query keys, stale times, enabled conditions, and result contracts stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by keeping normalized read-query messages aligned with activity presenter fallbacks.
- Reviewability: bounded diff across one hook file, one focused contract test, and this closeout.

### Smells Removed

- Inline opportunity activity list fallback strings inside Pipeline activity hooks.
- Inline opportunity activity timeline fallback strings inside Pipeline activity hooks.
- Inline opportunity follow-up fallback strings inside Pipeline activity hooks.
- Inline opportunity activity analytics fallback strings inside Pipeline activity hooks.
- Missing contract coverage for Pipeline activity hooks in the activity read-state source test.

### Deferred

- Pipeline extended opportunity detail hook read fallbacks remain a separate workflow slice.
- Browser QA remains deferred because this source-covered slice changes hook fallback constants, not layout or browser interaction.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/activities/activity-read-error-messages.test.ts tests/unit/activities/activity-read-state-contract.test.tsx tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 3 files, 10 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for literal Pipeline activity hook `fallbackMessage` read copy in `use-activities`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted Pipeline activity hook fallback copy. Moderate across Pipeline because extended opportunity detail read hooks still hold inline read fallback strings and should be cleaned in a separate bounded slice.
