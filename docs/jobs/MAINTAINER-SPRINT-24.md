# Jobs Maintainer Sprint 24: Import Parsing Error Hygiene

## Status

Closed in commit-ready state.

## Issue 1: Job Import Parsing Leaked Raw Runtime Messages

### Problem

The Jobs import parser returned raw parser or runtime error messages in field, row, and import results. That made operator feedback inconsistent and could expose low-level database/parser details instead of telling the operator what to fix.

### Workflow Spine

Job import data
-> `bulkParseJobData` / `parseJobData`
-> `importParsedJobData`
-> `lookupCustomerAndInstallerCandidates`
-> `job_assignments`
-> operator-facing import result rows.

### Touched Domains

- Jobs import parsing server functions.
- Jobs import error policy helper.
- Jobs import parsing contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Job imports are a workflow accelerator for RENOZ operations. Bad rows should be understandable and safe to remediate, not support tickets caused by leaked parser or Postgres language.

### Scope Constraints

- Do not implement actual customer/installer auto-matching in this slice.
- Do not change the import database writes, job assignment schema, query keys, cache policy, or UI.
- Preserve the existing disambiguation rule: candidate lookup may return options, but import must receive resolved IDs.

### Changes

- Added `src/lib/jobs/job-import-errors.ts` as the Jobs import error policy boundary.
- Replaced raw parser catch messages in `parseJobData` with stable field-level messages.
- Replaced raw bulk row parser messages with a stable row parse message.
- Replaced raw `importParsedJobData` catch output with a stable row import message, while preserving a specific missing customer/installer remediation message.
- Replaced the stale production-use TODO with an explicit disambiguation ownership comment.
- Added a focused Jobs import parsing error contract test.

### Standards Checked

- Domain ownership: Jobs import feedback now has a Jobs-owned error helper instead of scattered catch formatting.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server/import result boundary improved; no query/cache behavior changed.
- Tenant isolation/data integrity: unchanged. Existing import writes still scope by authenticated organization.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched; serialized gates are retired from routine closeout.
- UI states/error handling: operator-facing import errors are now deterministic and remediation-oriented.
- Reviewability: one helper, one server function file, one focused test, one closeout doc.

### Smells Removed

- Raw parser/runtime messages returned from job field parsing.
- Raw parser/runtime messages returned from bulk row parsing.
- Raw DB/runtime messages returned from import row failures.
- Stale `PHASE12-008` TODO that implied lookup was absent even though candidate lookup exists.

### Deferred

- Customer/installer resolution UI and import orchestration remain separate product work.
- Actual inventory reservation integration remains deferred because it crosses Jobs and Inventory invariants.
- Browser QA was not selected because this is server result/error policy work with no intended layout change.

### Gates

- Passed: focused Jobs import parsing error contract.
- Passed: focused ESLint on touched Jobs import files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted the runtime update that serialized gates are complete/retired and removed them from routine closeout evidence.

### Residual Risk

Low. This sprint improves result safety without changing import write semantics. Import still depends on callers resolving customer and installer IDs before write.
