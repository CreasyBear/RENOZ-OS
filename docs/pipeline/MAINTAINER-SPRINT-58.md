# Pipeline Maintainer Sprint 58

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Create Trusted Empty Insert Result

### Problem

`createOpportunity` inserted an opportunity and immediately dereferenced `result[0]` to enqueue the search index outbox entry before proving the insert returned a row. If the insert ever returned no row, the workflow would fail with an internal dereference instead of a typed opportunity-create failure.

### Workflow Spine

Create opportunity
-> opportunity mutation hook
-> pipeline opportunity server function
-> tenant-scoped customer validation
-> opportunity insert
-> returned-row evidence
-> search index outbox entry built from proven row
-> audit log and centralized opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity create server workflow.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline opportunity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Opportunity creation is the start of the sales workflow. RENOZ should not report or index a new opportunity unless the inserted opportunity row actually exists and is available for downstream search/audit work.

### Scope Constraints

- Do not change create inputs, default probability, weighted value calculation, customer validation, search outbox payload shape, audit log payload, query/cache invalidation, UI feedback, or update/stage/bulk behavior.
- Keep this as returned-row evidence hardening inside `createOpportunity`.

### Changes

- Changed opportunity insert handling from array `result[0]` dereferences to explicit `createdOpportunity` returned-row evidence.
- Added a typed `ServerError` if opportunity insert evidence is missing.
- Built the search index outbox payload from the proven `createdOpportunity` row.
- Extended the opportunity mutation feedback source contract to protect the create evidence branch.

### Standards Checked

- Domain ownership: opportunity create behavior remains in the pipeline opportunity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server insert evidence improved.
- Tenant isolation/data integrity: customer validation still uses organization scope, and inserted rows still carry `ctx.organizationId`.
- Query/cache contract: unchanged; create still invalidates opportunity lists and pipeline metrics through centralized query keys.
- Honest UI states/operator-safe errors: missing insert evidence now fails through typed safe server copy, which the opportunity formatter maps to safe fallback copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Opportunity create dereferenced `result[0]` for search indexing before insert evidence.
- Opportunity create returned `result[0] ?? null` even though downstream code expected a created row.

### Deferred

- Opportunity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Search outbox behavior itself remains unchanged; deeper search-index reliability is deferred to a search/indexing slice.
- Browser QA remains deferred because this source-covered slice changes server insert evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for opportunity create returned-row evidence, safe error code, search outbox payload source, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data integrity, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Low for opportunity create returned-row evidence. Moderate for broader opportunity server ownership because create/update/stage/bulk workflows still live inside the monolithic pipeline server module.
