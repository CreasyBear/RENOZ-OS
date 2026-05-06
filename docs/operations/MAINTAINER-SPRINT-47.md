# Operations Maintainer Sprint 47: Xero Tenant Selection Display

## Status

Closed in commit-ready state.

## Issue 1: Xero Tenant Picker Shows Raw Tenant IDs

### Problem

The Xero OAuth tenant-selection card displayed raw `tenantId` values as the primary choice label. That is protocol-oriented copy, creates avoidable operator confusion, and conflicts with the safer Xero status/read-model work completed in the financial console.

### Workflow Spine

Xero OAuth tenant selection workflow
-> integrations settings
-> `OAuthConnectionManager`
-> pending selection query
-> `/api/oauth/pending-selection`
-> pending Xero tenant metadata
-> `fetchXeroTenants`
-> Xero connection response
-> tenant selection card
-> selected `tenantId` submitted to `completePendingXeroTenantSelection`.

### Touched Domains

- Operations/integrations.
- OAuth Xero setup flow.
- Xero tenant-selection UI.
- Pending tenant selection schema.
- OAuth focused tests.
- Operations maintainer closeout docs.

### Business Value Protected

Connecting accounting should feel like selecting a Xero organization, not choosing from raw UUIDs. The protocol value still needs to be submitted, but the visible UI should use a business-facing organization label wherever Xero provides one.

### Scope Constraints

- Do not change OAuth state validation, token exchange, tenant selection submission, connection creation, token encryption, webhook tenant resolution, financial sync execution, or query/cache invalidation.
- Keep `tenantId` as the submitted protocol value.
- Add display labels without inventing false organization identity. If Xero does not provide a name, fall back to a numbered "Xero organization" label rather than exposing the raw ID.
- Browser QA is not required because this is a small typed copy/display helper change covered by focused tests and typecheck.

### Changes

- Added `formatXeroTenantDisplayName` and `formatXeroTenantType`.
- Extended `XeroTenantDescriptor` and `PendingXeroTenantSelection` with optional `tenantName`.
- Preserved `tenantId` for submission and stored connection selection.
- Carried `tenantName` from the Xero connections response when present.
- Updated the Xero tenant picker copy to "organization" language.
- Replaced visible `tenant.tenantId` rendering with the display helper.
- Added focused tests proving tenant IDs remain protocol values, not visible card labels.

### Standards Checked

- Domain ownership: tenant display formatting now lives in OAuth/integration helper code rather than inline JSX.
- Route -> component -> API route -> OAuth flow -> schema/cache policy: preserved. The pending-selection route and mutation payload remain unchanged except for optional `tenantName` metadata.
- Tenant isolation/data integrity: unchanged. Pending selection lookup and completion remain scoped by organization/user state and still submit the selected Xero `tenantId`.
- Transactional/integration integrity: unchanged. Connection creation, token storage, and downstream Xero sync behavior are untouched.
- UI states/error handling: strengthened. The picker uses operator-facing organization copy and no longer exposes raw tenant IDs as labels.
- Reviewability: the diff is limited to one display helper, one OAuth flow mapper, one schema contract, one picker UI, focused tests, and this closeout note.

### Smells Removed

- Raw Xero tenant IDs rendered as primary UI labels.
- "Tenant" copy exposed to operators in setup UI.
- Missing display abstraction for Xero tenant descriptors.
- Xero tenant names dropped from the OAuth connection response even when available.
- Missing contract tests for tenant-selection display safety.

### Deferred

- If Xero does not provide `tenantName`, multiple organizations can still be hard to distinguish. A future slice could add a confirm step, account preview, or documented manual verification path.
- Existing OAuth management actions still use connection IDs internally for disconnect/sync operations; this sprint only changes visible Xero tenant selection labels.
- Browser QA can be added if a future sprint changes the broader integrations settings layout or interaction flow.

### Gates

- Passed: focused OAuth tests, `./node_modules/.bin/vitest run tests/unit/oauth/xero-tenant-display-contract.test.ts tests/unit/routes/oauth-callback-route.test.ts tests/unit/routes/oauth-pending-selection-route.test.ts tests/unit/oauth/oauth-feedback-contract.test.ts` - 4 files, 12 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth state validation, token exchange, connection creation semantics, financial sync execution, webhook behavior, inventory behavior, or database schema.
- Skipped: browser QA because this is a narrow typed display/copy change with focused tests and no route or interaction contract change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe UI states, domain-owned display contracts, tenant isolation, meaningful tests, and reviewable diffs.

### Residual Risk

Low for raw tenant IDs being displayed in the Xero selection card. Medium for ambiguous organization selection when Xero does not provide names; the fallback avoids leaking protocol IDs but cannot make unnamed organizations inherently distinguishable.
