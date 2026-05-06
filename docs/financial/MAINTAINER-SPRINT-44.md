# Financial Maintainer Sprint 44: Xero Payment Webhook Feedback

## Status

Closed in commit-ready state.

## Issue 1: Xero Payment Webhook Result Leakage

### Problem

Invoice and revenue-recognition Xero sync responses were hardened, but Xero payment webhook processing could still return raw reconciliation details through public webhook responses and route logs. Failed tenant resolution echoed tenant IDs, payment lookup failures echoed payment IDs, retryable provider failures could include provider/token text, and batch results could expose local order IDs, organization IDs, invoice IDs, or payment IDs.

### Workflow Spine

Xero payment webhook workflow
-> `/api/webhooks/xero`
-> signature verification
-> webhook payload schema
-> `processXeroPaymentWebhookEvents`
-> `applyXeroPaymentWebhookEvent`
-> tenant-to-organization resolution
-> Xero payment lookup
-> `applyXeroPaymentUpdate`
-> tenant-scoped order lookup and transactional payment ledger insert
-> payment event result update
-> safe webhook batch result.

### Touched Domains

- Financial operations.
- Xero payment reconciliation.
- Xero webhook API responses/log payloads.
- Payment event audit result summaries.
- Shared Xero feedback helper.
- Financial webhook/reconciliation tests.
- Financial maintainer closeout docs.

### Business Value Protected

Xero payment webhooks drive cash application and payment ledger integrity. Public webhook responses and logs should communicate retry/accept policy without exposing tenant IDs, organization IDs, order IDs, invoice IDs, payment IDs, provider payloads, token text, or storage details.

### Scope Constraints

- Do not change signature verification, webhook parsing, payment lookup, dedupe policy, transaction boundaries, order payment ledger writes, order payment projection updates, persisted `xeroPaymentEvents` payload shape, query keys, cache policy, or UI layout.
- Keep authenticated/direct `applyXeroPaymentUpdate` success details available for internal server callers.
- Normalize public webhook failure copy and batch result summaries only.
- Browser QA is skipped because this is server webhook/result-shaping behavior with no intended layout, navigation, or interaction change.

### Changes

- Added `formatXeroPaymentWebhookError` to the shared financial/Xero feedback helper.
- Replaced raw unknown-invoice and rejected payment apply response copy with safe reconciliation messages.
- Replaced missing tenant, tenant-resolution, payment-resource, and payment-load failure responses with safe webhook copy.
- Removed tenant, organization, and payment IDs from webhook failure response objects.
- Added a batch result summarizer so public webhook responses/log payloads expose only success, result state, duplicate/retry policy, and safe error copy.
- Preserved duplicate counting and retry-vs-accepted batch policy using raw internal results before summarization.
- Added focused tests for tenant-resolution safety and webhook batch result sanitization.

### Standards Checked

- Domain ownership: Xero webhook feedback copy is owned by the shared financial/Xero feedback helper.
- Route -> API route -> server function -> schema/database -> transaction -> result summary: preserved. This sprint changes only response/result shaping around existing reconciliation behavior.
- Query/cache policy: unchanged. No hooks, query keys, invalidation, or read models changed.
- Tenant isolation/data integrity: unchanged. Tenant resolution, organization-scoped order lookup, transaction-scoped payment insert, and order payment projection update remain intact.
- Transactional finance integrity: preserved. Payment ledger insert and order status projection still execute inside the existing transaction; duplicate and rejected event states remain recorded.
- UI states/error handling: strengthened at the webhook boundary. Payment event audit read copy already uses result-state-owned messages.
- Reviewability: the diff is limited to webhook feedback formatting, payment reconciliation result shaping, focused tests, and this closeout note.

### Smells Removed

- Tenant IDs echoed in webhook failure responses.
- Organization/payment IDs echoed in failed webhook processing responses.
- Local order and invoice IDs exposed in public webhook batch summaries.
- Raw provider/token/storage text returned in retryable webhook batch errors.
- Missing tests proving public webhook results are safe summaries rather than raw reconciliation objects.

### Deferred

- Persisted `xeroPaymentEvents.payload` still stores compact payment/invoice identifiers for audit; write-time redaction policy remains a separate persistence decision.
- Route-level tests currently mock `processXeroPaymentWebhookEvents`; deeper route body assertions against the real processor can be added in a future integration-style test.
- Other financial webhook/mutation surfaces should continue to be triaged by domain slice.

### Gates

- Passed: focused webhook/reconciliation tests, `./node_modules/.bin/vitest run tests/unit/financial/xero-payment-reconciliation-behavior.test.ts tests/unit/financial/xero-webhook-batch-policy.test.ts tests/unit/routes/xero-webhook-route.test.ts` - 3 files, 14 tests.
- Passed: broader Xero/webhook feedback suite, `./node_modules/.bin/vitest run tests/unit/financial/xero-payment-reconciliation-behavior.test.ts tests/unit/financial/xero-webhook-batch-policy.test.ts tests/unit/routes/xero-webhook-route.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/orders/order-xero-alert-feedback-contract.test.ts` - 6 files, 22 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is server webhook/result-shaping behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, payment ledger transaction semantics, invoice sync execution, revenue recognition, inventory behavior, or database contracts; focused tests, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe error handling, tenant isolation, transactional finance integrity, domain-owned helper copy, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for public Xero payment webhook result leakage. The persisted compact payment event payload still includes payment/invoice identifiers for audit, and route tests mock the processor, so future integration coverage could verify the complete route-to-processor body contract.
