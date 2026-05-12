# Inventory Maintainer Sprint 138: Mobile Receiving Product State Guard

## Status

Closed in commit-ready state.

## Issue 1: Mobile Receiving Could Start Receipts for Server-Rejected Products

### Problem

Manual receiving now rejects products that are not active and inventory-tracked. Desktop receiving and product detail action affordances were aligned, but mobile receiving converted product search hits into `ScannedItem` state without checking product status or tracking policy.

That meant a warehouse operator could scan a service, inactive, or non-inventory product and only discover the problem later at queue sync or receive submit time.

### Workflow Spine

Mobile receiving scan
-> product quick search result
-> product receivability guard
-> scanned item state
-> queue or receive-now action
-> `receiveInventory` server policy.

### Touched Domains

- Mobile inventory receiving route.
- Inventory receiving policy tests.
- Inventory sprint evidence.

### Business Value Protected

Mobile receiving should support fast warehouse work without sending operators into predictable server rejection. Blocking invalid scan hits before queueing protects receiving accuracy and avoids offline queue failures.

### Scope Constraints

- Do not change product quick-search server behavior because it is shared by other product search experiences.
- Do not change receiving server policy, queue storage, sync behavior, location loading, serialization validation, or receipt reason behavior.
- Do not repair existing offline queued items.

### Changes

- Added a mobile receiving product-state guard requiring `status = active`, `isActive = true`, and `trackInventory = true`.
- Invalid scanned products now show operator-safe copy and are not converted into scanned-item state.
- Updated mobile receiving test coverage.

### Standards Checked

- Domain ownership: mobile receiving owns scan affordance policy; inventory receiving server remains authoritative.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: mobile route consumes existing product search hook and mirrors downstream receive policy before queue/submit; no server/cache changes.
- Tenant isolation/data integrity: no tenant query changes; server remains authoritative.
- Transactional inventory/finance integrity: invalid mobile scans are blocked before queueing or transactional stock/valuation writes.
- Serialized lineage continuity: unchanged; serialized receive validation remains server/schema-owned.
- UI states/error handling: invalid scan gets explicit operator-safe feedback.
- Query/cache contract: unchanged.
- Reviewability: one local helper, one scan guard, focused test, one closeout note.

### Smells Removed

- Mobile receiving could create queued receives for products that manual receiving would reject.
- Mobile scan state discarded product policy fields too early.

### Deferred

- Existing offline queued items may still fail on sync if queued before this guard.
- Product quick search could eventually support action-specific filters, but that is a shared search contract slice.
- Browser QA was not selected because this is a mobile route state-policy slice covered by focused tests.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/receiving-location-read-policy.test.tsx`.
- Passed: focused ESLint on touched mobile receiving route and receiving policy test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint does not change serialized mutation behavior.

### Residual Risk

Low to moderate. Existing offline queued items remain outside this slice.
