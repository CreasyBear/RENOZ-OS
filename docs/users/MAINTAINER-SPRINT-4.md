# Users Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Resend Confirmation Feedback

### Problem

Sprint 3 closed authenticated password-change feedback, but the public sign-up success page still read resend-confirmation mutation errors directly. `SignUpSuccessCard` rendered `resendMutation.error.message`, and its retry-after copy appended a second retry sentence to server-provided rate-limit text. A thrown auth/provider failure or malformed server result could therefore surface implementation-shaped copy on a public auth page.

### Workflow Spine

Resend confirmation workflow
-> sign-up success route
-> sign-up success card
-> `useResendConfirmationEmail`
-> resend-confirmation server function
-> Supabase auth provider/rate limiter
-> sign-up success feedback copy
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Sign-up confirmation email resend.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Account confirmation is the first trust checkpoint for new RENOZ operators. Resend failures should preserve enumeration safety and rate-limit guidance without exposing auth provider internals, tokens, stack traces, or runtime details. The page should give calm recovery copy instead of confusing duplicate retry text.

### Scope Constraints

- Do not change sign-up success layout, email input behavior, cooldown behavior, success-card behavior, Supabase resend behavior, enumeration policy, rate-limit behavior, server function contract, route search schema, query/cache behavior, or auth lifecycle routing.
- Keep safe rate-limit and generic retry guidance available.
- Change only resend-confirmation client feedback normalization and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added auth-owned `formatResendConfirmationError` and `isUnsafeResendConfirmationMessage`.
- Exported the formatter from the auth hook barrel.
- Updated `useResendConfirmationEmail` to normalize thrown failures and returned non-success errors.
- Updated `SignUpSuccessCard` to use the auth formatter instead of reading `resendMutation.error.message`.
- Removed duplicate retry-after copy construction from the card by centralizing retry formatting in the formatter.
- Added focused tests for safe rate-limit copy, unsafe auth-provider/runtime suppression, hook normalization, and sign-up success card source behavior.

### Standards Checked

- Domain ownership: resend-confirmation failure copy is now owned by `src/hooks/auth/resend-confirmation-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the client feedback boundary after existing resend-confirmation failures.
- Query/cache policy: unchanged. Resend confirmation does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, auth server function behavior, rate limiter behavior, database write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The resend path suppresses implementation-shaped provider text while preserving safe rate-limit and generic retry copy.
- Reviewability: the diff is limited to one auth formatter, one hook normalization, one card substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Direct `resendMutation.error.message` rendering in the sign-up success card.
- Ad hoc retry-after copy concatenation in the card.
- Missing auth-owned formatter boundary for resend-confirmation failures.
- Missing source contract that resend confirmation feedback remains behind auth-owned copy.

### Deferred

- Public login, sign-up, password reset, invitation acceptance, and hash-exchange auth flows still need their own auth-feedback review.
- Live Supabase fixture coverage for uncommon confirmation resend provider failures remains future hardening.
- Browser QA for sign-up success resend interactions remains future UX verification.

### Gates

- Passed: focused auth/resend tests, `./node_modules/.bin/vitest run tests/unit/auth/resend-confirmation-feedback-contract.test.ts tests/unit/auth/password-change-feedback-contract.test.ts tests/unit/auth/auth-error-route.test.ts tests/unit/auth/error-codes.test.ts` - 4 files, 13 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 8 files, 38 tests.
- Passed: targeted source scan for raw resend-confirmation message patterns in the touched hook/card/formatter paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth server behavior, rate-limit behavior, database behavior, or cross-domain contracts beyond the resend-confirmation formatter; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this public auth slice.

### Residual Risk

Medium-low. Resend confirmation feedback is safer, but public login, sign-up, password reset, invitation acceptance, and auth hash/session exchange still have separate raw-message surfaces that should be reviewed in dedicated auth slices.
