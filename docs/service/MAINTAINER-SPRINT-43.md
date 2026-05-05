# Maintainer Sprint 43 - Service Read-State Feedback Contract

## Slice

Service hooks normalized read failures, but the service route containers still rendered raw `error.message` values and local fallback copy such as `Unknown system error` and `Unknown review error`. That left the final display boundary less strict than the hook read contracts.

## Workflow Spine Protected

Service systems and linkage review routes
-> service list/detail containers
-> service read hooks
-> service server functions
-> service read schemas/query keys
-> normalized read-query errors
-> operator-safe `ErrorState` copy.

## Business Value Protected

Service systems are the installed-battery view that connects warranty, entitlement, customer, and site evidence. Operators need unavailable states that are specific enough to act on, preserve not-found semantics, and do not expose raw system or database wording.

## Change

- Added `SERVICE_READ_MESSAGES` and `formatServiceReadError(error, fallback)` for service read-state display copy.
- Routed service system list/detail and linkage review list/detail containers through the service read-error helper.
- Replaced generic `Failed to load ...` titles with domain-specific unavailable titles.
- Removed raw `error instanceof Error ? error.message` display from the four service read containers.
- Routed service hook read fallback and not-found messages through the same `SERVICE_READ_MESSAGES` constants.
- Added service read-error and source-contract coverage.

## Standards Checked

- Domain ownership: service read-state display copy now lives in `src/lib/service/read-error-messages.ts`.
- Route -> container -> hook -> server flow: service containers still consume service hooks; hooks still normalize server errors with `normalizeReadQueryError`.
- Query/cache policy: service system and service linkage review query keys/stale times are unchanged.
- Tenant isolation/data integrity: no server function, schema, query predicate, mutation, or transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states/error handling: normalized read-query messages can display; raw unknown errors fall back to safe service copy; detail not-found semantics are preserved.
- Reviewability: the diff is limited to one service read-error helper, four containers, one hook import/copy consolidation, focused tests, and this closeout note.

## Smells Removed

- Raw `error.message` rendering in service system and linkage review read containers.
- Local `Unknown system error` / `Unknown review error` fallbacks.
- Generic `Failed to load service...` hard-error titles in service read containers.
- Drift between hook read normalization copy and container fallback copy.

## Deferred

- Service activity read errors passed into detail views remain separate secondary-surface cleanup.
- Browser QA was not selected because this was source-covered error-copy wiring with no layout or interaction change.
- Other domains still have raw read-state messages and should be handled as separate domain slices.

## Gates

- Focused service read-state contracts: `./node_modules/.bin/vitest run tests/unit/service/service-read-error-messages.test.ts tests/unit/service/service-read-state-contract.test.ts tests/unit/service/query-normalization-wave1.test.tsx` passed, 3 files and 5 tests.
- Targeted source scan: confirmed `formatServiceReadError` and `SERVICE_READ_MESSAGES` wiring, removed raw `error.message` rendering, removed unknown fallbacks, removed generic failed-load service titles, and preserved query-normalization copy.
- Service unit suite: `./node_modules/.bin/vitest run tests/unit/service` passed, 9 files and 18 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.
- Browser QA, reliability, finance, document, release, deploy, and serialized gates skipped because this slice did not touch those contracts. Serialized gates remain retired as routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

## Goal Adaptation

Declined. This is a bounded service-domain maintainer slice under the existing honest UI state, operator-safe error, and reviewable-diff standards.

## Residual Risk

The contracts verify helper behavior and source-level container wiring, but they do not mount the service error pages in a browser. Detail-view activity read errors and other secondary read surfaces may still need their own cleanup slices.
