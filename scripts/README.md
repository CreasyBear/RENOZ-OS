# Scripts Status

Scripts in this directory and their current status. Last updated: 2026-02-22.

## Passing Scripts

| Script | Purpose | Notes |
|--------|---------|-------|
| `check-pending-dialog-guards.mjs` | Ensures dialogs with async submit have Escape/outside-click guards | Refined to exclude AlertDialog-only files |
| `check-read-path-query-guards.mjs` | Prevents new raw null-sentinel read-hook patterns in `src/hooks/**` | Inspects `useQuery`/read `queryFn` bodies for multiline null-sentinel throws and legacy `normalizeQueryError` usage; an empty baseline only means the currently-scanned read-hook set is clean |
| `check-route-casts.mjs` | Route cast guard (lint:reliability) | |
| `check-serialized-read-auto-upsert.mjs` | Focused serialized read policy guard | Run through `reliability:serialized-read-policy` only for slices that deliberately touch serial-lineage or inventory identity contracts |
| `run-document-schema-gates.mjs` | Verifies document-lineage columns exist before deploy | Manual or release-only; requires `DATABASE_URL` |
| `run-route-intent-smoke.mjs` | Route-intent unit tests + auth redirect smoke | Requires a local loopback port for the auth smoke helper |
| `download-pdf-fonts.mjs` | Download Inter fonts for react-pdf | |
| `probe-production.mjs` | Post-deploy probe (login, assets) | Requires APP_URL or VERCEL_URL |

## Conditional / Data-Dependent

| Script | Status | Notes |
|--------|--------|-------|
| `run-finance-integrity-gates.mjs` | **Data-dependent** | Use as a manual finance/inventory integrity check, not as the default PR gate |
| `run-release-gates.mjs` | Stable release gate | Runs route-intent + unhappy-path regressions, writes summary artifacts, and annotates environment-restricted failures |
| `deploy-with-guards.mjs` | Blocks on release gates | Full deploy flow; document-schema gates run only when `DATABASE_URL` is present |

Release-gate artifacts under `artifacts/release-gates/` are generated local/runtime output and should not be committed.

## Fixes Applied (2026-02-22)

- **DEP0190 deprecation**: Changed `shell: true` to `shell: false` in `spawn()` calls in `deploy-with-guards.mjs`, `run-release-gates.mjs`, `run-route-intent-smoke.mjs` to avoid "Passing args to a child process with shell option true" warning.
- **check-pending-dialog-guards**: Refined detection from `DialogContent` to `<DialogContent` to exclude AlertDialog-only files; baseline now 0.

## Package Scripts

Use `npm run` for package-script orchestration in the local maintainer runtime.
`bun` remains pinned for dependency/runtime parity, but `bun run` can fail before
script execution with `CouldntReadCurrentDirectory` in this environment. Package
scripts should not chain through `bun run`; keep them runnable through npm and
fall back to direct `node`/`node_modules/.bin` commands when a runtime blocks a
wrapper.

- `predeploy` → lint + reliability lint + typecheck + unit tests + build
- `release:verify` → release-hardening tests + release gates
- `lint:reliability` → check-route-casts + check-pending-dialog-guards + check-read-path-query-guards
- `reliability:serialized-read-policy` → check-serialized-read-auto-upsert
- `reliability:release-gates` → run-release-gates.mjs
- `reliability:document-gates` → run-document-schema-gates.mjs
- `reliability:finance-gates` → run-finance-integrity-gates.mjs
- `test:route-intent-smoke` → run-route-intent-smoke.mjs
- `fonts:download` → download-pdf-fonts.mjs
- `deploy:prod` → deploy-with-guards.mjs
- `deploy:probe` → probe-production.mjs
