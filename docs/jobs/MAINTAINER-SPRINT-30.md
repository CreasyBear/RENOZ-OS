# Jobs Maintainer Sprint 30: Material Reservation Preview Completeness

## Status

Closed in commit-ready state.

## Issue 1: Specific Material Reservation Preview Silently Dropped Missing IDs

### Problem

`reserveJobStock` is intentionally preview-only until Inventory reservation integration exists. When callers requested specific material IDs, the preview query returned only matching rows and silently ignored any missing, wrong-job, or wrong-tenant material IDs. That could make an operator believe the full requested set had been considered.

### Workflow Spine

Project/job materials UI
-> `useReserveJobStock`
-> `reserveJobStock`
-> `job_materials`
-> preview-only reservation response
-> job materials query invalidation.

### Touched Domains

- Jobs material server function.
- Jobs material reservation preview contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Material reservation is not implemented yet, so the preview must be honest. If an operator asks to preview specific materials, every requested material must belong to the active job and workspace or the server should reject the request.

### Scope Constraints

- Do not implement actual Inventory reservations.
- Do not change the preview response shape.
- Do not change hooks, query keys, cache invalidation, or UI.
- Keep the explicit unavailable reservation contract.

### Changes

- Deduplicated requested material IDs before preview lookup.
- Replaced raw `ANY(...)` material filtering with Drizzle `inArray`.
- Rejected specific-material previews when any requested material is missing from the active job/org scope.
- Replaced the stale reservation TODO with an explicit Inventory-domain ownership comment.
- Added a focused source contract.

### Standards Checked

- Domain ownership: Jobs owns the preview contract; Inventory owns future actual reservations.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server preview boundary hardened; hook/cache behavior unchanged.
- Tenant isolation/data integrity: specific material IDs must match the authenticated organization and requested job.
- Transactional inventory/finance integrity: no stock or finance mutation occurs.
- UI states/error handling: unavailable reservation response remains honest; invalid specific previews now fail instead of shrinking silently.
- Reviewability: one server function slice, one focused test, one closeout doc.

### Smells Removed

- Silent partial previews for requested material IDs.
- Raw SQL array membership in the material preview filter.
- Stale TODO that implied reservation work belonged inside this preview function.

### Deferred

- Actual Jobs -> Inventory reservation creation remains a cross-domain product slice.
- Browser QA was not selected because this is server preview validation with no intended layout change.

### Gates

- Passed: focused Jobs material reservation preview contract.
- Passed: focused ESLint on touched Jobs material files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Low. The preview contract is stricter and still does not mutate inventory. Actual reservation behavior remains unavailable by design.
