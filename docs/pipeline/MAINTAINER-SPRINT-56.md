# Pipeline Maintainer Sprint 56

## Status

Closed in commit-ready state.

## Issue 1: Activity Create Trusted Empty Insert Result

### Problem

After Sprint 54 hardened activity update, complete, and delete writes, `logActivity` still inserted an activity and returned the inserted row without checking that the insert returned a row. That left activity creation as the remaining activity write path without explicit returned-row evidence.

### Workflow Spine

Log activity
-> activity mutation hook
-> pipeline activity server function
-> tenant-scoped opportunity lookup
-> activity insert
-> returned-row evidence
-> centralized activity/opportunity/unified-activity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity activity create server workflow.
- Pipeline activity mutation feedback/source contract.
- Pipeline activity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Sales and support follow-up depends on activity history. Operators should not receive a successful activity-log response unless the activity row actually exists.

### Scope Constraints

- Do not change activity inputs, schemas, hook signatures, cache invalidation, UI feedback copy, activity update/complete/delete behavior, activity list/timeline reads, or server module ownership.
- Keep this as returned-row evidence hardening inside `logActivity`.

### Changes

- Added returned-row evidence check after the `logActivity` insert.
- Throw a typed `ServerError` if the activity insert does not return a row.
- Extended the activity mutation feedback source contract to protect the create evidence branch.

### Standards Checked

- Domain ownership: activity create behavior remains in the pipeline activity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server insert evidence improved.
- Tenant isolation/data integrity: opportunity ownership is still verified inside the transaction before insert, and inserted rows still carry `ctx.organizationId`.
- Query/cache contract: unchanged; activity mutations still invalidate activities, follow-ups, opportunity detail, timeline, and unified activity keys through centralized query keys.
- Honest UI states/operator-safe errors: missing insert evidence now fails through typed safe server copy, which the activity formatter maps to safe fallback copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Activity create returned the insert result without proving it existed.

### Deferred

- Activity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Broader activity read-path consistency remains deferred after Sprint 55's count failure hardening.
- Browser QA remains deferred because this source-covered slice changes server insert evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/activity-mutation-feedback-contract.test.ts tests/unit/pipeline/activity-mutation-cache-contract.test.ts tests/unit/pipeline/pipeline-activity-query-key-contract.test.ts` (3 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for activity create returned-row evidence, tenant ownership, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data integrity, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Low for activity create returned-row evidence. Moderate for broader activity ownership because activity reads and writes still live inside the monolithic pipeline server module.
