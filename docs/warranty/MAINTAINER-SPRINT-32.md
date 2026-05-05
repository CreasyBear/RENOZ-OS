# Maintainer Sprint 32 - Warranty Read Error Message Boundary

## Slice

Warranty read hooks normalize query failures through `normalizeReadQueryError`, but several warranty screens still rendered `error.message` directly. That made UI safety depend on every upstream caller providing a normalized read-query error and left detail/list screens one refactor away from leaking raw database or transport messages.

## Workflow Spine Protected

Warranty routes -> containers/views -> read hooks -> server functions -> normalized read-query errors -> formatter-owned UI copy -> retry action.

## Business Value Protected

Warranty operators use list/detail screens to support customers, activate entitlements, review policies, and handle claims. Error states should be clear and safe without exposing implementation details or confusing operators with raw backend copy.

## Change

- Added `formatWarrantyReadError` for warranty read-error UI surfaces.
- Preserved normalized read-query messages, including safe not-found copy.
- Falls back to operator-safe warranty copy for arbitrary raw errors.
- Routed warranty claim detail, warranty detail, entitlement queue, policy list, and claims list error messages through the formatter.
- Added a source and behavior contract test for warranty read-error presentation.

## Standards Checked

- Domain ownership: read hooks own normalization; warranty UI owns presentation through a domain formatter.
- Route -> container/view -> hook flow: no route or hook call behavior changed.
- Query/cache policy: no query keys, stale times, or invalidations changed.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: visible read failures now use safe copy unless the error is explicitly a normalized `ReadQueryError`.
- Reviewability: the diff is limited to one formatter, five UI consumers, one barrel export, one test, and this closeout note.

## Smells Removed

- Removed direct raw `error.message` rendering from key warranty read-error surfaces.
- Removed `Unknown error` and generic `An error occurred` fallbacks from those warranty screens.

## Deferred

- Certificate window popup errors still use the actual local browser error when opening a generated document fails. That is a local browser/window action rather than a read-query error and should stay separate.
- Other domains may still render raw read errors; this sprint only enforces the warranty-domain boundary.

## Gates

- Focused read-error tests: `bunx vitest run tests/unit/warranty/warranty-read-error-messages.test.ts tests/unit/read-path-policy.test.ts tests/unit/warranty/query-normalization-wave3-claims.test.tsx tests/unit/warranty/query-normalization-wave3-policies.test.tsx tests/unit/warranty/query-normalization-wave3-certificates.test.tsx` passed, 5 files / 16 tests.
- Focused ESLint: `bunx eslint src/lib/warranty/read-error-messages.ts src/lib/warranty/index.ts src/components/domain/warranty/containers/warranty-entitlements-list-container.tsx src/components/domain/warranty/views/warranty-policy-list.tsx src/components/domain/warranty/containers/warranty-claim-detail-container.tsx src/components/domain/warranty/containers/warranty-detail-container.tsx src/components/domain/warranty/views/warranty-claims-list-view.tsx tests/unit/warranty/warranty-read-error-messages.test.ts --report-unused-disable-directives` passed.
- Source scan: no remaining raw read-error UI patterns in the targeted warranty claim/detail/entitlement/policy/claims-list consumers.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 42 files / 136 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this read-error UI slice.

## Residual Risk

The source contract protects the current high-risk warranty read-error consumers. Future warranty screens can still introduce raw `error.message` unless they are added to the contract or a broader lint rule is introduced.
