# Pipeline Maintainer Sprint 68

## Status

Closed in commit-ready state.

## Issue 1: Quote Send Email-History Writes Could Break Partial-Delivery Truth

### Problem

After a quote email was accepted by Resend, `sendQuote` still treated email-history status updates as ordinary hard failures. A failed or no-row status update could make the operator see an unsafe generic send failure even though the customer may already have received the quote. The UI also duplicated a stage-bump-only success-message check, so it could not warn when email delivery succeeded but email-history evidence needed review.

### Workflow Spine

Quote detail or opportunity detail send action
-> `useSendQuote`
-> `sendQuote`
-> quote PDF attachment
-> email history create/update evidence
-> Resend delivery
-> opportunity activity and proposal stage follow-up
-> quote/document/activity/opportunity cache invalidation
-> operator toast.

### Touched Domains

- Pipeline quote send server workflow.
- Pipeline quote send success feedback copy.
- Pipeline quote detail and opportunity detail send surfaces.
- Pipeline source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote sending is a customer-facing sales workflow. Operators should not be nudged into duplicate quote sends because internal email-history evidence failed after delivery. They need a clear partial-success warning that preserves the truth: the quote was sent, but internal evidence or follow-up automation needs review.

### Scope Constraints

- Do not change the quote email template, Resend request shape, quote PDF generation, recipient inputs, query invalidation, or send action availability.
- Keep this as email-history evidence and partial-success feedback. Broader outbound email provider behavior remains a communications-domain slice.

### Changes

- Wrapped email-history creation in returned-row evidence before attempting delivery; if it fails, the email is not attempted and the result is operator-safe.
- Added returned-row evidence to failed-status and sent-status email-history updates.
- Logged email-history create/update failures with `pipelineLogger` while returning stable result copy.
- Preserved `success: true` after Resend delivery even if the email-history sent-status update fails, with `emailHistory` stage marked `failed`.
- Added `formatPipelineQuoteSendSuccessMessage` so quote send success toasts account for email-history and follow-up partial-success states.
- Routed both quote detail and opportunity detail send success toasts through the shared formatter.
- Extended focused source contracts for email-history evidence, safe result copy, and shared success feedback.

### Standards Checked

- Domain ownership: quote-send orchestration remains in `quote-send.ts`; UI feedback copy now lives in `src/lib/pipeline/quote-send-feedback.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; the send surfaces, hook, server function, schema/database writes, and centralized query-key invalidation remain aligned.
- Tenant isolation/data integrity: improved; email-history updates now keep tenant predicates and require returned-row evidence.
- Query/cache contract: unchanged; `useSendQuote` still invalidates quote versions, opportunity detail/list, document history, and opportunity activities through centralized query keys.
- Honest UI states/operator-safe errors: improved; delivered-email partial failures now warn instead of implying either full success or full send failure.
- Reviewability: bounded diff across one server module, one small client-safe formatter, two send surfaces, source contracts, and this closeout.

### Smells Removed

- Email-history insert without returned-row evidence.
- Email-history failed/sent status updates without returned-row evidence.
- Hard-failure semantics for post-delivery email-history status failures.
- Duplicated stage-bump-only success-message checks in two quote send surfaces.

### Deferred

- Attachment-download thrown exceptions still rely on the surrounding server-function error path; a dedicated attachment preparation slice can make that staged result safer.
- Email-history status update retry/reconciliation remains a future operational reliability slice.
- Browser QA remains deferred because this slice changes server result semantics and toast copy routing, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-send-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for email-history evidence, shared success feedback, and removed raw/duplicated quote-send result handling.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and process already cover operator-safe errors, honest UI states, tenant-scoped write evidence, meaningful tests, and risk-selected gates.

### Residual Risk

Low for quote-send email-history evidence and partial-success UI copy. Moderate for attachment preparation failures and email-history reconciliation because those still deserve separate slices.
