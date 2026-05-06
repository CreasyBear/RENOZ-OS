# Financial Maintainer Sprint 45: Xero Payment Event Audit Read Model

## Status

Closed in commit-ready state.

## Issue 1: Payment Event Audit Exposes Integration Internals

### Problem

Sprint 44 made public Xero webhook responses and logs safe, but the authenticated Xero remediation console still read and rendered raw payment-event payload summaries. The payment event sheet exposed raw Xero invoice IDs, payment IDs, dedupe keys, and JSON payload details that are not useful operator UI and make the audit surface harder to reason about.

### Workflow Spine

Xero payment event audit workflow
-> financial remediation console
-> payment event query
-> `listRecentXeroPaymentEvents`
-> tenant-scoped `xeroPaymentEvents` read
-> `buildXeroPaymentEventRecord`
-> `XeroPaymentEventRecord`
-> `XeroSyncStatus` payment event table and sheet.

### Touched Domains

- Financial operations.
- Xero payment event audit read model.
- Xero remediation console UI.
- Shared financial read-model mapping.
- Xero/payment event contract tests.
- Financial maintainer closeout docs.

### Business Value Protected

Payment event audit needs to help an operator understand whether Xero cash application was applied, duplicated, rejected, or left unmatched. The console should show linked order context, amount, date, reference, and safe outcome copy without making the app feel like a raw integration debugger.

### Scope Constraints

- Do not change webhook signature verification, webhook ingestion, persisted `xeroPaymentEvents` payloads, dedupe policy, payment ledger writes, order balance projection, transaction boundaries, query keys, cache invalidation, or route access control.
- Keep tenant scoping on the `xeroPaymentEvents.organizationId` read.
- Keep the local linked order ID in the authenticated UI because it powers the operator order link.
- Browser QA is not required for this slice; layout behavior changed only from a raw JSON block to structured fields covered by component tests and typecheck.

### Changes

- Added `buildXeroPaymentEventRecord` as a pure financial read-model mapper.
- Removed raw `xeroPaymentEvents.payload` selection from `listRecentXeroPaymentEvents`.
- Replaced inline payment-event mapping in `xero-operations.ts` with the shared mapper.
- Changed the client contract from raw ID-shaped fields to explicit display labels: `eventKeyLabel`, `xeroInvoiceLabel`, and `paymentSourceLabel`.
- Replaced the remediation console's raw `JSON.stringify(event.payloadSummary)` block with structured event summary rows.
- Removed visible dedupe-key/payment-ID language from the payment event sheet.
- Added focused contract tests proving raw Xero identifiers and payload dumps stay out of the read model and UI source.

### Standards Checked

- Domain ownership: payment event audit display shaping now lives in financial shared read-model code, not the page component.
- Route -> server function -> schema/database -> UI flow: preserved and clarified. The server function still owns auth/query; the mapper owns display-safe contract shaping; the component renders the typed contract.
- Query/cache policy: unchanged. No hooks, query keys, cache keys, invalidation, or mutation flows changed.
- Tenant isolation/data integrity: unchanged. The read remains scoped by `ctx.organizationId`; payment ledger and webhook persistence behavior are untouched.
- Transactional finance integrity: unchanged. No payment application, duplicate handling, or balance projection code changed.
- UI states/error handling: strengthened. The audit sheet now shows operator-safe summary fields rather than raw integration JSON.
- Reviewability: the diff is limited to one mapper, one server read function, one schema contract, one component surface, focused tests, and this closeout note.

### Smells Removed

- Raw Xero payload JSON selected for a UI read that did not need it.
- Raw invoice/payment/dedupe identifiers returned and rendered in the remediation console.
- Read-model transformation embedded directly inside a server function.
- Misleading UI copy encouraging operators to inspect exact dedupe keys.
- Payment event contract fields named like raw IDs when the UI needs safe display labels.
- Missing tests around the authenticated payment event audit boundary.

### Deferred

- Persisted `xeroPaymentEvents.payload`, `dedupeKey`, `xeroInvoiceId`, and `paymentId` still store compact integration audit data. Changing write-time retention/redaction is a separate persistence policy decision.
- The remediation console still uses a broad `XeroSyncStatus` component for invoices and payment events. A future UI slice could extract payment-event audit into its own focused component if the console grows.
- Browser QA could be added for the full remediation console if future work changes layout density, navigation, or modal/sheet behavior more substantially.

### Gates

- Passed: focused financial/Xero tests, `./node_modules/.bin/vitest run tests/unit/financial/xero-payment-event-read-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/financial/xero-payment-reconciliation-behavior.test.ts` - 3 files, 12 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, payment ledger transaction semantics, invoice sync execution, revenue recognition, inventory behavior, or database contracts.
- Skipped: browser QA because this is a narrow authenticated audit read-model/UI rendering change covered by component tests and typecheck, with no route, navigation, or interaction contract change.

### Goal Adaptation

Accepted the latest maintainer-goal adjustment: unrelated serialized-gate bookkeeping is no longer part of sprint closeout. This slice did not touch serialized lineage.

### Residual Risk

Low for authenticated payment event audit leakage. Operators can still see payment reference text because it is business context for cash application; if references prove sensitive in practice, a future policy slice can classify or mask them separately.
