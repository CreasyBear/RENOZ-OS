# Financial Maintainer Sprint 40: Xero Remediation Issue Feedback

## Status

Closed in commit-ready state.

## Issue 1: Xero Remediation Console Issue Messages

### Problem

The Xero remediation console consumes `XeroSyncIssue.message` and the legacy `xeroSyncError` read field from invoice status helpers. `normalizeXeroSyncIssue` classified stored sync errors into useful issue codes, but then copied raw `xeroSyncError` text into operator-facing issue messages. Provider failures, token refresh failures, database constraint text, or stack/runtime details could therefore reach the invoice remediation table and sheet.

### Workflow Spine

Xero invoice remediation workflow
-> financial Xero sync hooks
-> `getInvoiceXeroStatus` / `listInvoicesBySyncStatus`
-> `readInvoiceXeroStatus` / `readInvoicesBySyncStatus`
-> tenant-scoped order/customer reads
-> `normalizeXeroSyncIssue`
-> safe issue/read-error copy
-> Xero remediation console table and sheet.

### Touched Domains

- Financial operations.
- Xero invoice sync and remediation.
- Invoice status read helpers.
- Xero issue classification/copy.
- Financial and order feedback tests.
- Financial maintainer closeout docs.

### Business Value Protected

The console is the operator recovery surface for invoice sync blockers. It needs to make the next action clear without leaking provider bearer strings, access/refresh token text, database constraints, SQL/runtime details, or stack traces into daily accounting operations.

### Scope Constraints

- Do not change Xero sync execution, persisted `orders.xeroSyncError` storage, payment reconciliation, revenue-recognition sync, customer mapping writes, tenant scoping, query keys, cache policy, or UI layout.
- Keep raw stored sync errors available for server-side diagnostics and persistence policy decisions.
- Normalize only invoice status read-model fields and `XeroSyncIssue.message` for the remediation console.
- Browser QA is skipped because this is server read-model/copy behavior with no intended layout, navigation, or interaction change.

### Changes

- Added finance-owned `formatXeroSyncIssueMessage` copy for each Xero issue category.
- Added `formatXeroSyncReadError` so invoice status reads return safe operator copy through the legacy `xeroSyncError` field when a stored raw error exists.
- Updated `normalizeXeroSyncIssue` so issue classification still uses raw stored errors, but `issue.message` is category-owned safe copy.
- Updated invoice detail and list status read helpers to compute the issue once and reuse it for both `issue` and safe `xeroSyncError`.
- Added focused tests proving unsafe stored provider/database errors become safe issue/read-model copy and do not leak through the remediation console read result.
- Kept existing order alert and Xero console component tests passing.

### Standards Checked

- Domain ownership: Xero remediation copy is owned by financial/Xero sync helpers, not scattered in UI components.
- Route -> component -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes the server read model behind existing hooks; query keys and cache behavior are unchanged.
- Query/cache policy: unchanged. No invalidation, stale-time, mutation, or fetch path behavior changed.
- Tenant isolation/data integrity: unchanged. Reads remain scoped by `ctx.organizationId`; no writes, transactions, payment reconciliation, revenue-recognition posting, or inventory paths were touched.
- UI states/error handling: strengthened at the server boundary. The remediation console can keep displaying `issue.message` without knowing provider/storage internals.
- Reviewability: the diff is limited to Xero invoice status helpers, Xero issue message formatting, one focused test file, and this closeout note.

### Smells Removed

- Raw `xeroSyncError` copied into `XeroSyncIssue.message`.
- Raw `xeroSyncError` returned from invoice status read helpers for the remediation console.
- Duplicate `normalizeXeroSyncIssue` calls in the list read mapper.
- Missing direct tests for unsafe Xero sync issue/read-model feedback.

### Deferred

- Persisted `orders.xeroSyncError` can still contain raw diagnostic text; write-time storage normalization remains a separate persistence-policy slice.
- Revenue-recognition Xero read models still expose their own `xeroSyncError` field and need a separate revenue-recognition slice.
- Xero integration status copy still includes tenant labels from the active connection; operator labeling policy can be reviewed separately.
- Browser QA for the remediation console remains future UX verification.

### Gates

- Passed: focused Xero remediation and related feedback tests, `./node_modules/.bin/vitest run tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/orders/order-xero-alert-feedback-contract.test.ts` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is server read-model/copy behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, Xero sync execution, payment reconciliation, revenue-recognition posting, inventory behavior, or database contracts; focused tests, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned feedback copy, safe read models, tenant-scoped server functions, reviewable diffs, and risk-selected evidence. No serialized workflow was touched.

### Residual Risk

Low for invoice remediation issue/read-model feedback. Raw diagnostic text remains in persistence and in non-invoice Xero read models, especially revenue-recognition sync, which should be handled as a separate financial slice.
