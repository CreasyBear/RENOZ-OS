# Maintainer Sprint 26 - Certificate Result Error Safety

## Slice

Sprint 25 completed thrown mutation error normalization for warranty hooks, but certificate generation still had a separate `success: false` result path. The server logged the real certificate failure and returned `error.message` in the result payload, while the hook displayed `result.error` directly.

## Workflow Spine Protected

Warranty certificate action -> certificate hook -> certificate server function -> PDF/storage generation -> result payload -> operator toast.

## Change

- Added `formatWarrantyCertificateResultError` in `src/lib/warranty/certificate-result-errors.ts`.
- Server certificate generation still logs the real failure, but returns operator-safe result copy.
- Certificate generate/regenerate hooks sanitize `result.error` before displaying it.
- Kept the known `Warranty not found` result message as operator-facing copy.
- Added focused unit coverage for safe messages, infrastructure-message hiding, and server/hook source contracts.

## Standards Checked

- Domain ownership: certificate result copy now lives in a warranty-domain helper, not ad hoc hook/server strings.
- Route -> hook -> server function flow: certificate hooks and server functions keep the same call and invalidation behavior.
- Query/cache policy: certificate and warranty invalidations are unchanged.
- Tenant isolation/data integrity: no database, schema, storage, or auth behavior changed.
- UI states: certificate result failures no longer display raw PDF/storage/database wording.
- Reviewability: the diff is limited to the certificate result helper, certificate server/hook call sites, one focused test, and this closeout note.

## Smells Removed

- Removed raw `error.message` from the certificate `success: false` server catch payload.
- Removed direct `result.error` display from certificate generate/regenerate hook result handling.

## Deferred

- Certificate generation still returns `success: false` instead of throwing for generation failures. That result contract may be valid for this UI, so this sprint only made the existing contract safe.
- The formatter is intentionally conservative and currently only preserves `Warranty not found` as a known safe result message.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-certificate-result-errors.test.ts tests/unit/warranty/query-normalization-wave3-certificates.test.tsx tests/unit/warranty/warranty-mutation-errors.test.ts`: passed, 3 files / 10 tests.
- `bunx vitest run tests/unit/warranty`: passed, 35 files / 128 tests.
- `bunx eslint src/lib/warranty/certificate-result-errors.ts src/server/functions/warranty/certificates/warranty-certificates.ts src/hooks/warranty/certificates/use-warranty-certificates.ts tests/unit/warranty/warranty-certificate-result-errors.test.ts --report-unused-disable-directives`: passed.
- `rg -n "error instanceof Error \\? error.message : 'Certificate generation failed'|toast\\.error\\(result\\.error \\?\\? 'Failed to (generate|regenerate) certificate'" src`: no matches.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

Operators now see a generic certificate-generation failure for most server-side certificate result failures. That protects infrastructure details, but deeper remediation will still require checking server logs.
