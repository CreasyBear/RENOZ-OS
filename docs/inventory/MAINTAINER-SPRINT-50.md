# Inventory Maintainer Sprint 50

This sprint follows Sprint 49's supplier price import date-window integrity cleanup. The target is supplier price import template domain cleanliness: the operator-facing CSV template should use RENOZ battery OEM examples, not generic office-product sample data.

Status: Closed after Issue 1.

## Business Value

Import templates are product surface. A supplier price import template full of office chairs and standing desks makes the operations platform feel generic and undermines confidence for RENOZ Energy battery procurement workflows.

## Workflow Spine

supplier price import template
-> published CSV headers
-> sample supplier/product rows
-> operator CSV preparation
-> price-import validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import template sample data and contract coverage.
- Preserve import parsing, validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into pricing CRUD, template download UX, live database fixtures, or supplier/product seed data.

## Issue Ledger

### 1. Supplier Price Import Template Used Generic Office Examples

Problem:

- The price import template shipped sample rows for `Office Depot`, `Office Chair`, `TechCorp Solutions`, and `Standing Desk`.
- Those examples do not match RENOZ Energy's lithium-ion battery OEM operating context.
- The template had no direct contract coverage to keep sample rows aligned to headers or prevent generic examples from returning.

Workflow protected:

template generation -> sample rows -> operator CSV preparation -> price-import validation.

Implemented slice:

- Extracted template headers and sample rows into named constants.
- Replaced generic office-product examples with RENOZ lithium battery procurement examples.
- Added focused contract coverage for sample row/header alignment and battery-domain examples.

Out of scope:

- Changing CSV parsing, import validation, supplier/product resolution, or execution semantics.
- Changing UI controls or download behavior.
- Adding real supplier/product seed fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import template contract tests, inventory sprint evidence.
- Workflow protected: supplier price import template -> published CSV headers -> sample supplier/product rows -> operator CSV preparation -> price-import validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: the import template now reflects RENOZ Energy's battery OEM procurement context instead of generic office procurement.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; template constants are exported for direct contract coverage.
- Tenant isolation and data integrity checked: no tenant predicates, supplier/product resolution, persistence, receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: generic sample data made an operator-facing workflow feel unrelated to RENOZ Energy, and template rows had no direct alignment coverage.
- Smells deferred: real supplier/product seed fixtures; template download UX review; live validate/execute import fixtures with seeded supplier/product data.
- Gates run: focused supplier price import/template tests; focused ESLint; supplier + purchase-order unit suites (`31` files, `85` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server template-content and contract-test correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers domain cleanliness, business value, meaningful tests, and evidence-based closeout.
- Residual risk: the template samples are representative but not tied to live supplier/product seed data; seeded fixtures remain needed for end-to-end import confidence.
