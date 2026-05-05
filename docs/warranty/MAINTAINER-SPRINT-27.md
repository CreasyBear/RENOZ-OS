# Maintainer Sprint 27 - Detail Container Mutation Toast Ownership

## Slice

Warranty hooks now own mutation error and success toasts, but the detail container still added catch-level toasts for opt-out, certificate generation/regeneration, and delete. Certificate window opening also emitted duplicate popup-blocked toasts because the utility toasted before throwing and then toasted again in its catch block.

## Workflow Spine Protected

Warranty detail container -> warranty mutation hooks / certificate window utility -> operator toast and inline certificate state.

## Change

- Removed duplicate container-level mutation toasts from warranty opt-out and delete flows.
- Certificate generate/regenerate handlers now set inline certificate error state with safe certificate result copy while hook mutations keep toast ownership.
- Certificate popup failures now toast once through `openCertificateWindow`.
- Added source-contract coverage for warranty detail container toast ownership.
- Added behavior coverage for popup-blocked certificate opening.

## Standards Checked

- Domain ownership: hooks own mutation toasts; the detail container owns orchestration and local inline state.
- Route -> container -> hook flow: detail container still calls the same warranty hooks and passes the same view props.
- Query/cache policy: no query keys or invalidations changed.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: certificate result failures use the safe certificate result formatter; popup-blocked failures are not double-toasted.
- Reviewability: the diff is limited to warranty detail container, certificate window utility, focused tests, and this closeout note.

## Smells Removed

- Removed duplicate hook/container mutation toasts in warranty detail actions.
- Removed raw certificate catch-message assignment from generate/regenerate catch paths.
- Removed double popup-blocked toast behavior in `openCertificateWindow`.

## Deferred

- Warranty claim detail container still has its own action dialogs and catch-level claim cancellation toast. It is a separate claim-detail workflow and should be handled in its own slice if it proves redundant with hook-owned claim mutation errors.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-detail-container-action-contract.test.ts tests/unit/warranty/warranty-certificate-window.test.ts tests/unit/warranty/warranty-certificate-result-errors.test.ts tests/unit/warranty/query-normalization-wave3-certificates.test.tsx`: passed, 4 files / 8 tests.
- `bunx vitest run tests/unit/warranty`: passed, 37 files / 130 tests.
- `bunx eslint src/components/domain/warranty/containers/warranty-detail-container.tsx src/lib/warranty/certificate-utils.ts tests/unit/warranty/warranty-detail-container-action-contract.test.ts tests/unit/warranty/warranty-certificate-window.test.ts --report-unused-disable-directives`: passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

The container still sets inline certificate error state for popup-blocked failures using the normalized utility error message. That message is operator-facing by design, but browser popup policy edge cases remain environment-dependent.
