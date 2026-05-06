# Financial Maintainer Sprint 33

## Slice

Webhook-applied payment ledger detail freshness.

## Why This Matters

Xero payment webhooks can insert order payment ledger rows and recalculate payment projection while an operator is already viewing an order or invoice. Sprint 32 kept the Xero console fresh, but order detail and invoice detail still had payment-ledger subqueries without an explicit external-write freshness policy.

## Business Value Protected

This protects finance and order operators from reading stale payment history after Xero applies a battery order payment. The visible order/invoice detail surfaces should converge on the imported payment without the operator needing to navigate away or guess whether the Xero webhook has landed.

## Workflow Spine

External write:

`/api/webhooks/xero`
-> `processXeroPaymentWebhookEvents`
-> `applyXeroPaymentUpdate`
-> `orderPayments` insert
-> `updateOrderPaymentStatus`
-> order payment projection update.

Order detail read:

`/orders/$orderId`
-> `OrderDetailContainer`
-> `useOrderDetailComposite`
-> `useOrderDetailContainerActions`
-> `useOrderPayments` and `useOrderPaymentSummary`
-> `queryKeys.orders.payments(orderId)` and `queryKeys.orders.paymentSummary(orderId)`.

Invoice detail read:

`/financial/invoices/$invoiceId`
-> `InvoiceDetailContainer`
-> `useInvoiceDetail`
-> `useInvoice`
-> `useOrderPayments`
-> invoice detail and payment ledger query keys.

## Issue Raised

Order detail already polls the main order read model, but the payment ledger and payment summary queries were not attached to that external-write freshness policy. Invoice detail also needed opt-in invoice polling so webhook-updated paid amount, balance due, and payment status could refresh with the ledger rows.

## Implementation

- Added optional `refetchInterval` support to `useInvoice`.
- Added optional `refetchInterval` support to `useInvoiceDetail`.
- Routed order detail payment list and payment summary queries through a route-owned payment ledger polling interval.
- Disabled order detail payment ledger polling while interaction dialogs are open, matching the existing order detail polling behavior.
- Routed invoice detail and invoice payment history through a 30 second payment freshness interval.
- Added a source contract to pin order and invoice detail payment freshness behavior.

## Standards Checked

- Domain ownership: Xero remains financial; payment ledger reads remain order-owned; invoice detail owns invoice read freshness.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spines are documented above.
- Query/cache contract: externally applied payments now have explicit detail-surface polling where browser mutation invalidation cannot apply.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; webhook payment writes remain on the existing transaction path.
- UI states: unchanged; existing TanStack Query loading/error states continue to apply.
- Operator-safe errors: unchanged.
- Diff reviewability: two hook option additions, two container polling policies, one source contract, one closeout note.

## Smells Removed

- Order detail payment history and summary could remain stale while the parent order detail refreshed.
- Invoice detail could show stale balance/payment state after an external Xero payment apply.
- External-write freshness was implicit and inconsistent across Xero console, order detail, and invoice detail.

## Smells Deferred

- Financial dashboard, AR aging, outstanding invoice lists, and reminder candidate pages still need a broader realtime/cache-broadcast or polling decision for webhook-applied payments.
- Browser QA was not run because this slice changes data freshness policy and tests, not layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-payment-ledger-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/finance/query-normalization-wave5d.test.tsx tests/unit/financial/xero-payment-reconciliation-behavior.test.ts` (4 files, 29 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/orders tests/unit/finance tests/unit/financial` (67 files, 261 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.

## Goal Adaptation

No goal text change. Serialized gates remain retired as routine evidence; this slice does not touch serialized lineage.

## Residual Risk

The remaining webhook freshness problem is reporting-level, not detail-level: dashboard, AR aging, outstanding invoices, top customers, and reminder candidate views need a shared external-write freshness strategy.
