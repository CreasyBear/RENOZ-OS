# Operations Maintainer Sprint 84: Project Create Relation Scope

## Status

Closed in commit-ready state.

## Issue 1: Project Creation Trusted Customer And Order IDs Without Tenant Scope

### Problem

`createProject` accepted `customerId` and optional `orderId` directly from the request and inserted them into the project row without proving that the related customer and order belonged to the current organization. It also did not prove that an optional order belonged to the selected customer.

### Workflow Spine

Project create dialog
-> `useCreateProject`
-> `createProject`
-> `customers`, `orders`, `projects`, `project_members`
-> `queryKeys.projects.lists()`, new project detail, and customer project invalidation
-> formatted operator-safe mutation feedback.

### Touched Domains

- Jobs project create server function.
- Customer/order relation validation used by project creation.
- Project create/member/active/action source-contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Projects are operational containers for customer work. A project must not point at a customer from another tenant, a deleted customer, a deleted order, or an order that belongs to a different customer. That protects project history, customer context, order continuity, and downstream warehouse/support/warranty work that may rely on these anchors.

### Scope Constraints

- Do not change the project create form UI.
- Do not change createProject payload schema.
- Do not allow project customer/order edits; update schema still does not expose those fields.
- Do not change order/customer schemas or database constraints.
- Do not change query keys or cache invalidation behavior.
- Do not reopen serialized gates for this non-serialized create relation slice.

### Changes

- Imported `customers` and `orders` into the project server function.
- Added `assertProjectCustomerScope` to require:
  - `customers.id = customerId`
  - `customers.organizationId = organizationId`
  - `customers.deletedAt IS NULL`
- Added `assertProjectOrderScope` to require:
  - `orders.id = orderId`
  - `orders.customerId = customerId`
  - `orders.organizationId = organizationId`
  - `orders.deletedAt IS NULL`
- `createProject` now runs those validations before generating a project number or inserting the project.
- Relation validation failures use `ValidationError` with field-specific messages for operator-safe UI formatting.
- Added `project-create-relation-scope-contract.test.ts`.
- Loosened one brittle member-contract import assertion so it continues to protect member dependencies without pinning the full `drizzle/schema` import list.

### Standards Checked

- Domain ownership: project creation owns its customer/order relation preflight before writing the project row.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked create dialog hook flow, create server function, customer/order/project schema columns, and existing cache invalidation.
- Tenant isolation/data integrity: improved. Project creation now proves customer and order tenant ownership and customer/order consistency.
- Safe mutation/cache contracts: preserved. `useCreateProject` invalidation behavior was not changed.
- Honest UI states/operator-safe errors: improved. Relation failures are typed validation errors with field messages.
- Reviewability: the diff is bounded to createProject relation validation, one focused test, one adjacent brittle test expectation, and this closeout.

### Smells Removed

- Cross-tenant customer reference risk in project creation.
- Cross-tenant or deleted order reference risk in project creation.
- Order/customer mismatch risk in project creation.
- Brittle import-list assertion in the project member mutation contract test.

### Deferred

- Database-level composite foreign keys for organization-scoped relationships remain out of scope.
- Project customer/order reassignment remains unsupported and unaudited because update schema does not expose those fields.
- Existing historical project rows with invalid customer/order anchors are not backfilled by this sprint.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-create-relation-scope-contract.test.ts tests/unit/jobs/project-create-edit-mutation-contract.test.ts tests/unit/jobs/project-active-record-contract.test.ts` - 3 files, 4 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-create-relation-scope-contract.test.ts tests/unit/jobs/project-create-edit-mutation-contract.test.ts tests/unit/jobs/project-active-record-contract.test.ts tests/unit/jobs/project-actions-mutation-contract.test.ts tests/unit/jobs/project-members-mutation-contract.test.ts` - 5 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: serialized gates. They are retired as routine closeout evidence and this slice did not touch serialized lineage, inventory identity, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data-integrity implications, safe mutation/cache contracts, operator-safe errors, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for new project creation relation scope. Medium for historical data quality until invalid legacy project anchors are audited or repaired.
