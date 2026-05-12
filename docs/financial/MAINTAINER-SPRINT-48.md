# Financial Maintainer Sprint 48: Xero Payment Event Query-Key Ownership

## Status

Closed in commit-ready state.

## Issue 1: Xero Payment Event Pages Appended Pagination Inline

### Problem

`useXeroPaymentEvents` queried paged Xero webhook/payment-event audit rows by appending `{ page, pageSize }` inline to `queryKeys.financial.xeroPaymentEvents()`. The shape was compatible with Xero payment-event root invalidation, but the paged read contract belonged in the centralized financial query-key registry.

### Workflow Spine

`/financial/xero-sync`
-> `useXeroPaymentEvents`
-> `listRecentXeroPaymentEvents`
-> tenant-scoped `xeroPaymentEvents` audit rows
-> `queryKeys.financial.xeroPaymentEventsList`.

### Touched Domains

- Financial/Xero sync hook.
- Central query-key registry.
- Financial query-key contract test.
- Financial maintainer closeout docs.

### Business Value Protected

Xero payment events are the operator audit surface for external payment reconciliation. Keeping paged event reads under a named financial query key makes cache policy easier to review when webhook retry, polling, or manual refresh behavior changes.

### Scope Constraints

- Do not change webhook ingestion, persisted payment-event payloads, tenant scoping, read-result normalization, pagination defaults, refetch intervals, or Xero UI behavior.
- Preserve the existing query-key shape under `queryKeys.financial.xeroPaymentEvents()`.
- Keep this slice limited to query-key centralization.

### Changes

- Added `queryKeys.financial.xeroPaymentEventsList(filters)`.
- Replaced inline payment-event pagination key assembly in `useXeroPaymentEvents`.
- Extended the financial query-key contract to prove root prefix behavior, page distinction, preserved shape, and hook usage.

### Standards Checked

- Domain ownership: Xero payment-event cache ownership now lives in `queryKeys.financial`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through the Xero sync page read hook, server read, audit rows, and named query key.
- Tenant isolation/data integrity: unchanged; server-side tenant-scoped read remains untouched.
- Transactional inventory/finance integrity: unchanged; this is an audit-read cache-key slice.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: read-result fallback behavior unchanged.
- Query/cache contract: improved and covered by focused contract.
- Reviewability: one query-key helper, one hook replacement, one test extension, one closeout note.

### Smells Removed

- Inline financial/Xero payment-event pagination key assembly inside the hook.
- Hidden paged-read cache ownership for Xero payment event audit rows.

### Deferred

- Webhook-driven client freshness remains deferred; polling/realtime policy for external Xero events is a separate financial reliability slice.
- Persisted Xero event payload retention/redaction remains a persistence policy slice.
- Browser QA remains deferred because this changes cache-key ownership only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/xero-payment-event-read-contract.test.ts tests/unit/financial/separation-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/lib/query-keys.ts src/hooks/financial/use-xero-sync.ts tests/unit/financial/query-key-contract.test.tsx --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues centralized query-key cleanup under the standing maintainer goal.

### Residual Risk

Low. The query-key shape is preserved exactly while ownership moves to the central financial registry.
