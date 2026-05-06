# Operations Maintainer Sprint 49: Xero Account Display Label Persistence

## Status

Closed in commit-ready state.

## Issue 1: Connected Xero Cards Lose Friendly Organization Names

### Problem

Sprint 47 made Xero tenant selection show organization names when Xero provides them, and Sprint 48 stopped the connected card from rendering raw tenant IDs. The remaining gap was persistence: after setup, the connected card could only show a generic Xero accounting label because `oauth_connections` stored the protocol tenant ID but no safe display label.

### Workflow Spine

Xero account display-label workflow
-> Xero OAuth callback
-> `fetchXeroTenants`
-> `tenantName`
-> single-tenant or pending tenant selection flow
-> `createOAuthConnections`
-> `oauth_connections.external_account_label`
-> `/api/oauth/connections`
-> `listOAuthConnections`
-> `accountLabel`
-> `OAuthConnectionManager` connected Xero card.

### Touched Domains

- Operations/integrations.
- OAuth Xero setup flow.
- OAuth connection persistence schema.
- OAuth connection list read model.
- Xero connected-card display helper.
- OAuth focused tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators can now see a friendly Xero organization name after setup when Xero provides one, without exposing the tenant UUID. This closes the setup-to-connected-state gap and makes the integrations UI easier to trust during accounting configuration.

### Scope Constraints

- Do not change OAuth state validation, token exchange, token encryption, tenant uniqueness checks, stored `externalAccountId`, disconnect/sync actions, webhook tenant resolution, financial sync execution, query keys, cache invalidation, or route navigation.
- Keep tenant IDs available server-side for Xero protocol flows.
- Add only an optional safe label column and read-model field.
- Existing connections are not backfilled because the historical tenant name is not available from the stored tenant ID alone.

### Changes

- Added `oauth_connections.external_account_label` to schema and migration `0040_oauth_external_account_label.sql`.
- Added `externalAccountLabel` to OAuth connection creation input.
- Normalized and stored the safe label during `createOAuthConnections`.
- Carried Xero `tenantName` into `externalAccountLabel` for both single-tenant and pending tenant-selection OAuth flows.
- Stored selected tenant names in OAuth state/log metadata for traceability.
- Returned `accountLabel` from `getOAuthConnection` and `listOAuthConnections`.
- Updated `formatOAuthConnectionAccountLabel` to prefer the safe stored label and fall back to generic accounting copy.
- Added focused tests for label display, list response shape, and Xero tenant display wiring.

### Standards Checked

- Domain ownership: safe OAuth account-display formatting stays in OAuth display helpers; protocol identifiers stay in OAuth flow/server code.
- Route -> component -> API route -> server function -> schema/database -> query/cache policy: preserved. The list route, settings query, mutation actions, and invalidation behavior are unchanged.
- Tenant isolation/data integrity: unchanged. Connection reads and writes remain organization-scoped; tenant uniqueness and protocol ID storage remain intact.
- Transactional/integration integrity: preserved. `createOAuthConnections` still performs connection creation, permission inserts, and sync-log writes in one transaction.
- UI states/error handling: strengthened. Connected Xero cards can show friendly organization labels without raw tenant IDs.
- Reviewability: the diff is limited to one optional column/migration, OAuth flow plumbing, one read-model field, one display helper, focused tests, and this closeout note.

### Smells Removed

- Friendly Xero tenant names captured during setup were dropped after connection creation.
- Connected Xero cards could only show a generic label after raw tenant IDs were removed.
- No dedicated persistence field existed for provider account labels safe for UI display.
- OAuth connection list had no typed `accountLabel` read-model field.
- Missing tests proving tenant names flow from Xero setup into the connected-card label contract.

### Deferred

- Existing Xero connections will show the generic fallback until they are reconnected or a future enrichment/backfill flow fetches tenant display names from Xero.
- The OAuth dashboard/logs still carry protocol IDs in internal metadata where they are used for audit; dashboard formatting remains responsible for safe presentation.
- Browser QA can be added if a future sprint changes the broader integrations settings layout or action flow.

### Gates

- Passed: focused OAuth tests, `./node_modules/.bin/vitest run tests/unit/oauth/oauth-connection-display-contract.test.ts tests/unit/oauth/oauth-connections.test.ts tests/unit/oauth/xero-tenant-display-contract.test.ts` - 3 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth state validation, token exchange semantics, token encryption, disconnect/sync semantics, financial sync execution, webhook behavior, inventory behavior, or existing database constraints.
- Skipped: browser QA because this is a narrow schema/read-model/display-label change with focused tests and no route, navigation, or interaction contract change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe UI states, domain-owned display contracts, tenant isolation, meaningful tests, and reviewable diffs.

### Residual Risk

Low for new Xero connections. Existing Xero connections still lack safe display labels until reconnect or a future Xero enrichment/backfill slice.
