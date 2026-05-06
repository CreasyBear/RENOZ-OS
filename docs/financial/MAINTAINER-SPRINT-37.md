# Financial Maintainer Sprint 37: OAuth Status Feedback

## Status

Closed in commit-ready state.

## Issue 1: OAuth Status/Read-State Feedback Boundary

### Problem

Sprint 36 closed OAuth callback and Xero tenant-selection feedback, but OAuth status surfaces still rendered provider/read-state strings directly. The connection manager displayed raw health `errorMessage` text, and the OAuth status dashboard displayed activity descriptions and detail values directly from API results.

### Workflow Spine

OAuth status workflow
-> integrations OAuth page
-> OAuth connection manager
-> OAuth health API read model
-> OAuth status dashboard
-> OAuth dashboard activity read model
-> operator-safe status feedback copy
-> query key/cache policy unchanged.

### Touched Domains

- OAuth integrations.
- Xero accounting connection health.
- Workspace OAuth status dashboard.
- OAuth feedback formatter.
- OAuth formatter/source tests.
- Financial maintainer closeout docs.

### Business Value Protected

Xero and workspace integrations support finance closeout, invoice/payment reconciliation, communications, and scheduling. Status views should tell operators whether to reconnect, retry, or wait without exposing provider tokens, OAuth state, database text, sync-log internals, or stack/runtime details.

### Scope Constraints

- Do not change OAuth health fetching, dashboard fetching, polling intervals, connection mutation behavior, tenant selection, token persistence, sync execution, query keys, cache invalidation, database writes, finance posting, or communications sync behavior.
- Keep safe success activity messages, numeric status details, rate-limit guidance, reconnect guidance, and sync-unavailable guidance available.
- Change only OAuth integration status/read-state feedback formatting.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout, route interaction, or API behavior change.

### Changes

- Extended OAuth-owned feedback utilities with `formatOAuthStatusMessage` and `formatOAuthStatusDetailValue`.
- Updated the OAuth connection manager health alert to format stored health error messages.
- Updated the OAuth status dashboard to format recent activity descriptions before display.
- Updated the OAuth status dashboard to format recent activity detail values before display.
- Extended OAuth feedback tests for status/read-state formatting and source wiring.

### Standards Checked

- Domain ownership: OAuth status feedback remains owned by `src/lib/oauth/oauth-error-messages.ts`.
- Route -> container/page -> hook/server API -> schema/database -> query key/cache policy: preserved. This sprint changes only presentation formatting for existing OAuth status/read-state data.
- Query/cache policy: unchanged. OAuth health and dashboard query keys, stale windows, and polling behavior were not changed.
- Tenant isolation/data integrity: unchanged. No organization scope, OAuth connection state, Xero tenant assignment, token persistence, sync execution, finance posting, communications sync, inventory transaction, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Status panels now suppress implementation-shaped provider/token/database/runtime text while preserving safe success and numeric detail copy.
- Reviewability: the diff is limited to OAuth formatter extensions, two status display substitutions, focused tests, and this closeout note.

### Smells Removed

- Raw OAuth connection health `errorMessage` rendering.
- Raw OAuth status dashboard activity description rendering.
- Raw OAuth status dashboard detail value rendering.
- Missing source contract preventing direct status/read-state provider text display.

### Deferred

- OAuth initiate API responses still need a direct API contract slice.
- Xero remediation console issue messages are owned by financial/Xero sync schemas and should be reviewed separately if provider strings can enter that read model.
- Browser QA for integrations settings and dashboard remains future UX verification.

### Gates

- Passed: focused OAuth route/formatter tests, `./node_modules/.bin/vitest run tests/unit/oauth/oauth-feedback-contract.test.ts tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts` - 3 files, 9 tests.
- Passed: broader OAuth-focused suite, `./node_modules/.bin/vitest run tests/unit/oauth tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts tests/unit/auth/auth-callback-feedback-contract.test.ts` - 5 files, 14 tests.
- Passed: targeted source scan for raw OAuth health/status detail rendering and legacy OAuth callback feedback patterns returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth persistence behavior, finance posting, communications sync, or database contracts; typecheck, lint, OAuth-focused tests, and source scans covered the risk.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned feedback copy, honest UI states, reviewable diffs, meaningful tests, and risk-selected evidence. Sprint 7's serialized-gate posture still applies: serialized gates are not routine evidence for unrelated slices.

### Residual Risk

Medium-low. OAuth status/read-state feedback is safer, but OAuth initiate API response normalization and financial Xero remediation issue-message review remain separate integration/finance slices.
