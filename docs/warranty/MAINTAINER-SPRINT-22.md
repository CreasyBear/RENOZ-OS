# Maintainer Sprint 22 - Claim Mutation Error Safety

## Slice

Warranty claim reads already use normalized query errors, but claim mutations still displayed arbitrary thrown `error.message` values for submit, status update, approve, deny, resolve, assign, and cancel actions. That can leak infrastructure wording and gives operators inconsistent guidance during claim decisions.

## Workflow Spine Protected

Warranty claim route/container -> `useWarrantyClaims` mutation hooks -> warranty server functions -> warranty claim lifecycle state -> query invalidation and operator toast outcome.

## Change

- Added a warranty-owned mutation error formatter at `src/hooks/warranty/_mutation-errors.ts`.
- Replaced raw mutation toast messages in `src/hooks/warranty/claims/use-warranty-claims.ts`.
- Preserved server-owned business validation messages for 400/401/403/404 responses.
- Mapped claim transition blockers, auth, permission, not-found, notification, and rate-limit cases to operator-safe copy.
- Added focused unit coverage for field validation, transition blockers, unknown system-message hiding, and the hook source contract.

## Standards Checked

- Domain ownership: warranty now owns its mutation error language instead of borrowing inventory/order helpers.
- Route -> hook -> server function flow: mutation hooks still call the same server functions and invalidate the same centralized query keys.
- Query/cache policy: invalidation behavior is unchanged.
- Tenant isolation/data integrity: no server writes, schema, or database behavior changed.
- UI states: mutation failure toasts are safer and more consistent for operators.
- Reviewability: the diff is limited to warranty hook error formatting, one hook import/call-site update, tests, and this closeout note.

## Smells Removed

- Removed seven raw `error instanceof Error ? error.message : ...` warranty claim mutation toasts.
- Added a local contract so future claim mutations do not drift back to raw error display.

## Deferred

- Warranty policies, certificates, entitlements, and core warranty mutations still have some raw mutation toasts. They should be converted in follow-up warranty slices rather than widening this claim lifecycle diff.
- The formatter is warranty-local. A future shared mutation error primitive may be justified after two or three more domains converge on the same shape.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-claim-options.test.ts tests/unit/warranty/warranty-claim-serialization.test.ts`: passed, 3 files / 8 tests.
- `bunx vitest run tests/unit/warranty`: passed, 34 files / 125 tests.
- `bunx eslint src/hooks/warranty/_mutation-errors.ts src/hooks/warranty/claims/use-warranty-claims.ts tests/unit/warranty/warranty-mutation-errors.test.ts --report-unused-disable-directives`: passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

The formatter permits non-internal server-owned messages for 400/401/403/404 responses. That preserves useful business guidance, but it assumes server errors in those classes remain intentionally operator-facing.
