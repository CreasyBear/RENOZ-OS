# Communications Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Inbox Account Failure Copy

### Problem

The inbox account connection workflow still used generic error formatting for connect, sync, and disconnect failures. The OAuth callback route also surfaced raw provider callback descriptions and redirected with raw `error.message` text in search params. That left email account setup behind the communications-owned mutation feedback contract and risked exposing OAuth, provider, token, client, or database details to operators.

### Workflow Spine

Communications settings inbox accounts route
-> `InboxEmailAccountsSettingsPage`
-> `InboxEmailAccountsSettings`
-> connect/sync/disconnect controls and callback route
-> `use-inbox-email-accounts`
-> communications inbox account server functions
-> OAuth flow and inbox account query keys
-> communications-owned inbox account mutation formatter
-> operator-safe failure toast and redirect copy.

### Touched Domains

- Communications inbox account settings.
- Communications inbox account hooks.
- Communications inbox account OAuth callback route.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Connected inbox accounts feed the unified inbox used for ordering, support, warranty, RMA, dealer, and customer follow-up. Operators need account connection, sync, and disconnect failures to be safe and recoverable without leaking OAuth internals, provider responses, tokens, client configuration details, database names, stack traces, or raw server text.

### Scope Constraints

- Do not change inbox account routes, account list UI layout, connect button behavior, OAuth server functions, OAuth flow implementation, schemas, tenant predicates, sync job trigger behavior, success copy, read-state query normalization, or account status derivation.
- Preserve the existing cache policy: callback invalidates inbox email accounts; sync invalidates inbox email accounts and inbox; delete invalidates inbox email accounts.
- Keep this as inbox account failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added inbox account fallbacks for connect, OAuth callback, provider callback, sync, and disconnect failures.
- Expanded the communications mutation formatter's unsafe-message filter for OAuth/provider infrastructure terms such as OAuth client, redirect URI, token, API key, and provider code details.
- Routed connect and sync hook failures through `formatCommunicationInboxAccountMutationError`.
- Routed disconnect failures in `InboxEmailAccountsSettings` through the communications-owned formatter.
- Routed OAuth callback provider errors and callback mutation errors through the communications-owned formatter before toast and redirect search state.
- Replaced the invalid callback redirect description with safe recovery copy.
- Added focused coverage for unsafe inbox account fallback suppression and source-level inbox account formatter wiring.

### Standards Checked

- Domain ownership: inbox account feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing inbox account mutations or callback handling fail.
- Query/cache policy: unchanged. No invalidation, rollback, polling, stale-time, or query-key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, OAuth persistence, sync trigger payload, or account status behavior changed.
- UI states/error handling: strengthened. Account connection, sync, disconnect, and callback failures no longer expose raw OAuth/provider/server text.
- Reviewability: the diff is limited to formatter fallbacks, unsafe-term filtering, account failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for connect, sync, disconnect, and callback failures.
- Raw OAuth callback `search.error_description` display.
- Raw callback `error.message` stored into redirect search params.
- Raw "Failed to connect email account", "Sync failed", and "Disconnect Failed" account failure surfaces.
- Missing inbox account coverage in the communications mutation feedback contract.

### Deferred

- Inbox account read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Template editor, communication preferences, suppression dialogs, scheduled calls, quick log, signatures, email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 6 tests.
- Passed: targeted source scan for inbox account formatter wiring and removed raw account failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 50 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer process already reflects the updated serialized-gate policy and already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for communications inbox account failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
