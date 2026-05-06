# Users Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Auth Callback Feedback

### Problem

Sprint 9 closed public invitation lookup and form feedback, but the shared auth callback path still passed raw callback descriptions to `/auth/error`. `useExchangeHashForSession` forwarded Supabase hash `error_description` values and raw `setSession` exception messages, while `/auth/error` displayed any `error_description` search param directly.

### Workflow Spine

Auth callback workflow
-> update-password or accept-invitation route
-> `useExchangeHashForSession`
-> Supabase hash parse or `setSession`
-> `/auth/error` navigation on callback failure
-> callback-safe public error copy
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Auth callback/hash exchange.
- Auth error route.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Password recovery and invitation activation both depend on auth callback redirects. When a callback fails, operators should get useful guidance for invalid, expired, denied, rate-limited, or token-exchange failures without seeing provider tokens, PKCE/session internals, database text, stack traces, or runtime details.

### Scope Constraints

- Do not change route matching, Supabase hash parsing, PKCE code exchange behavior, `setSession` success behavior, update-password form behavior, invitation acceptance behavior, auth error route actions, query keys, cache invalidation, database writes, or auth lifecycle routing.
- Keep safe reset-link, expired-link, invalid-link, denied, rate-limit, and token-exchange guidance available.
- Change only callback feedback normalization and auth-domain utility ownership.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added lib-owned `formatAuthCallbackError` and `isUnsafeAuthCallbackMessage`.
- Moved shared `extractAuthErrorMessage` and `isUnsafeAuthProviderMessage` from `src/hooks/auth` to `src/lib/auth` so auth callbacks and hook-owned formatters can use the same primitive.
- Updated existing auth feedback formatters to import the shared provider-safety utilities from `src/lib/auth`.
- Updated `useExchangeHashForSession` to sanitize Supabase hash failures and `setSession` failures before exposing `authError.description`.
- Updated `/auth/error` to format search-param descriptions instead of rendering `error_description` directly.
- Added focused tests for callback copy, unsafe provider/session suppression, route/hook wiring, and shared utility ownership.

### Standards Checked

- Domain ownership: callback failure copy is now owned by `src/lib/auth/auth-callback-error-messages.ts`; shared provider-safety checks are owned by `src/lib/auth/auth-error-message-utils.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only callback feedback boundaries around existing auth hash/session failures.
- Query/cache policy: unchanged. Auth callback exchange does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization predicate, invitation token lookup, password reset mutation, Supabase successful session behavior, database write path, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Callback failures now suppress implementation-shaped provider/token/session/runtime text before route display.
- Reviewability: the diff is limited to two lib auth utilities, import relocation in existing auth formatters, one hook substitution, one route substitution, focused tests, and this closeout note.

### Smells Removed

- Raw Supabase hash `error_description` forwarding from `useExchangeHashForSession`.
- Raw `setSession` exception message forwarding from `useExchangeHashForSession`.
- Direct `/auth/error` rendering of user-controlled `error_description`.
- Shared auth provider safety utility living under `hooks/auth` even though lib-level auth callback code needed it.
- Source contracts that previously documented callback feedback as deferred risk.

### Deferred

- `useSignIn` remains a generic unused hook that can still throw raw provider failures if future consumers adopt it without a formatter boundary.
- Auth error route browser QA remains future UX verification.
- Non-auth product/integration callback pages are outside this public-auth slice and should be reviewed in their owning domains.

### Gates

- Passed: focused callback/auth tests, `./node_modules/.bin/vitest run tests/unit/auth/auth-callback-feedback-contract.test.ts tests/unit/auth/accept-invitation-feedback-contract.test.ts tests/unit/auth/sign-up-feedback-contract.test.ts tests/unit/auth/auth-error-route.test.ts tests/unit/auth/password-reset-completion-feedback-contract.test.ts` - 5 files, 18 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 14 files, 53 tests.
- Passed: targeted source scan for raw callback description forwarding and old hooks-local utility imports returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, server mutation behavior, database behavior, or cross-domain contracts beyond public auth callback feedback; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. Moving the shared auth error utility into `src/lib/auth` is an implementation cleanup inside the existing maintainer goal, not a goal change. Sprint 7's serialized-gate posture still applies: serialized gates are not routine evidence for unrelated slices.

### Residual Risk

Low. The public auth callback route and hash exchange now use safe feedback, but future `useSignIn` consumers and non-auth integration callback pages still need their own formatter boundaries if they render provider failures.
