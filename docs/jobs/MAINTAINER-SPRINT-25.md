# Jobs Maintainer Sprint 25: Job Create Auto-Number Contract

## Status

Closed in commit-ready state.

## Issue 1: Optional Job Numbers Were Rejected Before Server Generation

### Problem

The create job hook treated `jobNumber` as optional and the server handler could generate a number, but the create schema required a non-empty `jobNumber` before the handler ran. Operators creating a job without a manual number could hit validation before the intended auto-number path.

### Workflow Spine

Job create form/container
-> `useCreateJob`
-> `createJobAssignment`
-> `createJobAssignmentSchema`
-> `generateJobNumber`
-> `job_assignments`
-> jobs/query invalidation.

### Touched Domains

- Jobs core create hook.
- Jobs job assignment schema.
- Jobs job assignment server generation contract.
- Jobs maintainer tests/docs.

### Business Value Protected

RENOZ operators should not need to invent a job number for routine field work. Job creation should move quickly and let the system allocate a consistent identifier.

### Scope Constraints

- Do not rewrite the legacy job assignment UI.
- Do not change job number generation format or database writes.
- Do not change query keys or invalidation behavior.
- Keep server generation as the ownership point for automatic numbers.

### Changes

- Added an optional generated job number schema that normalizes blank strings to `undefined`.
- Updated `useCreateJob` to pass the optional `jobNumber` instead of manufacturing an empty string.
- Added a focused contract test proving omitted/blank numbers reach the server-generation path and supplied numbers are trimmed.

### Standards Checked

- Domain ownership: job number input normalization belongs to the Jobs assignment schema; generation remains in the Jobs server function.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: create spine aligned; cache invalidation unchanged.
- Tenant isolation/data integrity: unchanged. Generation still receives authenticated `organizationId`.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: prevents a confusing pre-handler validation failure for omitted job numbers.
- Reviewability: one schema helper, one hook line, one focused contract test, one closeout doc.

### Smells Removed

- Hook/schema/server mismatch around optional job numbers.
- Empty string sentinel in `useCreateJob`.

### Deferred

- Legacy job assignment mutation error sanitization remains the next operator-safety slice.
- Broader tenant-scope tightening in legacy job relation fetches remains separate from this create-number contract.
- Browser QA was not selected because this is schema/hook/server contract work with no intended layout change.

### Gates

- Passed: focused Jobs auto-number contract.
- Passed: focused ESLint on touched Jobs create files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Low. The change aligns existing intended behavior and does not alter the generated number format or persistence path.
