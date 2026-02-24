# Scripts Status

Scripts in this directory and their current status. Last updated: 2026-02-22.

## Passing Scripts

| Script | Purpose | Notes |
|--------|---------|-------|
| `check-pending-dialog-guards.mjs` | Ensures dialogs with async submit have Escape/outside-click guards | Refined to exclude AlertDialog-only files |
| `check-route-casts.mjs` | Route cast guard (lint:reliability) | |
| `run-serialized-lineage-gates.mjs` | Serialized lineage DB invariants | Requires DATABASE_URL |
| `run-route-intent-smoke.mjs` | Route-intent unit tests | |
| `download-pdf-fonts.mjs` | Download Inter fonts for react-pdf | |
| `probe-production.mjs` | Post-deploy probe (login, assets) | Requires APP_URL or VERCEL_URL |

## Conditional / Data-Dependent

| Script | Status | Notes |
|--------|--------|-------|
| `run-finance-integrity-gates.mjs` | **Fails** (data debt) | `stock_without_active_layers: 82`, `rows_value_mismatch: 100` — production data state, not script bug |
| `run-release-gates.mjs` | Fails when finance-integrity fails | Orchestrates serialized + finance + route-intent |
| `deploy-with-guards.mjs` | Blocks on release gates | Full deploy flow; requires Vercel CLI |

## Fixes Applied (2026-02-22)

- **DEP0190 deprecation**: Changed `shell: true` to `shell: false` in `spawn()` calls in `deploy-with-guards.mjs`, `run-release-gates.mjs`, `run-route-intent-smoke.mjs` to avoid "Passing args to a child process with shell option true" warning.
- **check-pending-dialog-guards**: Refined detection from `DialogContent` to `<DialogContent` to exclude AlertDialog-only files; baseline now 0.

## npm Scripts

- `lint:reliability` → check-route-casts + check-pending-dialog-guards
- `reliability:release-gates` → run-release-gates.mjs
- `reliability:serialized-gates` → run-serialized-lineage-gates.mjs
- `reliability:finance-gates` → run-finance-integrity-gates.mjs
- `test:route-intent-smoke` → run-route-intent-smoke.mjs
- `fonts:download` → download-pdf-fonts.mjs
- `deploy:prod` → deploy-with-guards.mjs
- `deploy:probe` → probe-production.mjs
