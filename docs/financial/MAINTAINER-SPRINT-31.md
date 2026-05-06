# Financial Maintainer Sprint 31

## Slice

Xero payment update tenant boundary.

## Why This Matters

Xero payment reconciliation writes real `orderPayments` rows and recalculates order payment projection. The webhook route verifies the Xero signature and resolves organization from the Xero tenant, but the exported `handleXeroPaymentUpdate` ServerFn facade delegated directly to the shared write helper and accepted an optional caller-supplied `organizationId`.

## Business Value Protected

This protects imported payment integrity across tenants. A manual/API payment apply must not be able to choose which RENOZ organization receives a Xero payment write; the organization must come from the authenticated session.

## Workflow Spine

`handleXeroPaymentUpdate`
-> `withAuth({ permission: PERMISSIONS.financial.update })`
-> session-derived `organizationId`
-> `applyXeroPaymentUpdate`
-> `xeroPaymentEvents` dedupe row
-> tenant-scoped order lookup by `xeroInvoiceId`
-> `orderPayments` insert
-> `updateOrderPaymentStatus`
-> event result update.

The webhook spine remains separate:

`/api/webhooks/xero`
-> signature verification
-> `processXeroPaymentWebhookEvents`
-> `applyXeroPaymentWebhookEvent`
-> Xero tenant resolution through active OAuth connection
-> `applyXeroPaymentUpdate`.

## Issue Raised

The shared reconciliation helper is appropriate for both webhook and manual apply paths, but only the webhook path had an external trust boundary before the helper. The ServerFn facade needed its own auth and tenant derivation before calling the shared write helper.

## Implementation

- Required `PERMISSIONS.financial.update` in `handleXeroPaymentUpdate`.
- Overrode any caller-supplied `organizationId` with `ctx.organizationId`.
- Added a focused contract test proving payment applies use the authenticated organization instead of the request payload.
- Preserved the webhook path and shared reconciliation helper behavior.

## Standards Checked

- Domain ownership: Xero payment reconciliation remains in the financial domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: this slice protects the server function -> schema/database write boundary for payment reconciliation.
- Tenant isolation: strengthened; ServerFn callers can no longer choose the organization for Xero payment writes.
- Transactional finance integrity: unchanged; payment insert and projection still occur through the existing transaction.
- Query/cache contract: unchanged; this slice does not add client cache behavior.
- UI states: unchanged.
- Operator-safe errors: unchanged.
- Diff reviewability: one ServerFn boundary change, one focused contract update, one closeout note.

## Smells Removed

- Payment-writing ServerFn without explicit `financial.update` permission.
- Trusting a caller-supplied `organizationId` on a tenant-sensitive finance write path.

## Smells Deferred

- Webhook-driven client freshness remains separate from mutation invalidation because webhook writes occur outside the browser query client. The Xero sync/payment event console likely needs a polling or realtime freshness contract in a separate slice.
- Browser QA was not run because this slice changes server authorization and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/xero-sync-contract.test.ts tests/unit/financial/xero-payment-reconciliation-behavior.test.ts tests/unit/financial/xero-invoice-sync.test.ts tests/unit/financial/xero-webhook-batch-policy.test.ts tests/unit/financial/finance-projection-trace.test.ts` (5 files, 24 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 70 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.

## Goal Adaptation

No goal text change. Serialized gates remain retired as routine evidence; this slice does not touch serialized lineage.

## Residual Risk

The next Xero slice should handle client freshness for webhook-applied payments: Xero payment events, selected invoice status, order payment ledger views, invoice summaries, and financial reporting may need polling, realtime, or explicit operator refresh semantics.
