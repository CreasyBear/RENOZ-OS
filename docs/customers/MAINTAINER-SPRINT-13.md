# Customers Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Customer Mutation Implementation-Message Boundary

### Problem

Customer mutation surfaces already route through a shared formatter, but the formatter still allowed client-status or statusless messages through when they did not match the older backend-leak patterns. If a customer write, saved filter, action plan, duplicate dismissal, rollback, hierarchy update, or Xero contact mapping returned JavaScript runtime text or SQL-shaped details, operators could see implementation copy instead of customer-domain recovery guidance.

### Workflow Spine

Customer route or container action
-> customer mutation hook or component mutation
-> `formatCustomerMutationError` or action-specific wrapper
-> customer server function and schema failure
-> safe validation/code copy or action-specific fallback
-> operator toast and retry/correction decision.

### Touched Domains

- Customer mutation feedback formatting.
- Customer saved-filter mutation feedback.
- Customer Xero-contact mapping feedback.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Customers, dealers, partners, and end users sit at the front of RENOZ Energy's battery operations spine. Failed customer writes should tell an operator whether to correct the record or retry, not expose JavaScript runtime, SQL, database, or stack-shaped internals.

### Scope Constraints

- Do not change customer hooks, server functions, schemas, database queries, tenant predicates, cache invalidation, mutation behavior, rollback behavior, Xero contact mapping behavior, or UI layout.
- Preserve safe customer validation messages, known code mappings, and action-specific fallback copy.
- Treat implementation-shaped messages as unsafe even when they arrive with a 4xx status or as a plain thrown `Error`.

### Changes

- Extended the customer unsafe-message classifier to include SQL phrases, JavaScript runtime error names, `not a function`, `Cannot read/set properties of undefined/null`, and stack-frame-shaped text.
- Added focused coverage for generic customer mutation fallback behavior.
- Added focused coverage for saved-filter SQL fallback behavior.
- Added focused coverage for Xero-contact runtime-error fallback behavior.
- Kept existing safe validation, code mapping, action-plan, rollback, duplicate, and hook wiring tests intact.

### Standards Checked

- Domain ownership: customer mutation feedback remains owned by the customer formatter and workflow-specific wrappers.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only client feedback formatting after existing mutation failures.
- Query/cache policy: unchanged. No customer query keys, invalidations, stale behavior, or rollback cache contracts changed.
- Tenant isolation/data integrity: unchanged. No organization predicates, customer records, hierarchy links, Xero mappings, duplicate audit writes, saved filters, action plans, or rollback persistence changed.
- UI states/error handling: strengthened. Customer mutation toasts no longer pass through implementation-shaped messages.
- Reviewability: one formatter branch, one focused test expansion, and this closeout note.

### Smells Removed

- Permissive raw-message pass-through for implementation-shaped customer mutation errors.
- Missing tests for JavaScript runtime and SQL-shaped customer mutation feedback.

### Deferred

- Customer read-state, import-result, and workflow-specific UI decomposition remain separate slices.
- Broader non-customer mutation formatter adoption remains a cross-domain future slice.
- Browser QA was deferred because this is formatter behavior with no intended visual layout change.

### Gates

- Passed: focused customer mutation formatter set, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-write-helpers.test.ts` - 3 files, 16 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 51 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Declined. The standing maintainer process already covers operator-safe errors, customer-domain ownership, meaningful tests, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for customer mutation formatter safety. Moderate across customer workflows because read-state and import-result feedback still need separate live-evidence triage before further cleanup.
