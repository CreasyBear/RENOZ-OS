# Pipeline Maintainer Sprint 36

## Status

Closed in commit-ready state.

## Issue 1: Quote Validity Used Two Separate 30-Day Constants

### Problem

`quote-versions.tsx` defined both `DEFAULT_QUOTE_VALIDITY_DAYS` and `QUOTE_VALIDITY_DAYS` with the same value. Default quote expiration and generated PDF validity are the same business rule, so duplicating the constant created an avoidable drift point.

### Workflow Spine

Quote server functions
-> default quote expiration
-> generated quote PDF validity date
-> customer-facing quote document.

### Touched Domains

- Pipeline quote server functions.
- Pipeline quote server source contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote expiry dates shown in RENOZ's internal Pipeline workflows and customer-facing quote PDFs should follow the same validity rule when no explicit quote expiry exists.

### Scope Constraints

- Do not change the 30-day default, date calculation behavior, server function inputs/outputs, query keys, cache policy, UI rendering, routing, or operator-facing feedback.
- Keep this as a source-level rule consistency cleanup.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Removed the duplicate `QUOTE_VALIDITY_DAYS` constant.
- Updated generated quote PDF fallback validity to use `DEFAULT_QUOTE_VALIDITY_DAYS`.
- Added a focused source contract to keep default quote expiration and generated quote PDF validity on one constant.

### Standards Checked

- Domain ownership: quote validity default is now represented by one quote server constant.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: server date rule consistency improved; hooks, schemas, database writes, query keys, route, and UI stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, transaction, inventory, or finance path touched.
- Query/cache contract: unchanged.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one server file, one source contract, and this closeout.

### Smells Removed

- Duplicate 30-day quote validity constants.
- Missing focused test coverage for quote validity constant ownership.

### Deferred

- `quote-versions.tsx` remains large and should be decomposed through future risk-selected quote slices.
- Browser QA remains deferred because this source-covered slice changes a shared constant reference, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-validity-contract.test.ts` - 1 file, 1 test.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote validity constants.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain cleanliness, meaningful tests, and reviewable diffs.

### Residual Risk

Low. This is a single-rule constant cleanup with no intended behavior change.
