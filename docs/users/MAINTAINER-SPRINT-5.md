# Users Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Password Reset Request Feedback

### Problem

Sprint 4 closed resend-confirmation feedback, but the forgot-password request flow still had a raw reset-message boundary. `ForgotPasswordForm` threw `result.error` directly and rendered caught `error.message`, while `useRequestPasswordReset` could surface thrown server-function or redirect-resolution failures without a password-reset-owned formatter.

### Workflow Spine

Password reset request workflow
-> forgot-password route
-> forgot-password form
-> `useRequestPasswordReset`
-> password-reset rate-limit server function
-> Supabase password-reset email request
-> forgot-password feedback copy
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Password reset request.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Password reset is a recovery workflow for operators who cannot access RENOZ. It must remain enumeration-safe while providing clear rate-limit guidance and hiding provider, token, redirect, stack, or runtime implementation details.

### Scope Constraints

- Do not change forgot-password layout, form validation, success-card behavior, Supabase reset behavior, PKCE redirect semantics, enumeration policy, rate-limit behavior, server function contract, route configuration, query/cache behavior, or auth lifecycle routing.
- Keep safe rate-limit and generic retry guidance available.
- Change only password-reset request client feedback normalization and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added auth-owned `formatPasswordResetRequestError` and `isUnsafePasswordResetMessage`.
- Exported the formatter from the auth hook barrel.
- Updated `useRequestPasswordReset` to normalize thrown server-function failures, returned non-success errors, and redirect-resolution failures.
- Updated `ForgotPasswordForm` to use the auth formatter instead of throwing raw result errors or rendering caught `error.message`.
- Added focused tests for safe rate-limit copy, unsafe auth-provider/runtime suppression, hook normalization, and forgot-password form source behavior.

### Standards Checked

- Domain ownership: password-reset request failure copy is now owned by `src/hooks/auth/password-reset-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the client feedback boundary after existing password-reset request failures.
- Query/cache policy: unchanged. Password reset request does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, auth server function behavior, rate limiter behavior, database write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The reset-request path suppresses implementation-shaped provider/redirect text while preserving safe rate-limit and generic retry copy.
- Reviewability: the diff is limited to one auth formatter, one hook normalization, one form substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw forgot-password `result.error` thrown into form submission.
- Raw caught `error.message` rendering in the forgot-password form.
- Unformatted thrown password-reset request failures from the hook.
- Missing auth-owned formatter boundary for password-reset request failures.
- Missing source contract that forgot-password feedback remains behind auth-owned copy.

### Deferred

- Public login, sign-up, reset completion, invitation acceptance, and hash-exchange auth flows still need their own auth-feedback review.
- Live Supabase fixture coverage for uncommon password reset provider failures remains future hardening.
- Browser QA for forgot-password interactions remains future UX verification.

### Gates

- Passed: focused auth/reset-request tests, `./node_modules/.bin/vitest run tests/unit/auth/password-reset-request-feedback-contract.test.ts tests/unit/auth/resend-confirmation-feedback-contract.test.ts tests/unit/auth/password-change-feedback-contract.test.ts tests/unit/auth/route-policy.test.ts` - 4 files, 17 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 9 files, 40 tests.
- Passed: targeted source scan for raw password-reset request message patterns in the touched hook/form/formatter paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth server behavior, rate-limit behavior, database behavior, or cross-domain contracts beyond the password-reset formatter; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this public auth slice.

### Residual Risk

Medium-low. Password reset request feedback is safer, but public login, sign-up, reset completion, invitation acceptance, and auth hash/session exchange still have separate raw-message surfaces that should be reviewed in dedicated auth slices.
