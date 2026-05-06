# Users Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Public Sign-Up Feedback

### Problem

Sprint 7 closed login feedback, but public sign-up still threw Supabase account-creation failures directly and rendered caught `err.message`. Adding a sign-up formatter by copying the same unsafe-message logic again would also deepen the auth feedback duplication already spread across login, password reset, password change, and resend confirmation.

### Workflow Spine

Public sign-up workflow
-> sign-up route
-> sign-up form
-> Supabase account creation
-> sign-up-success navigation on success
-> sign-up form feedback copy on failure
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Sign-up and account creation.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Sign-up is the account creation path for new RENOZ operators and organizations. It needs clear next-step guidance for existing accounts, rate limits, and weak passwords without exposing provider internals, tokens, database text, stack traces, or runtime details.

### Scope Constraints

- Do not change the sign-up route, layout, form schema, Supabase sign-up semantics, email redirect target, user metadata payload, sign-up-success navigation, confirmation resend behavior, query/cache behavior, or auth lifecycle routing.
- Keep safe existing-account, rate-limit, and password-strength guidance available.
- Change only sign-up feedback normalization and auth-domain formatter plumbing.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added shared auth-domain `extractAuthErrorMessage` and `isUnsafeAuthProviderMessage` utilities.
- Refactored login, password reset, password change, and resend-confirmation formatters to use the shared unsafe-message utility.
- Added auth-owned `formatSignUpError` and `isUnsafeSignUpMessage`.
- Exported the sign-up formatter from the auth hook barrel.
- Updated `SignUpForm` to normalize Supabase sign-up failures and final catch feedback through the sign-up formatter.
- Added focused tests for sign-up copy, unsafe provider/runtime suppression, form wiring, and centralized unsafe-message checks.

### Standards Checked

- Domain ownership: sign-up failure copy is now owned by `src/hooks/auth/sign-up-error-messages.ts`; shared provider-safety checks are owned by `src/hooks/auth/auth-error-message-utils.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the client feedback boundary around existing Supabase sign-up failures.
- Query/cache policy: unchanged. Public sign-up does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, Supabase auth behavior, metadata payload shape, database write path, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The sign-up path suppresses implementation-shaped provider/database/runtime text while preserving safe existing-account, rate-limit, and password-strength copy.
- Reviewability: the diff is limited to one shared auth feedback utility, one sign-up formatter, one form substitution, formatter imports, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw Supabase sign-up error thrown from the public sign-up form.
- Raw caught `err.message` rendering in the sign-up form.
- Duplicated unsafe auth-provider message classifier across existing auth formatters.
- Duplicated auth error-message extraction across existing auth formatters.
- Missing auth-owned formatter coverage for sign-up failures.
- Missing source contract that sign-up feedback remains behind auth-owned copy.

### Deferred

- Invitation acceptance and auth hash/session exchange still need dedicated auth-feedback review.
- `useSignIn` remains a generic unused hook that can still throw raw provider failures if future consumers adopt it without a formatter boundary.
- Live Supabase fixture coverage for uncommon sign-up provider failures remains future hardening.
- Browser QA for sign-up interactions remains future UX verification.

### Gates

- Passed: focused auth feedback tests, `./node_modules/.bin/vitest run tests/unit/auth/sign-up-feedback-contract.test.ts tests/unit/auth/login-feedback-contract.test.ts tests/unit/auth/password-reset-completion-feedback-contract.test.ts tests/unit/auth/password-reset-request-feedback-contract.test.ts tests/unit/auth/password-change-feedback-contract.test.ts tests/unit/auth/resend-confirmation-feedback-contract.test.ts` - 6 files, 13 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 12 files, 47 tests.
- Passed: targeted source scan for legacy raw sign-up message patterns in `SignUpForm` and the sign-up formatter returned no matches.
- Passed: targeted source scan confirming legacy duplicated unsafe-message blocks were removed from auth formatter files returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth routing, Supabase behavior, database behavior, or cross-domain contracts beyond public auth feedback utilities; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. Sprint 7 already adapted the process so serialized gates are not routine evidence for unrelated slices. This sprint follows that posture and keeps the standing product-owner goal focused on domain ownership, operator-safe errors, meaningful tests, reviewable diffs, and repo cleanliness.

### Residual Risk

Medium-low. Public sign-up feedback is safer and auth formatter duplication is reduced, but invitation acceptance, hash/session exchange, and any future consumer of the generic `useSignIn` hook still need separate auth-feedback hardening.
