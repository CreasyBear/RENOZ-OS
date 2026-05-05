# Maintainer Sprint 41 - Linkage Review Create-New Dialog Contract

## Slice

The service linkage review create-new dialog still built optional owner addresses locally from `street1` and used unlabeled manually wired fields. After the ownership-transfer address work, this was the remaining service UI surface sending the same owner-address shape without the shared completeness contract.

## Workflow Spine Protected

Service linkage review detail route -> create-new system dialog -> owner/address/notes form fields -> review resolution hook -> review resolution server function -> service-system creation/linkage transaction -> review/service/warranty cache invalidation -> operator toast.

## Business Value Protected

Linkage review resolution creates canonical service systems from ambiguous warranty/entitlement evidence. Operators should be able to create the system with a clean owner record, and partial address entry should be blocked before it reaches server validation.

## Change

- Reused `buildOptionalServiceOwnerAddress` for create-new review owner payloads.
- Added `getOptionalServiceOwnerAddressError` to the review dialog schema via `superRefine`.
- Added `FormErrorSummary` so address completeness failures are visible.
- Added stable ids, label `htmlFor`, and `field.handleBlur` to every create-new review dialog field.
- Added focused source coverage for the helper usage and field wiring contract.

## Standards Checked

- Domain ownership: the service review dialog owns create-new form validation and payload shape; the shared helper owns optional owner-address completeness.
- Route -> container -> hook -> server flow: container, hook, server function, cache policy, and database writes are unchanged.
- Query/cache policy: no query key or cache invalidation behavior changed.
- Tenant isolation/data integrity: no server query, tenant predicate, or transaction changed; invalid partial owner addresses are blocked earlier.
- UI states/error handling: submit-time address completeness failures now render in the dialog and fields report blur/touched state consistently.
- Reviewability: the diff is limited to one dialog, one focused test, and this closeout note.

## Smells Removed

- Removed local `street1`-only owner address payload construction.
- Removed unlabeled-control wiring from the create-new service linkage review dialog.
- Removed missing blur forwarding from create-new review dialog fields.

## Deferred

- The dialog still uses manually wired fields rather than shared field components with inline field-level error rendering.
- This does not add mounted browser accessibility or focus coverage.

## Gates

- Focused service dialog tests: `bunx vitest run tests/unit/service/service-linkage-review-dialog-contract.test.ts tests/unit/service/service-linkage-review-resolution-cache-contract.test.ts tests/unit/service/service-owner-address-contract.test.ts` passed, 3 files and 6 tests.
- Focused ESLint: `bunx eslint src/components/domain/service/dialogs/resolve-service-linkage-review-dialog.tsx tests/unit/service/service-linkage-review-dialog-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: confirmed the old `address: values.street1` path is gone, the dialog uses `buildOptionalServiceOwnerAddress` and `getOptionalServiceOwnerAddressError`, renders `FormErrorSummary` with `Check service system creation`, and every create-new review field has a label `htmlFor`, matching id, and `onBlur={field.handleBlur}`.
- Service unit suite: `bunx vitest run tests/unit/service` passed, 7 files and 14 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Serialized/reliability gates: skipped by explicit maintainer direction; that workstream is closed and this slice does not touch serialized lineage, inventory identity, or serialized read-path invariants.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. This is a bounded service-domain UI quality and payload-contract slice.

## Residual Risk

The source test verifies helper usage, labels, ids, and blur handlers. It does not run the dialog in a browser or prove focus behavior.
