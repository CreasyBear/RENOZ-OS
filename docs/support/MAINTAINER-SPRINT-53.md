# Support Maintainer Sprint 53

This sprint follows the knowledge base feedback cleanup into public CSAT feedback. The target is `/feedback/$token`: token validation and public feedback submission failures should be customer-safe before display.

Status: Closed after Issue 1.

## Business Value

CSAT links are customer-facing support touchpoints. When a feedback link is invalid, expired, already used, rate-limited, or temporarily unavailable, the page should explain the next state without leaking infrastructure detail or confusing customers.

## Workflow Spine

Public feedback route
-> `PublicFeedbackPage`
-> `useValidateFeedbackToken` / `useSubmitPublicFeedback`
-> `validateFeedbackToken` / `submitPublicFeedback` server functions and schemas
-> `queryKeys.support.csatToken`
-> customer-safe validation/submission error display and success state.

## Architecture Constraints

- Keep this sprint to public CSAT token validation and submission error display.
- Do not change CSAT server functions, token lifecycle, rating/comment/email schema, rate limits, query keys, or mutation side effects.
- Keep the public route responsible for customer-facing copy.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Public CSAT Feedback Error Boundary

Problem:

- `/feedback/$token` displayed `validationError.message` directly when token validation failed outside a shaped validation response.
- Submission failures displayed `submitMutation.error.message` directly.
- The route had no public-feedback-specific copy for not-found, conflict, validation, or rate-limit failures.

Workflow protected:

Public feedback route -> token validation hook -> token validation server function -> public feedback form -> submit mutation hook -> public submit server function -> safe public error display.

Implemented slice:

- Added a route-local `formatPublicFeedbackError` wrapper around `formatSupportMutationError`.
- Added public CSAT-specific code messages for invalid links, expired/form validation, duplicate submission, and rate limits.
- Routed validation-query failures through the formatter when the server did not return a shaped `validation.error`.
- Routed submit mutation errors through the formatter before rendering the destructive alert.
- Added a source contract to protect the public CSAT error boundary.

Out of scope:

- CSAT server function behavior.
- Feedback token generation/copy flows inside authenticated support UI.
- CSAT metrics/dashboard read states.
- Public route visual redesign.
- Browser QA for customer-facing layout.

Closeout:

- Touched domains: public support CSAT feedback route, support mutation error formatter usage, support tests, support sprint evidence.
- Workflow protected: `/feedback/$token` -> `PublicFeedbackPage` -> `useValidateFeedbackToken` / `useSubmitPublicFeedback` -> CSAT public server functions/schemas -> `queryKeys.support.csatToken` -> safe public validation/submission feedback and success state.
- Business value protected: customers get clear feedback-link and submission states without database, rate-limit internals, or generic raw errors.
- Architecture standards checked: route/hook/server/schema/query-key flow unchanged; hooks still own query/mutation calls; route owns public-facing display copy; CSAT server functions, schemas, token lifecycle, and query keys unchanged.
- Tenant isolation and data integrity checked: no organization predicate, token lookup, feedback-count/update write path, rate-limit behavior, or public-auth boundary changed.
- Query/cache contract checked: `useValidateFeedbackToken` still uses `queryKeys.support.csatToken(token)` and normalized read errors; `useSubmitPublicFeedback` cache behavior remains unchanged.
- Smells removed: raw validation error display; raw submit mutation error display; missing public-specific copy for not-found/conflict/validation/rate-limit failures.
- Smells deferred: authenticated CSAT feedback-link generation/copy feedback still needs review; support dashboard CSAT read-state copy still needs review; public feedback route remains a single route component.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/public-feedback-error-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/query-normalization-wave1.test.tsx` (3 files, 10 tests); source scan for public CSAT raw validation/submission error patterns; `./node_modules/.bin/vitest run tests/unit/support` (53 files, 187 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was an error-display contract slice with no intended layout change; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. The existing maintainer process and risk-selected gate policy fit this slice.
- Residual risk: feedback-link generation/copy, CSAT dashboard read states, and broader support read-state raw query messages remain good follow-up candidates.
