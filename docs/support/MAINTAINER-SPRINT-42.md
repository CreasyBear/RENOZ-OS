# Support Maintainer Sprint 42

This sprint continues support-domain cleanup after the issue escalation and service/warranty feedback work. The target is issue detail mutation feedback: high-frequency support actions should use the shared toast adapter and operator-safe error formatting instead of surfacing raw exception text.

Status: Closed after Issue 1.

## Business Value

Support issues are daily operational work for RENOZ Energy: triage, status changes, escalation, de-escalation, and deletion need fast feedback that tells operators what to do next without leaking database or infrastructure details. Safe feedback is part of trust in the support desk workflow.

## Workflow Spine

Support issue detail route
-> `useIssueDetail`
-> status, delete, escalate, and de-escalate mutation hooks
-> support issue and escalation server functions
-> existing query invalidation policy
-> operator toast feedback.

## Architecture Constraints

- Keep this sprint inside support issue-detail orchestration.
- Do not change support issue routes, server functions, schemas, database predicates, query keys, cache invalidation, issue status transitions, escalation semantics, tenant scoping, or analytics payloads.
- Reuse the shared toast adapter used by maintained hook boundaries.
- Add a support-owned mutation error formatter that follows service/warranty behavior and suppresses unsafe infrastructure copy.
- Add focused formatter and source-contract tests.
- Treat serialized/reliability gates as closed for the standing goal unless a future slice touches serialized lineage.

## Issue Ledger

### 1. Issue Detail Mutation Feedback Boundary

Problem:

- `useIssueDetail` still imported `sonner` directly.
- Status update, delete, escalate, and de-escalate catch handlers surfaced raw `Error.message` text to operators.
- Raw mutation feedback can leak infrastructure details and makes support behavior inconsistent with the cleaned service/warranty hook boundaries.

Workflow protected:

Issue detail route -> `useIssueDetail` -> status/delete/escalate/de-escalate mutation hooks -> existing server/cache contracts -> safe operator toast feedback.

Implemented slice:

- Added `formatSupportMutationError` for support issue mutations.
- Moved `useIssueDetail` to the shared toast adapter.
- Routed status, delete, escalate, and de-escalate error toasts through the support formatter.
- Added formatter behavior coverage and an issue-detail source contract test.

Out of scope:

- Broader support routes/components that still use direct `sonner` or raw errors.
- Support issue server mutation behavior, status-transition rules, escalation/de-escalation semantics, query invalidation, cache keys, analytics, and tenant predicates.
- Browser/mounted workflow QA.

Closeout:

- Touched domains: support issue detail hook orchestration, support mutation feedback formatting, support unit/source-contract tests, support sprint evidence.
- Workflow protected: support issue detail route -> `useIssueDetail` -> status/delete/escalate/de-escalate mutation hooks -> existing support server functions and query invalidation -> safe operator toast feedback.
- Business value protected: support operators now get actionable, non-leaky feedback for frequent issue actions without exposing database or infrastructure details.
- Architecture standards checked: route/container/page boundaries unchanged; hook still owns issue-detail orchestration; server functions, schemas, database predicates, analytics payloads, query keys, and cache policy unchanged; mutation feedback now follows the shared toast adapter and the service/warranty formatter pattern.
- Tenant isolation and data integrity checked: no server mutation, tenant predicate, database write path, status-transition rule, escalation semantic, or analytics identity changed.
- Query/cache contract checked: existing mutation hooks and invalidation behavior remain unchanged; this slice only changed the presentation feedback boundary after mutation failure.
- Smells removed: direct `sonner` import from `useIssueDetail`; raw `Error.message` operator feedback for issue status update, delete, escalate, and de-escalate failures; missing support-owned mutation formatter for this hook boundary.
- Smells deferred: broader support routes/components still need a pass for direct `sonner` imports and raw mutation errors; browser/mounted workflow QA remains deferred because this was a hook feedback boundary; formatter extraction across support/service/warranty remains deferred until duplication becomes worth a shared helper.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/support-mutation-errors.test.ts tests/unit/support/issue-detail-mutation-feedback-contract.test.ts tests/unit/support/issue-escalation-current-state-contract.test.ts`; `./node_modules/.bin/eslint src/hooks/support/_mutation-errors.ts src/hooks/support/use-issue-detail.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/issue-detail-mutation-feedback-contract.test.ts --report-unused-disable-directives`; source scan for formatter/toast/raw-error patterns in `use-issue-detail`; `./node_modules/.bin/vitest run tests/unit/support`; `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because no route rendering or visual interaction changed; serialized/reliability gates, by maintainer direction, because the serialized gate track is closed and this slice did not touch serialized lineage.
- Goal adaptations: adapted the standing closeout policy so serialized/reliability gates are no longer a default gate after the closed serialized track; declined broader goal changes because the product-owner/repo-maintainer posture still fits.
- Residual risk: support-domain feedback consistency is not complete until the remaining direct `sonner` and raw-error call sites are triaged; safe formatter behavior covers common app/server error shapes but does not replace server-side validation quality.
