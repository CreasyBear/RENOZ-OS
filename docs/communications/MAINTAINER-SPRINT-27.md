# Communications Maintainer Sprint 27: Resend Webhook Signature Log Hygiene

## Status

Closed in commit-ready state.

## Issue 1: Resend Webhook Logged Raw Signature Verifier Text

### Problem

`src/routes/api/webhooks/resend.ts` already returned safe client copy for invalid webhook signatures, but its warning log included `error.message` from the signature verifier. This endpoint accepts external traffic, so verifier text should be classified before logging rather than stored verbatim.

### Workflow Spine

Resend webhook route
-> rate limit
-> raw body and SVIX headers
-> Resend signature verifier
-> provider-owned log context
-> safe 401 response or Trigger.dev handoff.

### Touched Domains

- Communications webhook intake.
- Resend/email-provider error classification.
- Communications route/domain contracts.

### Business Value Protected

Delivery, bounce, complaint, open, and click webhooks feed communications visibility. Invalid external requests should be rejected safely without adding noisy or attacker-controlled verifier text to logs.

### Scope Constraints

- Do not change webhook response statuses, retry semantics, Trigger.dev dispatch behavior, rate limiting, raw-body verification, SVIX header handling, or payload schema.
- Preserve server-side observability with a classified verification failure value.
- Do not change Resend event processing jobs or suppression behavior.

### Changes

- Added `getResendWebhookSignatureFailureLogContext` in `src/lib/email-providers/resend-webhook-errors.ts`.
- Replaced route-level raw verifier message logging with provider-owned verification failure classification.
- Added route coverage proving invalid signatures still return 401 and do not log verifier text.
- Extended the communications domain trace to keep webhook signature failure logging behind the provider helper.

### Standards Checked

- Domain ownership: Resend verifier classification now lives with email-provider integration helpers.
- Route -> provider verification -> log context -> response/Trigger handoff: preserved and clarified.
- Query/cache policy: unchanged; no TanStack cache behavior.
- Tenant isolation/data integrity: unchanged; no database writes or organization predicates changed in this route.
- UI states/error handling: unchanged client response copy; improved operator-safe log hygiene.
- Reviewability: one helper, one route call site, focused route/domain tests, and this closeout.

### Smells Removed

- Route-level `error.message` access for externally-triggered signature verification failures.
- Missing contract around Resend webhook verifier log sanitization.

### Deferred

- Deeper communications job/server-function logging still needs separate review where raw provider details may be operational evidence rather than client or external-input feedback.
- Browser QA was not selected because this slice changes route logging and tests only, with no UI surface.

### Gates

- Passed: `bun run test:vitest tests/unit/routes/resend-webhook-route.test.ts tests/unit/communications/domain-remediation.test.ts` - 2 files, 10 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted route/component/hook raw-message scan with no remaining matches.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe error handling, and reviewable diffs. Serialized gates are retired and were not part of this closeout.

### Residual Risk

Low for the Resend webhook route. The targeted raw-message scan is clean across `src/components/domain`, `src/hooks`, and `src/routes`; broader server-function log and agent-tool text requires separate domain-specific review.
