# Pipeline Maintainer Sprint 67

## Status

Closed in commit-ready state.

## Issue 1: Quote Send Result Payloads Exposed Internal Failure Text

### Problem

`sendQuote` returned raw Resend failure text and raw caught follow-up transaction errors in its result payload. The quote UI already routes failed results through the Pipeline quote formatter, but result strings without status codes can still become operator-visible copy. The follow-up stage update also reported "completed" without proving the tenant-scoped update returned a row.

### Workflow Spine

Quote detail or opportunity detail send action
-> `useSendQuote`
-> `sendQuote`
-> quote PDF attachment
-> email history
-> Resend delivery
-> opportunity activity and proposal stage follow-up
-> quote/document/activity/opportunity cache invalidation
-> operator toast.

### Touched Domains

- Pipeline quote send server workflow.
- Pipeline quote mutation/source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Sending a quote is a customer-facing commercial workflow. RENOZ operators need to know whether the quote email was sent, whether follow-up automation needs attention, and what to do next without seeing provider internals, database details, or misleading stage-success states.

### Scope Constraints

- Do not change the quote email template, recipient inputs, PDF generation orchestration, Resend call shape, hook invalidation, UI layout, or toast behavior.
- Keep this as quote-send result safety and follow-up evidence; broader communications provider cleanup remains separate.

### Changes

- Added stable quote-send server result copy for PDF, attachment, email delivery, and follow-up failures.
- Logged raw Resend and follow-up transaction failures with `pipelineLogger` while returning safe operator-facing result text.
- Added returned-row evidence for the opportunity activity inserted after a successful quote email.
- Added returned-row evidence for the proposal stage update and changed concurrent stage drift from false "completed" to a skipped stage result.
- Extended the quote-send source contract to protect safe result copy, logging, and follow-up write evidence.

### Standards Checked

- Domain ownership: unchanged; quote email send orchestration remains in `quote-send.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the server result contract is safer and `useSendQuote` still owns quote/document/activity/opportunity invalidation through centralized query keys.
- Tenant isolation/data integrity: improved; follow-up activity and stage writes now require returned-row evidence and keep tenant predicates.
- Query/cache contract: unchanged; no new literal query keys or invalidation behavior.
- Honest UI states/operator-safe errors: improved; provider and transaction details stay in logs, while returned result payloads carry stable operator copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Raw `sendError.message` in failed quote-send result payloads.
- Raw caught follow-up `error.message` in partial-success quote-send result payloads.
- Follow-up activity insert without returned-row evidence.
- Proposal stage update that reported success without returned-row evidence.

### Deferred

- Email-history status update evidence remains a future quote-send hardening slice because changing partial-success semantics after delivery needs its own workflow decision.
- Fetch exceptions while downloading the generated PDF attachment still rely on the surrounding server-function error path.
- Browser QA remains deferred because this source-covered slice changes server result contracts and write evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-send-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 8 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw quote-send result messages and added safe result/evidence contract.
- Passed: `git diff --check`.

### Goal Adaptation

Made in execution. The standing goal still treats serialized lineage as a battery-asset invariant, but serialized gates are complete work and are not routine closeout evidence. This sprint omits them from the gate list rather than listing them as skipped.

### Residual Risk

Low for quote-send result payload safety and follow-up write evidence. Moderate for the remaining email-history and attachment-download failure paths because they still deserve a separate partial-delivery semantics pass.
