# Customers Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Action Plan Mutation Failure Copy

### Problem

Customer health action plans are live through `HealthDashboardContainer`, but create, update, delete, and complete mutations still toasted raw `error.message`. That left a supported health-recovery workflow able to expose database, tenant, auth, transport, or infrastructure wording while operators manage customer improvement tasks.

### Workflow Spine

Customer detail route
-> health dashboard
-> `HealthDashboardContainer`
-> `HealthDashboardPresenter`
-> action plan hooks
-> action plan server functions
-> `customerActionPlans` persistence and audit log writes
-> action plan/customer health query invalidation
-> operator-safe action plan failure toast.

### Touched Domains

- Customer mutation feedback helper.
- Customer action plan hooks.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Action plans turn customer health signals into follow-up work for RENOZ operators. If creating, updating, deleting, or completing those tasks fails, the app should show actionable customer-domain copy without leaking persistence details.

### Scope Constraints

- Do not change action plan server functions, schemas, auth/permission checks, organization predicates, transactions, audit log writes, query keys, invalidation, success copy, health dashboard UI, or customer health reads.
- Preserve safe validation field messages such as "Action plan is already completed".
- Keep this as an action-plan mutation feedback slice only.
- Do not run serialized gates because this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added `formatCustomerActionPlanMutationError` with action-plan-specific fallbacks and code copy.
- Routed create, update, delete, and complete action plan mutation failures through the formatter.
- Added focused coverage for action-plan not-found copy, unsafe database suppression, safe validation copy, and source wiring.

### Standards Checked

- Domain ownership: action plan mutation feedback now lives beside other customer mutation feedback instead of local raw-message branches.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes only client-side failure copy after existing action plan mutations fail.
- Query/cache policy: action plan and customer health invalidation behavior is unchanged.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, transaction, audit log write, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unsafe raw action plan mutation messages are suppressed; action-plan-specific fallback copy and safe validation messages remain available.
- Reviewability: the diff is limited to one formatter extension, one hook import/catch rewrite, focused tests, and this closeout note.

### Smells Removed

- Raw action plan create `error.message` toast.
- Raw action plan update `error.message` toast.
- Raw action plan delete `error.message` toast.
- Raw action plan complete `error.message` toast.
- Missing regression coverage for customer action plan mutation feedback.

### Deferred

- Xero contact actions, duplicate dismissal, rollback, communications, and export feedback still have separate operator-feedback debt.
- Action plan UI/UX was not reviewed in this slice.
- Browser QA remains deferred because no route layout or interaction structure changed.

### Gates

- Passed: focused customer mutation feedback test, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts` - 1 file, 5 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 44 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for action plan formatter wiring and removed raw action plan mutation fallbacks.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for customer action plan mutation feedback. The next customer slice should target another supported workflow with raw feedback, likely Xero contact actions, duplicate dismissal, rollback, communications, or export feedback.
