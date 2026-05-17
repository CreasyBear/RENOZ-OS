# AI Maintainer Sprint 3: Debug Route Exposure Policy

## Status

Closed in commit-ready state.

## Issue 1: AI Debug Routes Were Public by Default

### Problem

The repo audit identified two AI debug routes as a trust-boundary footgun. `debug-ping` was always public, and `debug-rls-clash` was unauthenticated outside production while accepting an arbitrary `orgId` for RLS visibility diagnostics. Even if these routes were intended for local debugging, preview and shared development environments should not expose AI diagnostics by default.

### Workflow Spine

AI debug route request
-> debug route exposure policy
-> generic 404 JSON response unless explicitly enabled
-> optional local diagnostic execution
-> sanitized diagnostic error response and server log.

### Touched Domains

- AI API debug route policy.
- AI RLS diagnostic route.
- AI debug ping route.
- AI route feedback/source contracts.
- Repo owner domain-housekeeping audit.

### Business Value Protected

AI diagnostics can help maintainers, but public diagnostic routes should not become a hidden data-inspection surface for RENOZ customer and revenue context. Disabling these routes by default keeps the shipped app closer to the product promise: internal diagnostics are deliberate tools, not ambient public behavior.

### Scope Constraints

- Do not remove the diagnostic routes entirely; keep local troubleshooting possible.
- Do not change RLS diagnostic query semantics when explicitly enabled.
- Do not change AI chat, approvals, artifact, cost, OAuth, finance, inventory, or serialized-lineage behavior.
- Do not solve distributed public endpoint throttling in this sprint.

### Changes

- Added `src/lib/ai/debug-route-policy.ts` as the single AI-owned exposure policy.
- Changed `debug-ping` and `debug-rls-clash` to return a generic 404 JSON response unless `AI_DEBUG_ROUTES_ENABLED=true` and `NODE_ENV !== 'production'`.
- Preserved the existing RLS diagnostic failure sanitizer for the explicitly enabled path.
- Added route tests proving both debug routes are disabled by default, remain disabled in production even with the flag, and still work when explicitly enabled in non-production.
- Extended the AI feedback contract so both debug routes stay behind the shared exposure policy.
- Updated the domain-housekeeping audit to close the stale debug-route exposure item.

### Standards Checked

- Domain ownership: debug-route exposure policy now lives under `src/lib/ai`.
- Route -> helper -> diagnostic flow: both public route handlers check the shared policy before running diagnostics.
- Query/cache policy: no TanStack Query or cache behavior changed.
- Tenant isolation/data integrity: the RLS diagnostic no longer accepts arbitrary org inspection by default; no writes were added.
- Inventory/finance integrity: no inventory, valuation, finance, order, fulfillment, warranty, or RMA persistence changed.
- Serialized lineage: not touched.
- UI states/error handling: API responses are JSON-only and stable; no app UI changed.
- Reviewability: the diff is limited to one helper, two route guards, focused tests, audit text, and this closeout.

### Smells Removed

- Always-public no-auth debug ping.
- Non-production unauthenticated RLS diagnostic enabled by default.
- Stale audit text describing debug route policy as undecided.

### Deferred

- Public endpoint rate limiting still uses process-local memory and needs a separate distributed limiter decision.
- OAuth route raw error response cleanup remains a separate backend resilience slice.
- Browser QA remains deferred because this sprint changes JSON API route behavior only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/routes/ai-debug-ping-route.test.ts tests/unit/routes/ai-debug-rls-clash-route.test.ts tests/unit/ai/ai-feedback-contract.test.ts` - 3 files, 10 tests.
- Passed: `./node_modules/.bin/eslint src/lib/ai/debug-route-policy.ts src/routes/api/ai/debug-ping.ts src/routes/api/ai/debug-rls-clash.ts tests/unit/routes/ai-debug-ping-route.test.ts tests/unit/routes/ai-debug-rls-clash-route.test.ts tests/unit/ai/ai-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan for `AI_DEBUG_ROUTES_ENABLED`, `areAIDebugRoutesEnabled`, `debug-ping`, and `debug-rls-clash` ownership.
- Passed: `node scripts/check-route-casts.mjs`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, full unit suite, production build, deploy, finance, document, pending-dialog, read-path, and serialized gates because this slice changes JSON debug route availability only and does not touch UI layout, generated token format, persistence behavior, read query contracts, document generation, finance flows, or serialized lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers public trust boundaries, operator-safe behavior, meaningful tests, and evidence-backed audit maintenance.

### Residual Risk

Low for debug route exposure because both routes now require explicit non-production opt-in. Medium for broader public endpoint trust boundaries until rate limiting is backed by distributed state and OAuth raw error responses are normalized.
