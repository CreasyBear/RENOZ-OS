# Reliability Maintainer Sprint 42: Public Rate Limit Backend Boundary

## Status

Closed and commit-ready.

## Problem

The shared public endpoint limiter in `src/lib/server/rate-limit.ts` was
in-memory only. That was acceptable for local development, but weak for
multi-instance production because each instance had its own request counters.
The helper also returned `default-client` when proxy headers were not trusted,
which made the client bucket look precise while actually collapsing unrelated
traffic into an ambiguous identity.

Public routes that protect unsubscribe, webhooks, OAuth initiation, auth
confirmation, portal links, and invitation acceptance need one shared boundary:
distributed throttling when configured, local fallback only outside production,
and fail-closed behavior when production cannot check the limit.

## Workflow Spine Protected

Public request -> route/server function -> `getClientIdentifier` ->
`checkRateLimitResult` or throwing `checkRateLimit` -> Upstash Redis limiter in
production -> explicit 429 / safe thrown rate-limit error -> existing route
response handling.

## Touched Domains

- Shared server reliability infrastructure.
- Auth and portal confirmation.
- OAuth initiation.
- Communications unsubscribe.
- Resend webhook intake.
- User invitation lookup and acceptance.

## Business Value Protected

RENOZ-V3 exposes public operational edges for account confirmation, partner or
staff invitations, unsubscribe actions, OAuth setup, and webhook intake. These
edges affect operator trust, customer communications, integration reliability,
and abuse resistance. The slice makes those public edges behave more like a
production system rather than a single-process MVP.

## Scope Constraints

- No route URLs, request schemas, database schemas, tenant ownership rules, or
  query/cache contracts changed.
- Auth-specific rate limiting in `src/lib/auth/rate-limit.ts` remains separate
  and already Redis-backed.
- AI-specific rate limiting in `src/lib/ai/ratelimit.ts` remains separate.
- Local development still uses the existing in-memory limiter when Upstash Redis
  is not configured.
- Production now fails closed if the shared public limiter cannot use Redis.

## Changes

- Added Upstash Redis-backed `checkRateLimitResult` to the shared server
  rate-limit helper.
- Kept `checkRateLimitSync` as the local fallback implementation for development
  and tests, but removed it from public route call sites.
- Made throwing `checkRateLimit` async and migrated all public-edge callers to
  `await` it.
- Changed the untrusted-proxy fallback from `default-client` to
  `unknown-client`.
- Migrated unsubscribe and Resend webhook routes to the async result helper.
- Added a source contract that protects the distributed backend, async call
  sites, and public route helper usage.
- Updated route test mocks and client-identifier expectations for the new
  contract.

## Standards Checked

- Domain ownership: shared public-edge throttling lives in
  `src/lib/server/rate-limit.ts`; auth and AI retain their existing specialized
  limiters.
- Route -> server function -> shared helper flow: protected for unsubscribe,
  Resend webhook, OAuth initiate, auth confirm, portal confirm, portal link
  request, invitation lookup, and invitation acceptance.
- Tenant isolation: unchanged. This slice runs before tenant-scoped reads or
  uses already authenticated server-function context.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI/API states: public endpoints now keep existing 429/retry behavior
  while the shared helper fails closed in production when the limiter backend is
  unavailable.
- Query/cache contracts: unchanged.
- Reviewable diff: shared helper, public-edge call sites, focused tests, and
  audit docs only.

## Smells Removed

- Removed production reliance on per-process in-memory public throttling.
- Removed public route use of `checkRateLimitSync`.
- Removed unawaited calls to the now-async throwing public rate-limit helper.
- Removed the misleading `default-client` fallback from the shared server
  helper.

## Smells Deferred

- Production deploys must provide `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`; without them, public-edge requests will fail
  closed by design.
- Production deploys also need an explicit `TRUST_PROXY=true` decision when
  proxy headers are trustworthy. Without it, requests share the conservative
  `unknown-client` bucket.
- The source contract proves architecture shape, not live Upstash behavior.
  A future environment/integration smoke should verify Redis-backed throttling
  against deployed configuration.
- Permission fallback strings remain separate trust-boundary debt.
- Broader raw UI error-message adoption remains separate resilience debt.

## Gates

- Focused public-edge tests:
  `./node_modules/.bin/vitest run tests/unit/auth/rate-limit-client-id.test.ts tests/unit/routes/unsubscribe-route.test.ts tests/unit/routes/resend-webhook-route.test.ts tests/unit/routes/oauth-initiate-route.test.ts tests/unit/reliability/public-rate-limit-contract.test.ts`
  - Passed, 5 files / 17 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/lib/server/rate-limit.ts src/routes/api/oauth/initiate.ts 'src/routes/api/unsubscribe.$token.ts' src/routes/api/webhooks/resend.ts src/routes/portal/confirm.ts src/server/functions/auth/confirm.ts src/server/functions/portal/portal-auth.ts src/server/functions/users/invitations.ts tests/unit/auth/rate-limit-client-id.test.ts tests/unit/routes/resend-webhook-route.test.ts tests/unit/routes/unsubscribe-route.test.ts tests/unit/reliability/public-rate-limit-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 721 files / 2349 tests. A final logging-only catch-path
    normalization was made afterward; the focused public-edge tests, targeted
    ESLint, typecheck, build, and diff check were rerun after that cleanup.
- Production build:
  `npm run build`
  - Passed. Existing warnings remain around mixed static/dynamic Supabase client
    imports, dependency `"use client"` directives being ignored during bundling,
    large chunks, and bcrypt native dependency tracing.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
closing a public-edge reliability/security smell with a bounded shared
infrastructure contract and route-level evidence.

## Residual Risk

Medium deployment-configuration risk remains until the production environment is
confirmed to have Upstash Redis credentials and the intended proxy-trust
setting. Application-code risk is low: focused route tests, typecheck, targeted
lint, build, and source contracts cover the migration. Full external Redis
behavior was not exercised locally.
