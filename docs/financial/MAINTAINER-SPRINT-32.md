# Financial Maintainer Sprint 32

## Slice

Xero webhook console freshness contract.

## Why This Matters

Xero payment webhooks write payment event rows and may apply order payments while the operator is looking at the Xero console. Those writes happen outside the browser query client, so normal mutation invalidation cannot refresh the open console. Before this slice, the Xero console used only `staleTime`, which means webhook-applied payment events and selected invoice status could remain stale until focus changes, navigation, or incidental refetch.

## Business Value Protected

This protects finance operators during Xero reconciliation. The console should surface newly applied, duplicate, rejected, or unresolved payment events without requiring operators to guess when to refresh the page.

## Workflow Spine

`/financial/xero-sync`
-> route container
-> `useXeroSyncs`
-> `listInvoicesBySyncStatus`
-> Xero invoice status read model.

`/financial/xero-sync?view=payment_events`
-> route container
-> `useXeroPaymentEvents`
-> `listRecentXeroPaymentEvents`
-> `xeroPaymentEvents` audit rows.

Selected invoice remediation:

`/financial/xero-sync?orderId=...`
-> route container
-> `useXeroInvoiceStatus`
-> `getInvoiceXeroStatus`
-> invoice blocker/detail read model.

Each console query now accepts an opt-in `refetchInterval`, and the route opts into a 15 second interval.

## Issue Raised

Sprint 31 hardened the ServerFn tenant boundary for manual Xero payment applies. The remaining webhook path did not need browser cache invalidation because it does not run in the browser, but the operator console needed an explicit freshness policy for externally applied payments.

## Implementation

- Added optional `refetchInterval` support to `useXeroSyncs`.
- Added optional `refetchInterval` support to `useXeroPaymentEvents`.
- Added optional `refetchInterval` support to `useXeroInvoiceStatus`.
- Kept polling opt-in so financial landing cards and order alerts do not inherit extra network churn.
- Set `/financial/xero-sync` to poll invoice sync rows, payment event audit rows, and selected invoice status every 15 seconds.
- Added a source contract to pin route-scoped Xero console polling.

## Standards Checked

- Domain ownership: Xero freshness remains in the financial hook/container boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spines are documented above.
- Query/cache contract: webhook-written Xero console data now has explicit polling freshness where mutation invalidation cannot apply.
- Tenant isolation: unchanged from Sprint 31; this slice does not alter server predicates.
- Transactional finance integrity: unchanged; this slice does not alter payment writes.
- UI states: unchanged; existing loading and error states still come from TanStack Query.
- Operator-safe errors: unchanged.
- Diff reviewability: three hook option additions, one route constant, one source contract, one closeout note.

## Smells Removed

- Xero console freshness relied on stale-time expiry even though payment webhooks are external writes.
- Polling behavior was implicit/nonexistent rather than a route-owned policy.

## Smells Deferred

- Order payment ledger, invoice summary, and financial reporting screens still do not receive realtime invalidation from webhook payment applies. The Xero console now shows webhook activity, but broader cross-page freshness would require realtime events, cache broadcast, or a server-pushed invalidation strategy.
- Browser QA was not run because this slice changes data refresh policy and tests, not layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/separation-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/xero-payment-reconciliation-behavior.test.ts` (4 files, 19 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/financial` (17 files, 71 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.

## Goal Adaptation

No goal text change. Serialized gates remain retired as routine evidence; this slice does not touch serialized lineage.

## Residual Risk

Webhook-applied payments still need a broader cross-page freshness decision if operators expect order detail, invoice summary, financial dashboard, and AR reporting views to update while left open. That should be handled as a realtime/cache-broadcast architecture slice rather than mixed into the Xero console route.
