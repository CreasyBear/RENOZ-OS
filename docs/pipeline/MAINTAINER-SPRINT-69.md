# Pipeline Maintainer Sprint 69

## Status

Closed in commit-ready state.

## Issue 1: Quote Send Attachment and Provider Exceptions Bypassed Staged Results

### Problem

`sendQuote` returned staged failures when the generated quote PDF URL responded with a non-OK status, but thrown attachment-download failures and thrown Resend SDK failures still escaped through the generic server-function path. That made pre-delivery failures less diagnosable and less consistent with the quote-send staged result contract.

### Workflow Spine

Quote detail or opportunity detail send action
-> `useSendQuote`
-> `sendQuote`
-> quote PDF generation
-> quote PDF attachment preparation
-> email-history pending record
-> Resend delivery result
-> email-history status update
-> opportunity activity and proposal stage follow-up
-> quote/document/activity/opportunity cache invalidation
-> operator toast.

### Touched Domains

- Pipeline quote send server workflow.
- Pipeline quote send source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators need to know when a quote was not sent because the attachment could not be prepared or the email provider failed before returning a delivery result. These are retryable operational failures and should not look like ambiguous app crashes or post-delivery partial successes.

### Scope Constraints

- Do not change the PDF generator, email template, recipient inputs, Resend request payload, UI copy, hook invalidation, or post-delivery partial-success behavior from Sprint 68.
- Keep this as pre-delivery staged result hardening inside the quote-send server owner.

### Changes

- Wrapped quote PDF attachment download and `arrayBuffer()` preparation in a staged failure path with `pipelineLogger` evidence.
- Logged non-OK attachment responses as warning evidence while preserving the existing safe attachment failure result.
- Wrapped the Resend send call in a staged provider-exception path.
- Reused a local `markEmailHistoryFailed` helper so both Resend returned errors and thrown provider exceptions update email-history failure evidence consistently.
- Extended the quote-send source contract to protect attachment/provider exception handling and the shared email-history failure helper.

### Standards Checked

- Domain ownership: unchanged; quote send orchestration remains in `quote-send.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this patch only hardens server pre-delivery failure semantics.
- Tenant isolation/data integrity: preserved; email-history failure updates keep tenant predicates and returned-row evidence from Sprint 68.
- Query/cache contract: unchanged; no query keys or invalidation paths changed.
- Honest UI states/operator-safe errors: improved; attachment and provider exceptions now return staged, safe failure results instead of escaping as generic server failures.
- Reviewability: bounded diff across one server module, one focused contract, and this closeout.

### Smells Removed

- Uncaught attachment-fetch and `arrayBuffer()` failures in quote send.
- Uncaught Resend SDK thrown failures before a delivery result is returned.
- Duplicate email-history failed-status update handling for provider failures.

### Deferred

- A retry/reconciliation mechanism for email-history status updates remains a future reliability slice.
- Browser QA remains deferred because this server-result slice does not alter layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-send-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw/provider destructuring and safe attachment/provider exception handling.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers staged workflow contracts, operator-safe errors, tenant-scoped write evidence, meaningful tests, and reviewable diffs.

### Residual Risk

Low for pre-delivery attachment and provider exception handling. Moderate for long-term email-history reconciliation because this slice records failure evidence but does not retry or repair historical pending records.
