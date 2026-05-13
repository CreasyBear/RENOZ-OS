# Reliability Maintainer Sprint 7: Production OAuth Boundary Cleanup

## Status

Closed in commit-ready state with one full-suite stability concern.

## Issue 1: Production Builds Still Blurred Server-Only OAuth Boundaries

### Problem

Production builds still warned about OAuth token encryption pulling `node:crypto` into browser analysis paths. The runtime behavior was server-owned, but static imports through OAuth API routes, communications inbox account actions, and financial Xero functions made the boundary harder to reason about and kept build output noisy.

### Workflow Spine

OAuth connection
-> API route handler
-> server-owned OAuth flow or connection command
-> encrypted token storage
-> provider sync/readiness
-> operator-visible connection and sync state.

Xero finance sync
-> financial server function
-> Xero adapter readiness/token refresh
-> invoice/payment/contact sync command
-> persisted staged sync or reconciliation result
-> operator-safe issue feedback.

Procurement dashboard
-> route glue
-> route-private dashboard page container
-> procurement hooks
-> server functions and centralized query keys
-> cached/degraded read-state contracts.

### Touched Domains

- Procurement dashboard route/container boundary.
- OAuth API routes and connection/sync handlers.
- Communications inbox OAuth account actions.
- Jobs OAuth bridge.
- Financial Xero operations, invoice sync, payment reconciliation, and revenue-recognition sync.
- Vite server-only module stubbing.
- Procurement focused read-state and query-normalization tests.

### Business Value Protected

RENOZ operators rely on connected calendar/email/Xero workflows for support, finance, procurement, and operational visibility. This slice makes those integrations safer to ship by keeping token encryption server-owned, reducing production-build warning fatigue, and keeping the procurement dashboard route easier to maintain without changing the operator workflow.

### Scope Constraints

- Do not change OAuth/Xero behavior, token semantics, tenant scoping, query keys, or cache invalidation contracts.
- Keep the procurement change to route decomposition, not UI redesign.
- Prefer dynamic server-only imports over broad build configuration masking.
- Treat build gates as evidence, not proof.

### Changes

- Split the procurement dashboard route into route glue plus `-dashboard-page.tsx`, leaving the route to own search/navigation binding and the page to own the dashboard container.
- Moved OAuth route handler dependencies behind handler-local dynamic imports so API modules no longer statically pull server-only OAuth implementation into build analysis.
- Moved communications inbox account OAuth actions behind handler-local dynamic imports.
- Moved Xero adapter access behind financial command/read function dynamic imports while keeping type-only contracts where useful.
- Added a client-side `node:crypto` fail-closed Vite stub so accidental browser use throws instead of silently bundling a server primitive.
- Updated procurement tests to target the route-private page container rather than the TanStack route module.

### Standards Checked

- Domain ownership: OAuth, communications, jobs, financial, and procurement ownership remains in existing modules.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: procurement now follows the route-glue/container split more cleanly; query/cache contracts unchanged.
- Tenant isolation: not changed; OAuth/Xero commands still use their existing scoped server functions and adapter paths.
- Transactional inventory/finance integrity: Xero sync/reconciliation command behavior unchanged and covered by focused finance tests.
- Serialized lineage continuity: not touched.
- Honest UI states: procurement dashboard read-state tests still cover unavailable/degraded copy.
- Operator-safe error handling: OAuth/Xero feedback contracts unchanged and covered by focused tests.
- Reviewability: one production-boundary slice, with behavior-preserving imports and one route decomposition.

### Smells Removed

- Repo-owned production build warning for `src/lib/oauth/token-encryption.ts` and `node:crypto`.
- Procurement dashboard TanStack route extra-export/code-splitting smell.
- Top-level Xero/OAuth implementation imports in mixed route/server-function modules.
- Static server-only dependency paths that made production build output less trustworthy.

### Deferred

- Supabase client still has mixed static/dynamic import warnings in production build output.
- Production bundle still exceeds chunk-size warning thresholds.
- Third-party packages still emit `"use client"` directive warnings during Nitro/Vite bundling.
- Full unit suite has a current suite-order/time-budget smell: the broad run failed in three files, but the same failed files passed immediately in isolation.
- `bun run lint` failed before executing ESLint with `CouldntReadCurrentDirectory`; direct local tool invocation works.

### Gates

- Passed: `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `node scripts/check-route-casts.mjs`.
- Passed: `node scripts/check-pending-dialog-guards.mjs`.
- Passed: `node scripts/check-read-path-query-guards.mjs`.
- Passed: `node scripts/check-serialized-read-auto-upsert.mjs`.
- Passed: focused OAuth/Xero/procurement suite, `21` files and `71` tests.
- Passed: failed-file rerun, `3` files and `24` tests.
- Passed: `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=12288 ./node_modules/.bin/vite build`; the repo-owned `node:crypto` warning was absent.
- Passed: `git diff --check`.
- Failed: `./node_modules/.bin/vitest run tests/unit`, `669` files passed, `3` files failed; `2251` tests passed, `4` failed. The failed files passed when rerun in isolation.

### Goal Adaptation

No goal adaptation needed. This sprint continues the standing maintainer goal by reducing server/client boundary ambiguity and preserving evidence around the remaining suite stability risk.

### Residual Risk

Medium for release confidence until the suite-order/time-budget failures are eliminated or quarantined with a clear test-harness explanation. Low for the touched runtime behavior based on focused OAuth/Xero/procurement tests, typecheck, lint, reliability guards, and production build evidence.
