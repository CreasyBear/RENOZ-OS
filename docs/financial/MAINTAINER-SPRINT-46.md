# Financial Maintainer Sprint 46: Xero Integration Status Read Model

## Status

Closed in commit-ready state.

## Issue 1: Integration Status Exposes Provider Identifiers

### Problem

The Xero remediation console had safe invoice and payment-event feedback, but its integration status read still returned raw connection and tenant identifiers. The UI rendered the tenant value as "Active tenant", which is provider-oriented copy and not useful for an operator deciding whether to connect, reconnect, or fix setup.

### Workflow Spine

Xero integration status workflow
-> `/financial/xero-sync`
-> `useXeroIntegrationStatus`
-> `getXeroIntegrationStatus`
-> tenant-scoped OAuth connection read
-> `getXeroSyncReadiness`
-> `buildXeroIntegrationStatus`
-> `XeroIntegrationStatus`
-> `XeroSyncStatus` connection alert.

### Touched Domains

- Financial operations.
- Xero remediation console.
- Xero integration status read model.
- OAuth connection read projection for financial status.
- Xero status schema contract.
- Financial/Xero focused tests.
- Financial maintainer closeout docs.

### Business Value Protected

The console should tell RENOZ operators what to do next: continue working, connect Xero, reconnect Xero, or review setup. It should not make operators inspect tenant UUIDs or expose integration internals in normal workflow UI.

### Scope Constraints

- Do not change OAuth connection creation, Xero tenant selection, token refresh, webhook tenant resolution, invoice sync execution, revenue recognition, payment event persistence, payment ledger writes, query keys, cache invalidation, or route navigation.
- Keep `getXeroSyncReadiness` unchanged for adapter consumers.
- Keep tenant IDs available in OAuth setup/selection and webhook resolution flows where they are required by Xero protocol.
- Browser QA is not required because this is a small connection-alert copy/contract change covered by component tests and typecheck.

### Changes

- Added `buildXeroIntegrationStatus` as a pure financial read-model mapper.
- Removed `connectionId`, `tenantId`, and `tenantLabel` from the `XeroIntegrationStatus` client contract.
- Replaced inline integration status response construction with the shared mapper.
- Stopped selecting raw connection ID and tenant ID for the financial integration-status read.
- Added a boolean `hasTenant` projection so an active connection with missing Xero accounting organization selection is reported as setup incomplete without returning the tenant value.
- Replaced connected copy with `Xero accounting connection is active.`
- Removed the remediation console's `Active tenant: ...` display.
- Added focused contract tests covering connected, reconnect, setup-incomplete, no-connection, and source-contract safety paths.

### Standards Checked

- Domain ownership: integration status shaping now lives in financial shared read-model code, not inline in `xero-operations.ts`.
- Route -> hook -> server function -> schema/database -> query key/cache policy: preserved. Query key and hook behavior are unchanged; only returned status shape changed.
- Tenant isolation/data integrity: unchanged. The OAuth connection read remains scoped by `ctx.organizationId`; protocol-level tenant usage remains inside adapter/webhook flows.
- Transactional finance integrity: unchanged. No invoice, revenue, payment, ledger, or order balance mutation logic changed.
- UI states/error handling: strengthened. The UI now renders operator-owned connection state and safe next-action copy.
- Reviewability: the diff is limited to one mapper, one server read function, one schema contract, one alert line, focused tests, and this closeout note.

### Smells Removed

- Raw Xero tenant IDs in the financial integration-status client contract.
- Raw connection IDs in a read model that did not need them.
- UI copy that asked operators to reason about "active tenant" instead of accounting connection health.
- Inline server-function status composition that mixed DB projection, readiness interpretation, and UI copy.
- False-positive connected state when an active OAuth connection is missing its Xero accounting organization selection.
- Missing tests around Xero integration-status response safety.

### Deferred

- OAuth integration management still displays tenant IDs during Xero tenant selection, where the current OAuth flow has no friendlier organization name available. That is a separate integrations UX slice.
- Other OAuth domains still use connection IDs internally for management actions; this sprint only removes unnecessary identifiers from the financial remediation read model.
- Browser QA can be added if a future sprint changes the integrations settings UI, tenant picker, or remediation console layout beyond this alert copy.

### Gates

- Passed: focused financial/Xero tests, `./node_modules/.bin/vitest run tests/unit/financial/xero-integration-status-read-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/financial/xero-sync-issue-feedback-contract.test.ts` - 3 files, 10 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth setup route behavior, invoice sync execution, revenue recognition, payment ledger transaction semantics, inventory behavior, or database contracts.
- Skipped: browser QA because this is a narrow typed read-model and alert-copy change with no route, navigation, or interaction contract change.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-owned read models, operator-safe UI states, tenant isolation, clear workflow spines, meaningful tests, and reviewable diffs.

### Residual Risk

Low for the financial integration-status surface. The OAuth tenant-selection UI still shows raw tenant IDs because Xero tenant discovery currently provides IDs rather than organization display names; that deserves a separate integrations UX/product slice rather than being hidden inside the financial console.
