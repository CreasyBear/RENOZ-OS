# Jobs Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Project Documents Warning Surfaced Raw Read Errors

### Problem

The shared document-history hook normalizes read failures with the shared read-path policy, and the project documents tab can show cached documents while a refresh fails. The cached warning still rendered arbitrary `error.message` values, which could leak database, tenant, storage, or runtime details inside project document history.

### Workflow Spine

Project detail route
-> project documents tab
-> `useDocumentHistory`
-> document history server function
-> generated documents schema/database/storage metadata
-> `queryKeys.documents.history('project', projectId, documentType)`
-> documents unavailable or cached-documents warning.

### Touched Domains

- Jobs/project documents read feedback.
- Shared Documents read-hook contract.
- Shared projects read-feedback helper.
- Project documents read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Generated work orders, completion certificates, and handover documents support project execution and customer handoff. If document history refresh fails, operators should keep cached documents visible and see safe recovery copy instead of raw persistence, tenant, storage, or runtime details.

### Scope Constraints

- Do not change document generation, server functions, storage paths, schemas, tenant checks, query keys, cache invalidation, document card rendering, download behavior, or generate actions.
- Preserve the shared Documents hook as the owner of document-history read normalization.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectDocumentsReadErrorMessage`.
- Routed the project documents cached warning through the read-feedback helper.
- Preserved normalized document-history messages while suppressing arbitrary thrown errors.
- Added a focused project documents read-feedback contract test.

### Standards Checked

- Domain ownership: Jobs owns the project documents tab; Documents owns the read hook and query key.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useDocumentHistory` still normalizes reads and uses centralized document history query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, storage, or database behavior changed.
- Query/cache contract: unchanged; document history query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; cached document warnings keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project documents cached warning.
- Inline fallback copy inside the documents tab instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project document warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: task tabs, schedule, and time cards.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-documents-read-feedback-contract.test.ts tests/unit/documents/document-history-query-key-contract.test.ts tests/unit/documents/project-document-read-scope-contract.test.ts` (3 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project documents `error.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs/Documents read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for project documents read feedback. Moderate for the broader project detail area because task, schedule, and time surfaces still need separate read-feedback cleanup.
