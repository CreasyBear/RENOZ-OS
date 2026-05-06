# Financial Maintainer Sprint 42: Revenue Recognition Xero Mutation Feedback

## Status

Closed in commit-ready state.

## Issue 1: Revenue Recognition Sync Response Errors

### Problem

Sprint 41 made revenue-recognition Xero read models safe, but `syncRevenueRecognitionToXero` still returned raw failure text in mutation responses. Missing account settings, unavailable Xero readiness, and provider sync failures could return persisted diagnostic strings such as token references, provider stack text, or raw validation payloads to callers.

### Workflow Spine

Revenue recognition Xero mutation workflow
-> financial revenue route retry action
-> `useRetryRecognitionSync`
-> `retryRecognitionSync` / `syncRecognitionToXero`
-> `syncRevenueRecognitionToXero`
-> tenant-scoped recognition and organization reads
-> Xero readiness/manual journal sync
-> persisted diagnostic state
-> safe mutation response copy
-> revenue query invalidation.

### Touched Domains

- Financial operations.
- Revenue recognition.
- Xero manual journal sync mutations.
- Shared Xero sync feedback helper.
- Financial feedback tests.
- Financial maintainer closeout docs.

### Business Value Protected

Retrying failed revenue journal syncs should not expose provider bearer strings, token text, SQL/database details, or raw provider validation payloads through API/mutation responses. Operators need a recovery-safe response while raw diagnostics remain available server-side.

### Scope Constraints

- Do not change revenue recognition sync execution, state transitions, retry thresholds, persisted `revenueRecognition.xeroSyncError`, query keys, cache invalidation, tenant scoping, payment reconciliation, invoice remediation behavior, or UI layout.
- Keep raw diagnostic persistence unchanged.
- Normalize only mutation response `error` copy.
- Browser QA is skipped because this is server mutation response/copy behavior with no intended layout, navigation, or interaction change.

### Changes

- Reused `formatRevenueRecognitionXeroSyncError` for all `syncRevenueRecognitionToXero` failure responses.
- Extended revenue-recognition Xero feedback classification for unavailable Xero connection/configuration states.
- Preserved raw `xeroSyncError` writes for account-setting and provider failures.
- Updated behavior tests so mutation responses are safe while persisted diagnostics remain raw.
- Extended source contracts to prevent returning `errorMessage` or readiness text directly from the mutation helper.

### Standards Checked

- Domain ownership: revenue-recognition Xero mutation response copy is owned by the shared financial/Xero feedback helper.
- Route -> component -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only server mutation response copy; route, component, hook, schema, database writes, query keys, and invalidation remain unchanged.
- Query/cache policy: unchanged. `useRetryRecognitionSync` still invalidates `queryKeys.financial.revenue()`.
- Tenant isolation/data integrity: unchanged. Recognition reads/writes remain scoped by `ctx.organizationId`; no transactions, payment reconciliation, invoice sync execution, inventory behavior, or database contracts were touched.
- UI states/error handling: strengthened at the mutation boundary. Callers receive safe copy while server diagnostics remain intact.
- Reviewability: the diff is limited to mutation response formatting, shared feedback classification, focused tests, and this closeout note.

### Smells Removed

- Raw readiness failure text returned from revenue-recognition Xero sync responses.
- Raw missing-account configuration exception text returned from mutation responses.
- Raw provider sync error text returned from sync-failed/manual-override mutation responses.
- Missing focused tests proving raw persisted diagnostics do not leak through mutation responses.

### Deferred

- Persisted `revenueRecognition.xeroSyncError` can still contain raw diagnostic text; write-time storage normalization remains a separate persistence-policy slice.
- Revenue UI still does not surface detailed remediation guidance beyond state and retry affordance; that is a separate UX slice.
- Other financial mutation response surfaces may still return raw provider/storage text and should be triaged by domain, not swept broadly.

### Gates

- Passed: mutation-focused tests, `./node_modules/.bin/vitest run tests/unit/financial/revenue-recognition-xero-sync-behavior.test.ts tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts` - 3 files, 12 tests.
- Passed: broader revenue/Xero feedback suite, `./node_modules/.bin/vitest run tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/revenue-recognition-xero-sync-behavior.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/orders/order-xero-alert-feedback-contract.test.ts` - 5 files, 17 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is server mutation response/copy behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, Xero sync execution, payment reconciliation, revenue-recognition persistence shape, inventory behavior, or database contracts; focused tests, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe mutation feedback, domain-owned helper copy, tenant-scoped server functions, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for revenue-recognition Xero mutation response feedback. Raw diagnostic text remains in persistence by design and should be handled separately if the product chooses write-time normalization over server-side diagnostic fidelity.
