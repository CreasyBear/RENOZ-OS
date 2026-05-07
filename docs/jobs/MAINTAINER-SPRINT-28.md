# Jobs Maintainer Sprint 28: Job Assignment Tenant Scope

## Status

Closed in commit-ready state.

## Issue 1: Legacy Job Assignment Mutations Trusted Caller-Supplied Relations

### Problem

Legacy job assignment create accepted `customerId` and `installerId` values without proving those rows belonged to the authenticated organization. Several mutation paths also used caller-supplied `organizationId` values in write predicates or photo inserts, and relation fetch joins did not enforce tenant/deleted-row boundaries.

### Workflow Spine

Job assignment create/update/cancel/start/complete/photo action
-> Jobs hook or legacy caller
-> `job-assignments.ts` server mutation
-> scoped customer/installer/job lookup
-> `job_assignments` / `job_photos`
-> mutation result and jobs query invalidation.

### Touched Domains

- Jobs assignment server functions.
- Jobs tenant-scope contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

RENOZ job assignments connect customers, installers, field work, documents, and downstream reporting. Those links must stay inside the active workspace, especially as imports and legacy assignment paths continue to coexist with Projects.

### Scope Constraints

- Do not change response shapes, query keys, cache invalidation, activity logging semantics, or job number generation.
- Do not rewrite legacy job assignment UI.
- Keep the slice in Jobs assignment/photo server boundaries.

### Changes

- Added create-time customer and installer scope assertions using authenticated `organizationId`.
- Added tenant/deleted-row aware relation join helpers for job assignment response fetches.
- Changed update/cancel/start/complete predicates to use `ctx.organizationId` instead of trusting caller `organizationId`.
- Changed job photo creation to verify the job belongs to the authenticated organization and to insert `ctx.organizationId`.
- Changed job photo reads to scope by `ctx.organizationId` after the existing organization access check.
- Added a focused tenant-scope source contract.

### Standards Checked

- Domain ownership: Jobs assignment server owns relation scope before assignment/photo writes.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server boundary hardened; hook/cache behavior unchanged.
- Tenant isolation/data integrity: customer, installer, assignment, and photo writes now use authenticated org scope.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: not changed; existing safe mutation error helper formats failures.
- Reviewability: one server file, one focused contract, one closeout doc.

### Smells Removed

- Create assignment relation IDs accepted without tenant preflight.
- Caller-supplied `organizationId` trusted in assignment mutation predicates.
- Caller-supplied `organizationId` trusted for job photo insert.
- Relation joins that could cross tenant or deleted-row boundaries.

### Deferred

- Cursor/list read UX remains unchanged.
- Job materials inventory reservation integration remains separate.
- Browser QA was not selected because this is server tenant-scope work with no intended layout change.

### Gates

- Passed: focused Jobs assignment tenant-scope contract.
- Passed: focused ESLint on touched Jobs assignment files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Moderate. New writes and relation fetches are hardened. Historical cross-tenant job assignment rows, if any exist, may need a separate audit/reconciliation slice.
