# Maintainer Sprint 39 - Ownership Transfer Address Completeness

## Slice

Sprint 38 stopped blank ownership-transfer forms from sending an incomplete address object just because country defaulted to `AU`. The remaining workflow risk was partial address entry: if an operator typed one address field and submitted, the dialogs could still build a server-invalid owner address.

## Workflow Spine Protected

Warranty/service detail route -> transfer ownership dialog -> optional owner address validation -> transfer hook -> service ownership server function -> owner creation/update -> service-system/warranty owner mirror -> explicit cache invalidation -> operator toast.

## Business Value Protected

Ownership transfer must work with minimum required ownership facts while still protecting clean owner records when an address is entered. Operators should not learn the address rule from a server rejection after filling a transfer dialog.

## Change

- Added `getOptionalServiceOwnerAddressError` and a shared operator-facing address completeness message.
- Added client-side `superRefine` guards to warranty and service ownership transfer schemas.
- Added `FormErrorSummary` to both transfer dialogs so submit-time address completeness failures have visible feedback.
- Expanded focused coverage for blank, partial, and complete address payload behavior plus dialog source contracts.

## Standards Checked

- Domain ownership: the shared owner-address helper owns the optional-address completeness rule for both ownership transfer surfaces.
- Route -> container -> hook -> server flow: containers, hooks, server functions, cache contracts, and database writes are unchanged; validation happens at the dialog boundary before mutation submission.
- Query/cache policy: no query keys or cache invalidation behavior changed.
- Tenant isolation/data integrity: no server tenant predicates or writes changed; the client now prevents an avoidable invalid owner-address payload.
- UI states/error handling: partial address entry now produces visible form-level feedback instead of falling through to a mutation failure.
- Reviewability: the diff is limited to one helper extension, two dialog schema/summary updates, one focused test update, and this closeout note.

## Smells Removed

- Removed client acceptance of partial owner-address payloads for service and warranty ownership transfer.
- Removed invisible submit-time validation risk for manually wired transfer dialog fields by adding a form error summary.
- Kept the optional-address payload rule centralized instead of duplicating cross-field checks in two dialogs.

## Deferred

- The transfer dialogs still use manually wired inputs rather than shared field components with inline field-level errors and `aria-invalid`.
- This does not add mounted browser coverage for focus behavior or dialog submission.

## Gates

- Focused ownership address tests: `bunx vitest run tests/unit/service/service-owner-address-contract.test.ts tests/unit/service/service-ownership-transfer-cache-contract.test.ts tests/unit/warranty/warranty-transfer-cache-contract.test.ts` passed, 3 files and 6 tests.
- Focused ESLint: `bunx eslint src/lib/service-owner-address.ts src/components/domain/service/dialogs/transfer-service-system-dialog.tsx src/components/domain/warranty/dialogs/transfer-warranty-dialog.tsx tests/unit/service/service-owner-address-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: confirmed both transfer dialogs import `getOptionalServiceOwnerAddressError`, use `.superRefine`, render `FormErrorSummary` with `Check ownership transfer`, continue using `buildOptionalServiceOwnerAddress`, and no longer contain the old default-country address condition.
- Service and warranty unit suites: `bunx vitest run tests/unit/service tests/unit/warranty` passed, 51 files and 152 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Serialized/reliability gates: skipped by explicit maintainer direction; that workstream is closed and this slice does not touch serialized lineage, inventory identity, or serialized read-path invariants.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. This remains the same justified cross-domain ownership-transfer invariant from Sprint 38.

## Residual Risk

The focused test proves helper behavior and source usage. It does not prove a real browser dialog displays and focuses validation feedback.
