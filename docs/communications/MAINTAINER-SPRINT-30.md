# Communications Maintainer Sprint 30

## Status

Closed in commit-ready state.

## Issue 1: Unsubscribe Token Trust Boundary

### Problem

The repo audit still described unsigned legacy unsubscribe tokens as a live trust-boundary failure. Current route tests already rejected unsigned legacy tokens, but `src/lib/server/communication-preferences.ts` still exported a base64 JSON unsubscribe verifier. That unused compatibility surface kept a weaker token model discoverable in runtime code and made the audit harder to trust.

### Workflow Spine

Email campaign or scheduled email
-> `generateUnsubscribeUrl`
-> HMAC-signed unsubscribe token
-> `/api/unsubscribe/$token`
-> signed-token verification
-> contact preference update
-> email suppression insert
-> customer activity evidence.

### Touched Domains

- Communications unsubscribe route trust boundary.
- Communications preference compatibility module.
- Communications domain remediation contracts.
- Repo owner domain-housekeeping audit.

### Business Value Protected

Unsubscribe links are public entry points into RENOZ communications preferences. They must not imply that a forged base64 payload can change contact communication state. Keeping the route signed-token-only protects customer communication consent, suppression-list accuracy, and evidence for preference changes.

### Scope Constraints

- Do not change generated secure token format, expiration, HMAC secret handling, or route HTML.
- Do not change contact preference updates, suppression-list behavior, activity logging, rate limiting, or database schema.
- Do not broaden this into distributed rate-limit work or debug endpoint policy.

### Changes

- Removed the unused `LegacyUnsubscribePayload`, base64 decoder, and `verifyUnsubscribeToken` export from `src/lib/server/communication-preferences.ts`.
- Added a communications source contract proving unsubscribe verification is owned by the HMAC token module and the compatibility facade no longer exposes a legacy verifier.
- Updated the domain-housekeeping audit so future maintainers do not treat the retired unsigned-token issue as live backlog.

### Standards Checked

- Domain ownership: signed unsubscribe tokens are owned by `src/lib/server/unsubscribe-tokens.ts`; preference reads/writes stay owned by communications server functions.
- Route -> server -> schema/database -> evidence flow: `/api/unsubscribe/$token` still verifies the token before reading/updating contact preferences and adding suppression/activity evidence.
- Query/cache policy: no TanStack Query or cache invalidation behavior changed.
- Tenant isolation/data integrity: secure tokens still carry organization/email context; contact preference writes and suppression inserts are unchanged.
- Inventory/finance integrity: no inventory, valuation, finance, order, fulfillment, warranty, or RMA persistence changed.
- Serialized lineage: not touched.
- UI states/error handling: invalid/expired link copy and success/confirmation pages are unchanged.
- Reviewability: the diff removes one unused weaker verifier, adds one focused contract, and updates the audit record.

### Smells Removed

- Unused unsigned unsubscribe-token verifier in runtime code.
- Stale audit text describing a closed route fallback as live.
- Ambiguous communication-preferences compatibility surface that mixed preference functions with token verification.

### Deferred

- Distributed public endpoint rate limiting remains open.
- AI debug endpoint exposure policy remains open.
- Browser QA remains deferred because public route behavior and markup did not change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/communications/domain-remediation.test.ts tests/unit/routes/unsubscribe-route.test.ts` - 2 files, 15 tests.
- Passed: `./node_modules/.bin/eslint src/lib/server/communication-preferences.ts src/routes/api/unsubscribe.$token.ts tests/unit/communications/domain-remediation.test.ts tests/unit/routes/unsubscribe-route.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan showing the only `verifyUnsubscribeToken` runtime usage in this slice is the unsubscribe route aliasing the signed HMAC verifier.
- Passed: `node scripts/check-route-casts.mjs`.
- Passed: `node scripts/check-pending-dialog-guards.mjs`.
- Passed: `node scripts/check-read-path-query-guards.mjs`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, full unit suite, production build, deploy, finance, document, and serialized gates because this slice removed an unused token verifier and did not change route markup, generated token format, persistence behavior, document generation, finance flows, or serialized lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers public trust boundaries, operator-safe behavior, meaningful tests, and audit records as part of repo stewardship.

### Residual Risk

Low for unsigned unsubscribe-token acceptance because the route uses only the signed HMAC verifier and focused tests reject malformed, expired, and unsigned legacy tokens. Medium for broader public endpoint protection until rate limiting is moved beyond process-local memory and preview/debug endpoint policy is finalized.
