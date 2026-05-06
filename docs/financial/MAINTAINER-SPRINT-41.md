# Financial Maintainer Sprint 41: Revenue Recognition Xero Read Feedback

## Status

Closed in commit-ready state.

## Issue 1: Revenue Recognition Xero Read-Model Errors

### Problem

Sprint 40 hardened invoice remediation feedback, but revenue-recognition read helpers still returned `revenueRecognition.xeroSyncError` directly. A failed Xero manual journal sync can persist provider payload text, access/refresh token references, database constraint text, or stack/runtime details. Those values were returned through order recognition reads and the revenue page list read model.

### Workflow Spine

Revenue recognition Xero workflow
-> financial revenue route
-> `RevenueReports`
-> `useRecognitions`
-> `listRecognitionsByState`
-> `readRecognitionsByState`
-> tenant-scoped revenue-recognition reads
-> shared Xero sync feedback helper
-> safe revenue-recognition records.

Order detail recognition reads follow the same server helper boundary through `getOrderRecognitions` and `readOrderRecognitions`.

### Touched Domains

- Financial operations.
- Revenue recognition.
- Xero manual journal sync read models.
- Invoice remediation feedback helper ownership.
- Financial feedback tests.
- Financial maintainer closeout docs.

### Business Value Protected

Revenue recognition is accounting-critical. Operators reviewing recognized revenue and failed Xero journal syncs need clear recovery state without seeing provider bearer strings, token text, SQL/database errors, or raw provider payloads.

### Scope Constraints

- Do not change revenue recognition write behavior, Xero manual journal sync execution, persisted `revenueRecognition.xeroSyncError`, invoice remediation behavior, payment reconciliation, query keys, cache policy, tenant scoping, or UI layout.
- Normalize read-model copy only.
- Extract shared Xero sync feedback copy before extending it to revenue recognition so revenue read helpers do not depend on invoice command modules.
- Browser QA is skipped because this is server read-model/copy behavior with no intended layout, navigation, or interaction change.

### Changes

- Extracted invoice Xero safe copy helpers into `src/server/functions/financial/_shared/xero-sync-feedback.ts`.
- Added `formatRevenueRecognitionXeroSyncError` for revenue-recognition journal sync failures.
- Updated `readOrderRecognitions` and `readRecognitionsByState` to return safe `xeroSyncError` values.
- Kept invoice remediation issue/read-model contracts on the shared helper after extraction.
- Added focused revenue-recognition feedback tests for formatter behavior, order recognition reads, list reads, and source contracts.

### Standards Checked

- Domain ownership: Xero sync feedback copy now lives in a shared financial/Xero helper instead of the invoice sync command.
- Route -> component -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes server read-model formatting behind existing hooks; route, component, hook, schema, database selection, query keys, and cache policy are unchanged.
- Query/cache policy: unchanged. `queryKeys.financial.recognitions` and `queryKeys.financial.revenue()` invalidation remain unchanged.
- Tenant isolation/data integrity: unchanged. Revenue recognition reads remain scoped by `ctx.organizationId`; no writes, transactions, payment reconciliation, invoice sync execution, or inventory paths were touched.
- UI states/error handling: strengthened at the server boundary. Existing revenue UI can consume records without knowing provider/storage internals.
- Reviewability: the diff is limited to one shared Xero feedback helper, revenue read formatting, import cleanup for invoice feedback, focused tests, and this closeout note.

### Smells Removed

- Raw `revenueRecognition.xeroSyncError` returned from order recognition reads.
- Raw `revenueRecognition.xeroSyncError` returned from revenue page list reads.
- Invoice Xero feedback helper copy living inside the invoice sync command module.
- Missing direct tests for unsafe revenue-recognition Xero read feedback.

### Deferred

- Revenue-recognition sync mutation responses still return raw `error` values and should be reviewed as a separate mutation feedback slice.
- Persisted `revenueRecognition.xeroSyncError` can still contain raw diagnostic text; write-time storage normalization remains a separate persistence-policy slice.
- Revenue UI does not yet display detailed safe Xero remediation copy beyond state badges; UX affordances can be reviewed separately.

### Gates

- Passed: focused revenue-recognition/Xero feedback suite, `./node_modules/.bin/vitest run tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/revenue-recognition-xero-sync-behavior.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/orders/order-xero-alert-feedback-contract.test.ts` - 5 files, 16 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is server read-model/copy behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, Xero sync execution, payment reconciliation, revenue-recognition persistence, inventory behavior, or database contracts; focused tests, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned feedback copy, safe read models, modular helper extraction, tenant-scoped reads, reviewable diffs, and risk-selected evidence. No serialized workflow was touched.

### Residual Risk

Low for revenue-recognition Xero read feedback. Raw diagnostic text remains in persistence and in revenue-recognition sync mutation responses, which should be handled as a separate financial mutation-feedback slice.
