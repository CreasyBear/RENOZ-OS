# Pipeline Maintainer Sprint 66

## Status

Closed in commit-ready state.

## Issue 1: Win/Loss Reason Writes Lacked Returned-Row Evidence

### Problem

Win/loss reasons are pipeline settings used when closing opportunities as won or lost. The server writes still used raw `.returning()` arrays and `result[0]` style returns. The delete workflow also checked reason usage by `winLossReasonId` only, instead of scoping the usage count to live opportunities in the current tenant.

### Workflow Spine

Settings win/loss reason manager
-> settings win/loss hook
-> pipeline win/loss reason server function
-> tenant-scoped settings row write
-> returned-row evidence
-> settings query key invalidation
-> operator success/error toast.

### Touched Domains

- Pipeline win/loss reason settings server workflow.
- Pipeline settings hook/source contract.
- Win/loss reason settings UI source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Won/lost reasons feed sales learning, quote discipline, and win/loss analysis. Admin settings writes should prove the row they changed and should not let another tenant's opportunity usage influence delete/deactivate behavior.

### Scope Constraints

- Do not change form fields, permissions, hook cache invalidation, settings UI feedback, analysis queries, or win/loss reason read behavior.
- Keep this as write-evidence and tenant-scoped usage cleanup for win/loss reason settings.

### Changes

- Changed create to destructure `createdReason` from the insert result and throw a typed `ServerError` with `PIPELINE_WIN_LOSS_REASON_CREATE_FAILED` if evidence is missing.
- Changed update to destructure `updatedReason` from the optimistic-lock update and return that proven row.
- Scoped delete usage checks to `winLossReasonId + organizationId + deletedAt IS NULL`.
- Added returned-row evidence to both deactivate and hard-delete branches.
- Added a source contract protecting create/update/delete evidence, scoped usage checks, and unchanged hook/UI contracts.

### Standards Checked

- Domain ownership: unchanged; win/loss reason settings remain in the focused `win-loss-reasons.ts` server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the server write evidence is stronger and hook invalidation remains centralized on settings query keys.
- Tenant isolation/data integrity: improved; delete usage checks now count only live opportunities in the current organization.
- Query/cache contract: unchanged; settings win/loss reason invalidation remains in the hook.
- Honest UI states/operator-safe errors: improved for create missing-row evidence through a stable server code; existing UI copy is unchanged.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Create returned `result[0]` without proving a row was inserted.
- Update returned `result[0]` after an optimistic-lock write.
- Delete/deactivate branches performed writes without returned-row evidence.
- Delete usage count was not scoped to tenant/live opportunities.

### Deferred

- Win/loss reason mutation error formatting remains a future settings UX hardening slice; existing manager toasts remain unchanged.
- Browser QA remains deferred because this source-covered slice changes server write evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/win-loss-reason-write-contract.test.ts tests/unit/settings/settings-read-error-messages.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` (4 files, 10 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for returned-row evidence, scoped usage checks, and removed `result[0]` returns from create/update write bodies.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for win/loss reason write evidence. Moderate for settings mutation UX because the manager still uses broad create/update/delete failure toasts.
