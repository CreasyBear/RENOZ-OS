# Financial Maintainer Sprint 43: Invoice Xero Mutation Feedback

## Status

Closed in commit-ready state.

## Issue 1: Invoice Xero Sync Response Errors

### Problem

Invoice Xero read models were hardened in Sprint 40, but `syncInvoiceToXeroCommand` still returned raw failure text in mutation responses and staged workflow messages. Unavailable Xero readiness and provider sync failures could return token references, provider stack text, database constraint text, or raw provider validation payloads to API callers.

### Workflow Spine

Invoice Xero mutation workflow
-> Xero remediation console retry action
-> `useResyncInvoiceToXero`
-> `resyncInvoiceToXero` / `syncInvoiceToXero`
-> `syncInvoiceToXeroCommand`
-> tenant-scoped order/customer/line-item reads
-> Xero readiness/invoice sync
-> persisted diagnostic state
-> safe mutation response and staged workflow copy
-> Xero invoice query invalidation.

### Touched Domains

- Financial operations.
- Xero invoice sync and remediation.
- Shared Xero sync feedback helper.
- Invoice sync mutation response contracts.
- Financial feedback tests.
- Financial maintainer closeout docs.

### Business Value Protected

Retrying failed invoice sync should guide the operator without exposing provider bearer strings, token text, SQL/database details, or raw provider payloads through mutation responses or staged workflow messages. Raw diagnostics remain available server-side for investigation.

### Scope Constraints

- Do not change invoice sync execution, state transitions, persisted `orders.xeroSyncError`, query keys, cache invalidation, tenant scoping, payment reconciliation, revenue recognition, database contracts, or UI layout.
- Keep raw diagnostic persistence unchanged.
- Normalize only mutation response `error` copy and staged failure messages.
- Browser QA is skipped because this is server mutation response/copy behavior with no intended layout, navigation, or interaction change.

### Changes

- Added `formatXeroInvoiceSyncMutationError` to the shared financial/Xero feedback helper.
- Updated unavailable-readiness responses to return safe top-level and staged readiness copy while persisting the raw readiness diagnostic.
- Updated missing customer mapping responses to use category-owned safe copy.
- Updated provider sync failure responses to return safe top-level and staged sync copy while persisting raw `orders.xeroSyncError`.
- Extended invoice sync behavior and facade tests so raw diagnostics are persisted but not returned.
- Extended source contracts to prevent direct `errorMessage` and readiness text from being returned by the invoice sync command.

### Standards Checked

- Domain ownership: invoice Xero mutation copy is owned by the shared financial/Xero feedback helper.
- Route -> component -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only server mutation response copy; route, component, hook, schema, database writes, query keys, and invalidation remain unchanged.
- Query/cache policy: unchanged. `useResyncInvoiceToXero` still invalidates Xero invoice status and list queries.
- Tenant isolation/data integrity: unchanged. Order, customer, line-item, and update paths remain scoped by `ctx.organizationId`; no payment reconciliation, revenue recognition, inventory behavior, or database contracts were touched.
- UI states/error handling: strengthened at the mutation boundary. Callers receive safe workflow-stage copy while server diagnostics remain intact.
- Reviewability: the diff is limited to mutation response formatting, shared feedback classification, focused tests, and this closeout note.

### Smells Removed

- Raw readiness failure text returned from invoice Xero sync responses.
- Raw readiness failure text returned from staged workflow messages.
- Raw provider sync error text returned from top-level mutation responses.
- Raw provider sync error text returned from staged sync failure messages.
- Missing focused tests proving raw persisted diagnostics do not leak through invoice mutation responses.

### Deferred

- Persisted `orders.xeroSyncError` can still contain raw diagnostic text; write-time storage normalization remains a separate persistence-policy slice.
- Xero payment reconciliation/webhook response surfaces still need separate triage.
- Other financial mutation response surfaces may still return raw provider/storage text and should be handled by domain slice, not broad sweep.

### Gates

- Passed: mutation-focused tests, `./node_modules/.bin/vitest run tests/unit/financial/xero-invoice-sync-command-behavior.test.ts tests/unit/financial/xero-sync-contract.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts` - 3 files, 9 tests.
- Passed: broader Xero/finance feedback suite, `./node_modules/.bin/vitest run tests/unit/financial/xero-invoice-sync-command-behavior.test.ts tests/unit/financial/xero-sync-contract.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/orders/order-xero-alert-feedback-contract.test.ts tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/revenue-recognition-xero-sync-behavior.test.ts` - 7 files, 23 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is server mutation response/copy behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, Xero sync execution semantics, payment reconciliation, revenue recognition, inventory behavior, or database contracts; focused tests, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe mutation feedback, domain-owned helper copy, tenant-scoped server functions, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for invoice Xero mutation response feedback. Raw diagnostic text remains in persistence by design, and Xero payment reconciliation/webhook feedback remains a separate financial slice.
