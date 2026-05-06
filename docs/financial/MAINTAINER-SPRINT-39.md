# Financial Maintainer Sprint 39: OAuth Dashboard Sync-Log Feedback

## Status

Closed in commit-ready state.

## Issue 1: OAuth Dashboard Stored Error Read Model

### Problem

OAuth sync logs can store provider, token-refresh, or database failure text for diagnostics. The `/api/oauth/dashboard` endpoint used those stored values directly when building recent activity descriptions and returned metadata unchanged, so unsafe historical sync-log values could reach operator-facing dashboard JSON.

### Workflow Spine

OAuth status workflow
-> OAuth dashboard component
-> `queryKeys.oauth.dashboard`
-> `/api/oauth/dashboard`
-> auth/permission check
-> tenant-scoped sync-log read
-> OAuth-owned feedback formatter
-> safe recent activity JSON
-> UI display formatter.

### Touched Domains

- OAuth integrations.
- Integration status dashboard API.
- Stored sync-log read model.
- OAuth feedback formatter contracts.
- Financial maintainer closeout docs.

### Business Value Protected

The integration dashboard is the operator's triage surface for Xero and workspace sync health. It should show enough state to recover from failed syncs without exposing access tokens, provider bearer strings, database constraint text, OAuth internals, or stack/runtime details.

### Scope Constraints

- Do not change OAuth connection creation, token refresh behavior, sync-log writes, tenant scoping, query keys, cache policy, finance posting, payment reconciliation, or provider API behavior.
- Normalize only the dashboard read model and shallow metadata values returned by the endpoint.
- Keep historical sync-log persistence unchanged for this slice.
- Browser QA is skipped because this is API JSON/read-model behavior with no intended visual layout or interaction change.

### Changes

- Exported the OAuth dashboard `GET` handler for direct route testing while keeping the TanStack route handler wired to the same function.
- Added route-level recent activity formatting through the OAuth-owned status formatter.
- Added shallow metadata value formatting before JSON serialization so unsafe metadata values become safe placeholders.
- Added a focused dashboard route test proving stored unsafe sync-log errors and metadata do not leak through the API response.
- Extended the OAuth feedback source contract so the dashboard route must keep descriptions and details behind the formatter boundary.

### Standards Checked

- Domain ownership: OAuth activity feedback stays owned by `src/lib/oauth/oauth-error-messages.ts`.
- Route -> component -> hook/query -> API route -> schema/database -> query key/cache policy: preserved. This sprint changes the API read model only; the existing dashboard query key and fetch path are unchanged.
- Query/cache policy: unchanged. No cache invalidation, stale-time, or mutation behavior changed.
- Tenant isolation/data integrity: unchanged. Reads remain scoped to `ctx.organizationId`; no writes, transactions, finance posting, payment reconciliation, or inventory paths were touched.
- UI states/error handling: strengthened at the API boundary. The UI formatter remains as a second defensive boundary.
- Reviewability: the diff is limited to one OAuth API route, one focused route test, one source contract update, and this closeout note.

### Smells Removed

- Raw stored sync-log `errorMessage` serialized as the recent activity description.
- Raw sync-log metadata serialized as activity details.
- Missing route-response coverage for unsafe stored OAuth dashboard activity.

### Deferred

- OAuth token refresh/calendar/email sync paths still store raw server-side error text for diagnostics; write-time storage normalization remains a separate persistence policy decision.
- Xero remediation console issue-message review remains a separate financial/Xero slice.
- Browser QA for the integrations dashboard remains future UX verification.

### Gates

- Passed: focused dashboard route and OAuth feedback tests, `./node_modules/.bin/vitest run tests/unit/routes/oauth-dashboard-route.test.ts tests/unit/oauth/oauth-feedback-contract.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is API response/read-model behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, build-time behavior, OAuth persistence writes, finance posting, communications sync, or database contracts; focused route tests, source contracts, typecheck, lint, and diff check covered the changed surface.

### Goal Adaptation

Accepted. The standing closeout now treats serialized-gate evidence as domain-dependent rather than routine; serial lineage is checked and reported only when the active slice touches serialized workflows.

### Residual Risk

Low for the OAuth dashboard read model. Stored historical sync-log values can still contain raw internal text in the database, but this endpoint no longer returns those values directly. Persistence write normalization and Xero remediation issue-message review remain separate slices.
