# Inventory Maintainer Sprint 175: Document History Degraded-State Test Contract

## Status

Closed in commit-ready state.

## Issue 1: System Normalization Test Expected Stale Document History Copy

### Problem

Sprint 174 surfaced a broader gate failure in `tests/unit/system/query-normalization-wave6b.test.tsx`. The UI correctly rendered cached-data degraded copy for document history when stale documents were still visible:

`Document history is temporarily unavailable. Showing the most recent documents.`

The test still expected the no-cache fallback:

`Document history is temporarily unavailable. Please refresh and try again.`

A second source-contract assertion also expected `useDocumentHistory` to inline that fallback string, even though the hook now uses the centralized `DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE` constant.

### Workflow Spine

Document history read
-> `useDocumentHistory`
-> shared document read fallback constants
-> `DocumentHistoryList`
-> degraded read with cached documents
-> cached-data warning while preserving visible documents.

### Touched Domains

- Document history read-state tests.
- System query normalization tests.
- Project document feedback contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators should keep seeing the most recent generated documents when refresh fails, with copy that says the data is stale rather than gone. The tests now enforce that honest cached-state behavior instead of pushing the UI toward a misleading generic refresh failure.

### Scope Constraints

- Do not change document-history hook behavior.
- Do not change document-history UI copy.
- Do not change warranty entitlement activation code from Sprint 174.
- Keep this slice limited to stale test-contract alignment.

### Changes

- Updated the system normalization test to expect the cached document-history degraded warning when cached documents are present.
- Updated the project documents feedback contract to assert that `useDocumentHistory` uses `DOCUMENT_HISTORY_READ_FALLBACK_MESSAGE` instead of an inline fallback string.
- Re-ran the previously failing broader system test with the warranty entitlement cache contract.

### Standards Checked

- Domain ownership: document read copy remains centralized in document error-message helpers.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged; this sprint only fixes test evidence around the existing read-state contract.
- Tenant isolation/data integrity: not applicable; no runtime data path changed.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: improved test coverage for stale-but-visible document history.
- Query/cache contract: broader system query normalization gate restored.
- Reviewability: two test assertion updates, no production code.

### Smells Removed

- System test expected no-cache failure copy while mocking cached documents.
- Source-contract test required an inline fallback string instead of the centralized document error constant.

### Deferred

- No browser smoke; this was test-contract alignment.
- No broader document-history refactor.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/system/query-normalization-wave6b.test.tsx tests/unit/warranty/warranty-entitlement-cache-contract.test.tsx tests/unit/jobs/project-documents-read-feedback-contract.test.ts`
- Passed: `./node_modules/.bin/eslint tests/unit/system/query-normalization-wave6b.test.tsx tests/unit/jobs/project-documents-read-feedback-contract.test.ts --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by repairing stale evidence so future gates test the actual operator-safe read-state contract.

### Residual Risk

Low. Production behavior is unchanged; this restores test accuracy for an already-centralized document history fallback contract.
