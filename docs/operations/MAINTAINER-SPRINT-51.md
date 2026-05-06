# Operations Maintainer Sprint 51: API Token Settings Feedback Safety

## Status

Closed in commit-ready state.

## Issue 1: API Token Settings Used Raw Error Copy

### Problem

The API Tokens settings route still rendered raw read errors and passed `createMutation.error?.message` into the token creation dialog. Revoke failures also had no operator-visible feedback. Because API tokens are security-sensitive, this path should never expose database, hashing, provider, stack, or token metadata details in UI copy.

### Workflow Spine

API token settings feedback workflow
-> `/settings/api-tokens`
-> `ApiTokensContent`
-> `useApiTokens`, `useCreateApiToken`, `useRevokeApiToken`
-> `listApiTokens`, `createApiToken`, `revokeApiToken`
-> `apiTokens` schema/database rows
-> `queryKeys.apiTokens.list()`
-> safe read and mutation feedback.

### Touched Domains

- Settings.
- API token security settings.
- Settings read-error messages.
- Settings mutation-error messages.
- Focused API token feedback tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators can manage third-party integration tokens without seeing raw infrastructure or token-storage details when reads, creation, or revocation fail. Revoke failures now produce actionable feedback instead of failing silently.

### Scope Constraints

- Do not change token generation, hashing, plaintext one-time display, validation, revoke semantics, permissions, audit logging, database schema, query key shape, or invalidation behavior.
- Keep token creation inline error display.
- Add only safe read/mutation feedback and a focused contract guard.

### Changes

- Added API token read messages to the settings read-error contract.
- Added settings mutation-error formatting with API token create/revoke fallbacks and safe code messages.
- Updated `useApiTokens` to reuse the settings-owned API token read fallback.
- Routed API token read alerts through `formatSettingsReadError`.
- Routed token creation dialog errors through `formatApiTokenMutationError`.
- Added safe revoke failure toast feedback.
- Added focused tests proving raw API token read/mutation errors fall back to safe copy and the route/hook/server/query-key spine remains reviewable.

### Standards Checked

- Domain ownership: settings-owned feedback copy now lives in `src/lib/settings`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for API tokens.
- Tenant isolation/data integrity: unchanged. `listApiTokens` remains organization-scoped, and non-admin users remain scoped to their own tokens.
- Transactional integrity: unchanged. Create/revoke still keep token row changes and activity logging inside transactions.
- UI states/error handling: strengthened. Read, create, and revoke failures use operator-safe copy.
- Reviewability: the diff is limited to API token feedback, settings feedback helpers, a focused contract test, and this closeout note.

### Smells Removed

- Raw `error.message` rendering for API token read alerts.
- Raw `createMutation.error?.message` in the create-token dialog.
- Revoke mutation failures with no visible operator feedback.
- API token read fallback copy duplicated in hook and route instead of settings-owned constants.
- Missing focused tests for API token settings feedback safety.

### Deferred

- Broader API token page layout and table responsiveness remain separate UI quality work.
- API token create/revoke optimistic state and loading polish can be reviewed in a future interaction-focused slice.
- Knowledge Base settings still has a support-owned category read-error gap and should be handled separately through the support formatter.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/api-token-feedback-contract.test.ts tests/unit/settings/settings-read-error-messages.test.ts` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change token generation, token hashing, token validation, database schema, routing behavior, query key shape, permissions, audit transaction semantics, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow feedback contract change with focused tests and no layout, navigation, or interaction-flow change beyond showing safe revoke failure feedback.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, security-sensitive domain ownership, safe mutation/cache contracts, tenant isolation, meaningful tests, and reviewable diffs.

### Residual Risk

Low. API token feedback is now safe for the touched read/create/revoke states. Remaining settings support read-error debt should be handled as its own support-owned slice.
