# Customers Maintainer Sprint 14: Create Wizard Error Boundary

This sprint follows Sprint 13's customer mutation formatter hardening into the live customer creation wizard. The wizard preserved drafts and routed structured validation errors back to the right step, but it still accepted arbitrary thrown `error.message` text for the submit banner and toast.

## Business Value

Customers, dealers, partners, and end users sit at the start of the battery OEM workflow. Failed customer creation should preserve operator input and explain that the operator can retry without exposing database, tenant, JavaScript runtime, or stack details.

Protected value:

- customer creation drafts remain preserved after submit failure
- structured field validation still routes back to the relevant wizard step
- implementation-shaped create failures use stable customer-domain copy
- existing customer mutation formatter policy stays the single unsafe-message classifier

## Workflow Spine

```text
customer wizard submit
  -> onSubmit create workflow
  -> getCustomerCreateSubmissionState
  -> customer mutation unsafe-message policy
  -> submit banner / toast / target wizard step
  -> customer create server function and schema
  -> customer query/cache policy owned by the submit caller
```

## Changes

- Exported the customer unsafe-message classifier from the pure customer mutation formatter module.
- Routed customer wizard submit messages through that classifier before accepting a thrown message.
- Kept existing duplicate-email and nested contact/address validation step routing intact.
- Added focused tests for raw database and raw JavaScript runtime create failures.
- Kept the wizard helper importing the pure formatter module directly rather than the customer hooks barrel, avoiding unrelated hook/server side effects in pure tests.

## Closeout

Touched domains: Customer creation wizard, customer mutation feedback formatter, customer unit tests.

Workflow protected: customer wizard submit -> failed create response -> draft flush -> field error mapping -> safe submit banner/toast -> target wizard step.

Business value: operators can retry failed customer creation with their draft intact while raw implementation messages stay out of the customer create UI.

Standards checked: route/container/server/schema/database/query-key/cache behavior unchanged; customer formatter remains the domain owner for unsafe-message classification; tenant isolation and persistence behavior unchanged; UI state remains honest and retryable.

Smells removed: customer creation submit banner/toast accepting arbitrary database or runtime `error.message` text; accidental pure-helper dependency on the broad customer hooks barrel avoided.

Deferred: customer import-result and broader customer read-state feedback remain separate customer-domain slices when live evidence warrants them. Browser QA was skipped because this slice changes submit failure text only and has focused pure-helper coverage.

Verification:

- `./node_modules/.bin/vitest run tests/unit/customers/customer-create-error-handling.test.ts tests/unit/customers/customer-mutation-errors.test.ts tests/unit/customers/customer-mutation-hooks.test.tsx tests/unit/customers/customer-write-helpers.test.ts` passed, 4 files, 21 tests.
- `./node_modules/.bin/vitest run tests/unit/customers` passed, 14 files, 53 tests.
- `bun run typecheck` passed.
- `bun run lint` passed.
- `git diff --check` passed.

Goal adaptation: declined. The standing maintainer goal already covers operator-safe errors, domain ownership, reviewable diffs, meaningful tests, and evidence-based closeout. The retired serialized gate posture remains unchanged and is not part of this customer create feedback slice.

Residual risk: this protects implementation-shaped submit failures, but customer creation still depends on server-side validation quality for precise per-field guidance.
