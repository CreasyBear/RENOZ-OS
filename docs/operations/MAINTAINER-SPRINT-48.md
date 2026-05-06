# Operations Maintainer Sprint 48: Xero Connection Card Display

## Status

Closed in commit-ready state.

## Issue 1: Connected Xero Cards Expose Raw Tenant IDs

### Problem

Sprint 47 made the Xero tenant picker display organization labels instead of raw tenant IDs, but the connected OAuth card still rendered `connection.externalAccountId` as "Active tenant". That meant the post-setup integrations UI could still expose the protocol identifier the setup UI had just stopped showing.

### Workflow Spine

Connected OAuth card workflow
-> integrations settings
-> `/api/oauth/connections`
-> `listOAuthConnections`
-> organization-scoped OAuth connection read
-> OAuth connection list response
-> `OAuthConnectionManager`
-> connected Xero card display.

### Touched Domains

- Operations/integrations.
- OAuth connection list read model.
- Xero connection card UI.
- OAuth connection display helper.
- OAuth focused tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators need to know whether the Xero accounting connection is connected, disconnected, and safe to use. They should not have to read Xero tenant UUIDs in normal settings UI, and the list endpoint should not ship raw provider account identifiers when the presenter does not need them.

### Scope Constraints

- Do not change OAuth connection creation, tenant selection submission, stored `externalAccountId`, token encryption, token refresh, disconnect/sync actions, webhook tenant resolution, financial sync execution, query keys, cache invalidation, or route navigation.
- Keep `externalAccountId` available server-side for Xero protocol flows and tenant uniqueness checks.
- Remove unnecessary account identifiers only from the OAuth connection list/read-model surface.
- Browser QA is not required because this is a narrow typed read-model and card-copy change covered by focused tests and typecheck.

### Changes

- Added `formatOAuthConnectionAccountLabel` and `formatOAuthConnectionAccountDetail`.
- Removed `externalAccountId` from `OAuthConnectionResponseSchema`, `GetOAuthConnectionResponseSuccess`, `ListOAuthConnectionsResponseSuccess`, and the `OAuthConnectionManager` connection shape.
- Changed `listOAuthConnections` to select only the fields the settings list needs, excluding `externalAccountId`, access token, and refresh token.
- Replaced the connected Xero card's "Active tenant" block with operator-facing accounting connection state.
- Added focused tests proving the list response does not return raw external account IDs or token fields.
- Added focused source/display tests proving the connected card no longer renders `connection.externalAccountId`.

### Standards Checked

- Domain ownership: connected-account display copy now lives in OAuth display helper code rather than inline JSX.
- Route -> component -> API route -> server function -> database -> query/cache policy: preserved. The route, fetch URL, mutation actions, and query invalidation are unchanged; only the list response shape and card rendering changed.
- Tenant isolation/data integrity: unchanged. Connection reads remain scoped by organization; stored Xero tenant IDs remain available for server-side protocol flows.
- Transactional/integration integrity: unchanged. Connection creation, disconnect, sync, token refresh, and downstream financial sync behavior are untouched.
- UI states/error handling: strengthened. The card communicates connection state without leaking protocol identifiers.
- Reviewability: the diff is limited to one display helper, one list read model, one card UI block, focused tests, and this closeout note.

### Smells Removed

- Raw Xero `externalAccountId` rendered as a visible card label.
- "Active tenant" copy exposed in normal settings UI.
- OAuth connection list read selected full connection rows even though the UI needed only metadata.
- OAuth connection list response carried provider account identifiers and risked accidental UI/log leakage.
- Missing tests for connected OAuth card display safety.

### Deferred

- Other internal OAuth operations still use connection IDs and external account IDs where they are protocol/action identifiers. This sprint only hardens the settings list read model.
- The Xero card still cannot show the friendly organization name after connection because the stored connection schema does not retain `tenantName`. A future persistence/product slice could store a safe display name captured during OAuth setup.
- Browser QA can be added if a future sprint changes the broader integrations settings layout or action flow.

### Gates

- Passed: focused OAuth tests, `./node_modules/.bin/vitest run tests/unit/oauth/oauth-connection-display-contract.test.ts tests/unit/oauth/oauth-connections.test.ts tests/unit/oauth/xero-tenant-display-contract.test.ts` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth state validation, token exchange, connection creation, disconnect/sync semantics, financial sync execution, webhook behavior, inventory behavior, or database schema.
- Skipped: browser QA because this is a narrow typed display/read-model change with focused tests and no route, navigation, or interaction contract change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe UI states, domain-owned display contracts, tenant isolation, meaningful tests, and reviewable diffs.

### Residual Risk

Low for connected Xero card identifier leakage. Medium for friendly post-connection organization naming because the app does not yet persist Xero tenant display names alongside the tenant ID.
