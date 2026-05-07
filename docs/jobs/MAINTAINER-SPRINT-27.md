# Jobs Maintainer Sprint 27: Bulk Import Relation Scope

## Status

Closed in commit-ready state.

## Issue 1: Bulk Job Import Did Not Verify Related Rows Before Writes

### Problem

`bulkImportJobs` accepted `customerId` and `installerId` values and wrote them into `job_assignments` without first proving those rows belonged to the authenticated organization. The same row loop also returned raw error strings for per-row failures.

### Workflow Spine

Bulk job import payload
-> `bulkImportJobs`
-> scoped customer/installer preflight
-> duplicate/update decision
-> `job_assignments`
-> row import results.

### Touched Domains

- Jobs batch import server function.
- Jobs batch import error policy helper.
- Jobs batch import contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Bulk imports should accelerate operations without corrupting tenant boundaries. RENOZ job imports must only link to customers and installers from the active workspace, and rejected rows should explain the remediation safely.

### Scope Constraints

- Do not change the bulk import response shape.
- Do not change duplicate handling options.
- Do not rewrite import UI or hook usage.
- Keep this slice within Jobs; no Inventory reservation behavior.

### Changes

- Added scoped preflight sets for imported customer and installer IDs.
- Validated each row against active-organization customer/installer sets before update or insert.
- Skipped `IN ()` queries for empty import arrays.
- Added `src/lib/jobs/job-batch-errors.ts` for safe bulk import row failure messages.
- Added a focused batch import contract test.

### Standards Checked

- Domain ownership: Jobs batch import owns relation validation before writing job assignments.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server write preflight improved; no hook/cache behavior changed.
- Tenant isolation/data integrity: customer and installer IDs are now scoped to `ctx.organizationId` and non-deleted rows before write.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: row errors are deterministic and safe.
- Reviewability: one helper, one server function, one focused test, one closeout doc.

### Smells Removed

- Cross-tenant relation acceptance risk in bulk job import.
- Raw `error.message` / `String(error)` row failure output.
- Potential empty `IN ()` query when bulk import is called with zero rows.

### Deferred

- UI orchestration for parsed job imports remains separate from this server-side batch import boundary.
- Legacy relation fetch tenant-scope tightening in `job-assignments.ts` remains future work.
- Browser QA was not selected because this is server import validation/error policy work with no intended layout change.

### Gates

- Passed: focused Jobs batch import contract.
- Passed: focused ESLint on touched Jobs batch import files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Low to moderate. Bulk import now checks tenant-owned relations before writes. It still does not provide a first-class import UI flow for resolving customer/installer names.
