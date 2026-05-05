# Customers Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Customer List Mutation Feedback Boundary

### Problem

After Sprint 1 hardened customer list read-state copy, the customer list still surfaced raw mutation errors for high-traffic list actions. Single delete, bulk status updates, bulk tag assignment, bulk health-score updates, and bulk delete could pass `error.message` into toasts or operation-result rows. That left customer list operators exposed to database, tenant, transport, or infrastructure wording during daily account maintenance.

### Workflow Spine

Customer list route
-> `CustomersListContainer`
-> customer list single/bulk action handlers
-> customer mutation hooks
-> customer server mutation functions
-> customer list cache invalidation
-> operator-safe mutation feedback and operation result rows.

### Touched Domains

- Customer list container.
- Customer mutation feedback helper.
- Customer hook barrel export.
- Customer mutation feedback tests.

### Business Value Protected

Customer maintenance actions are used to keep dealer, partner, end-user, and commercial account records clean. When a list action fails, operators should get useful customer-domain recovery copy or safe validation messages, not raw database or infrastructure text.

### Scope Constraints

- Do not change customer server functions, schemas, database writes, tenant predicates, query keys, cache invalidation, selection, pagination, sorting, filters, saved filter behavior, rollback behavior, bulk operation success behavior, or read-state copy.
- Preserve safe validation field messages.
- Preserve operation-result row reporting, but sanitize its failure message.
- Only harden customer list action feedback; detail, hierarchy, Xero, saved filters, action plans, communications, and customer-directory alternate flows stay separate.

### Changes

- Added `formatCustomerMutationError` in `src/hooks/customers/_mutation-errors.ts`.
- Exported the formatter from `src/hooks/customers/index.ts`.
- Routed `CustomersListContainer` single delete and bulk status/tag/health/delete failures through the formatter.
- Reused formatted messages in bulk operation-result rows.
- Added focused coverage for code mapping, safe validation messages, unsafe infrastructure suppression, list wiring, and removed raw list mutation feedback patterns.

### Standards Checked

- Domain ownership: customer mutation feedback lives in the customer hooks boundary and is consumed by the customer list container.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side failure copy after existing mutations fail.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw mutation messages are suppressed; safe validation and known code messages remain available.
- Reviewability: the diff is limited to one formatter, one barrel export, customer list catch blocks, focused tests, and this closeout note.

### Smells Removed

- Raw single customer delete `error.message` toast.
- Raw bulk status/tag/health/delete operation-result row messages.
- Generic list-action fallback strings scattered across catch blocks.
- Missing regression coverage for customer list mutation feedback.

### Deferred

- Customer detail delete, hierarchy updates, saved filters, action plans, Xero contact management, communications, directory alternate actions, duplicate dismissal, rollback, and bulk export still have separate feedback debt.
- Browser QA was deferred because this is failure-copy behavior covered by source/helper tests and no route/layout behavior changed.

### Gates

- Passed: focused customer mutation/read set, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-read-state.test.tsx` - 3 files, 9 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 40 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for customer formatter wiring, removed customer list raw mutation feedback patterns, and remaining out-of-scope customer raw feedback paths.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, mutation/cache contracts, domain ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for customer list mutation feedback. The next customer slice should target one remaining concrete workflow such as customer detail delete, hierarchy updates, or Xero contact actions.
