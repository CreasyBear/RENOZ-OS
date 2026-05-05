# Maintainer Sprint 29 - Policy Form Save Toast Ownership

## Slice

The warranty policy form dialog had the same mutation ownership smell as the recent detail flows: policy create/update hooks already own normalized success/error toasts and cache invalidation, but the dialog imported `sonner` and emitted a generic save failure toast when `onSubmit` rejected.

## Workflow Spine Protected

Warranty policy settings route -> settings container -> policy form dialog -> create/update policy hooks -> warranty policy server functions -> centralized policy query invalidation -> operator toast.

## Business Value Protected

Warranty policies drive product coverage terms, SLA windows, defaults, and claim expectations. Operators need a single clear failure message when saving policy rules, not duplicate or contradictory generic toasts that hide the actual backend validation/problem.

## Change

- Removed the policy form dialog's local `sonner` dependency.
- Removed the generic dialog-level save failure toast.
- Kept create/edit payload construction, success close behavior, and pending dialog guards unchanged.
- Added a source-contract test that pins policy save toast ownership to `useCreateWarrantyPolicy` and `useUpdateWarrantyPolicy`.

## Standards Checked

- Domain ownership: policy mutation hooks own policy save success/error toasts; the dialog owns form state and payload assembly.
- Route -> container -> hook flow: the settings container still dispatches create/update through the existing policy hooks.
- Query/cache policy: policy hook invalidations are unchanged.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: failed saves now surface the normalized hook error instead of a generic duplicate dialog toast.
- Reviewability: the diff is limited to one dialog, one source-contract test, and this closeout note.

## Smells Removed

- Removed duplicate policy save failure feedback.
- Removed a local dialog dependency on `sonner` for mutation failure handling.

## Deferred

- Bulk warranty import still has dialog-level preview/import toasts. That workflow is broader because preview and register are separate dialog-owned states, so it should be handled in its own slice.
- Policy settings list actions already delegate errors to hooks and were left unchanged.

## Gates

- Focused policy form contract test: `bunx vitest run tests/unit/warranty/warranty-policy-form-dialog-action-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts` passed, 2 files / 5 tests.
- Focused ESLint: `bunx eslint src/components/domain/warranty/dialogs/warranty-policy-form-dialog.tsx tests/unit/warranty/warranty-policy-form-dialog-action-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: no remaining local policy form `sonner` import or generic save failure toast in `warranty-policy-form-dialog.tsx`.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 39 files / 132 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this unrelated warranty UI/action slice.

## Residual Risk

The source-contract test intentionally pins ownership boundaries by source text. That is useful for preventing this specific regression, but a future behavioral test around the dialog submit flow would give stronger UI-level coverage if this form is refactored.
