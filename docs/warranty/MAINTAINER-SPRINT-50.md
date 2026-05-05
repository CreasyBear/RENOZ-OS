# Warranty Maintainer Sprint 50

## Status

Closed in commit-ready state.

## Issue 1: Certificate Window Error Safety

### Problem

The warranty certificate generation and download path had safe server result and mutation fallbacks, but the browser window-opening boundary still allowed call sites to provide generic `Failed to open certificate` copy and the warranty detail container reflected caught `error.message` into inline UI state. That kept certificate opening feedback outside the centralized warranty error contract.

### Workflow Spine

Warranty detail route
-> warranty detail container and certificate button
-> generated, regenerated, or existing certificate URL
-> `openCertificateWindow`
-> browser popup/window boundary
-> toast and inline certificate status feedback.

### Touched Domains

- Warranty certificate window/opening feedback.
- Warranty detail certificate action feedback.
- Warranty certificate button fallback download behavior.

### Business Value Protected

Warranty certificates are customer-facing proof artifacts. If a browser blocks the certificate window, operators need a clear recovery step without seeing generic failure text or raw browser/system error strings.

### Scope Constraints

- Do not change certificate generation/regeneration server functions, schemas, result payloads, query keys, or cache invalidation.
- Do not change certificate status read normalization or certificate card rendering.
- Do not change certificate URLs, download/link behavior, or success toasts.
- Do not reopen serialized gates as routine evidence for this UI feedback slice.

### Changes

- Added centralized certificate window fallback constants and `formatWarrantyCertificateWindowError(error)`.
- Removed the custom `errorMessage` option from `openCertificateWindow` so call sites cannot bypass centralized certificate-open copy.
- Normalized popup-blocked failures to an operator-actionable message and all other browser/window errors to a safe unavailable message.
- Routed warranty detail inline certificate errors through the certificate window formatter instead of caught `error.message`.
- Removed generic `Failed to open certificate` copy from certificate detail/container and button call sites.
- Corrected the certificate utility example to call the synchronous helper without `await`.

### Standards Checked

- Domain ownership: warranty certificate window feedback now lives in the warranty certificate utility instead of scattered call-site literals.
- Workflow spine: route/container and button -> utility -> browser window boundary -> toast/inline feedback remained intact.
- Query/cache contract: certificate detail, warranty detail, and warranty list invalidation are unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: popup-blocked failures now show a specific recovery path; non-popup browser failures do not leak raw browser/system strings.
- Error handling: certificate generation result errors and thrown mutation errors still use their existing specialized formatters.
- Diff shape: one utility formatter/constant change, three call-site cleanups, two source contracts, and one closeout note.

### Smells Removed

- Generic `Failed to open certificate` copy at certificate-opening call sites.
- `error instanceof Error ? error.message` reflected into warranty detail certificate UI state.
- Custom toast-title escape hatch in `openCertificateWindow`.
- Minor stale doc example showing `await` for a synchronous utility.

### Deferred

- Browser QA was not selected because the covered behavior is popup-open failure formatting, which is unit-testable without layout or visual interaction changes.
- Live browser popup-policy testing remains deferred because the unit contract covers null `window.open` and thrown browser errors.
- Other domains still have raw `error.message`/generic `Failed to ...` feedback and should be handled as separate domain slices.

### Gates

- Passed: focused certificate window/read/result contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-certificate-window.test.ts tests/unit/warranty/warranty-detail-container-action-contract.test.ts tests/unit/warranty/warranty-certificate-result-errors.test.ts tests/unit/warranty/query-normalization-wave3-certificates.test.tsx tests/unit/warranty/warranty-certificate-status-card.test.tsx` - 5 files, 15 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 151 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for centralized certificate window copy, removed generic certificate-open call-site fallbacks, removed raw caught-error reflection, and preserved certificate open call sites.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates remain retired as routine evidence and should only be reopened for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. This was a normal maintainer slice under the existing operator-safe error and reviewable diff standards. The only execution posture maintained was that serialized gates are not routine evidence for unrelated UI feedback work.

### Residual Risk

The unit tests cover popup-blocked and thrown browser-error paths, but they do not prove every real browser popup policy presents identically. Unsupported window-opening failures still fall back to the centralized safe unavailable message.
