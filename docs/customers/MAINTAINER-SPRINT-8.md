# Customers Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Xero Contact Mapping Failure Copy

### Problem

The customer Xero contact manager is live in the customer integration/edit surface. Create, link, and unlink actions already fail closed through the Xero/customer mapping hooks, but their toast descriptions still surfaced raw `error.message`. That could expose Xero integration, database, auth, or transport details while operators are trying to clear invoice-sync blockers.

### Workflow Spine

Customer edit/detail integration surface
-> `XeroContactManager`
-> customer Xero mapping hooks
-> financial Xero server functions
-> customer access checks and Xero contact lookup/create
-> customer Xero contact persistence and cache invalidation
-> operator-safe Xero mapping failure toast.

### Touched Domains

- Customer Xero contact manager.
- Customer mutation feedback helper.
- Customer hook barrel export.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Xero contact mapping gates invoice sync. When a mapping action fails, operators need clear recovery copy without leaking integration internals or persistence details, especially while resolving customer billing blockers.

### Scope Constraints

- Do not change Xero server functions, schemas, customer access checks, organization predicates, Xero lookup/create behavior, customer persistence, query keys, invalidation, success copy, dialog pending guards, or navigation.
- Preserve safe validation copy such as a missing selected Xero contact.
- Keep this as customer-facing Xero contact mapping feedback, not a broader financial integration refactor.
- Do not run serialized gates because this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added `formatCustomerXeroContactMutationError` with Xero-contact-specific fallbacks and code copy.
- Exported the Xero contact formatter from the customer hook barrel for the component.
- Routed create, link, and unlink failure descriptions through the formatter.
- Added focused coverage for Xero not-found copy, unsafe infrastructure suppression, safe validation copy, barrel exposure, and component source wiring.

### Standards Checked

- Domain ownership: Xero contact mapping feedback now uses the customer mutation feedback helper and is consumed by the customer component through the customer hook barrel.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes only client-side failure descriptions after existing Xero/customer mapping mutations fail.
- Query/cache policy: `invalidateXeroCustomerState`, financial Xero query keys, customer detail invalidation, and customer list invalidation are unchanged.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, Xero operation, customer database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw Xero mapping messages are suppressed; Xero-contact-specific fallback copy and safe validation messages remain available.
- Reviewability: the diff is limited to one formatter extension, one barrel export, three toast descriptions, focused tests, and this closeout note.

### Smells Removed

- Raw create Xero contact `error.message` description.
- Raw link Xero contact `error.message` description.
- Raw unlink Xero contact `error.message` description.
- Generic `Unknown error` fallbacks in Xero contact mapping toasts.
- Missing regression coverage for Xero contact mapping failure descriptions.

### Deferred

- Duplicate dismissal, rollback, communications, and export feedback still have separate operator-feedback debt.
- Xero mapping read-state and Xero search result UX were not changed.
- Browser QA remains deferred because no route layout or interaction structure changed.

### Gates

- Passed: focused customer mutation/Xero tests, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/xero-contact-manager.test.tsx` - 2 files, 7 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 45 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for Xero contact formatter wiring and removed raw Xero failure descriptions.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for customer Xero contact mapping mutation feedback. The next customer slice should target another supported workflow with raw feedback, likely duplicate dismissal, rollback, communications, or export feedback.
