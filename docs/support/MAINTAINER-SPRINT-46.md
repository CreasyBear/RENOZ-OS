# Support Maintainer Sprint 46

This sprint follows Sprint 45's RMA bulk feedback cleanup and stays in the support issue escalation workflow. The target is escalation dialog mutation feedback ownership: the dialog should not duplicate server mutation toasts or leak raw exception text after `useIssueDetail` has already handled the failed escalation path.

Status: Closed after Issue 1.

## Business Value

Escalation and de-escalation are high-trust support actions. Operators need one clear failure message, the reason they typed must remain intact, and infrastructure details should never appear in the UI when a status update fails.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> `EscalationDialog`
-> `escalateIssue` / `deEscalateIssue`
-> existing support issue query invalidation
-> safe operator feedback and preserved dialog state.

## Architecture Constraints

- Keep this sprint to escalation dialog mutation feedback ownership.
- Do not change issue detail routing, escalation server functions, status-transition policy, analytics payloads, query keys, cache invalidation, tenant predicates, or escalation history writes.
- Keep mutation failure feedback owned by `useIssueDetail`, where the support mutation formatter is already applied.
- Keep the dialog open and preserve the typed reason when escalation callbacks reject.
- Do not run serialized/reliability gates for this slice; serialized lineage is now closed baseline unless a future diff touches serialized lineage.

## Issue Ledger

### 1. Escalation Dialog Feedback Ownership

Problem:

- `EscalationDialog` caught failed escalation/de-escalation callbacks and surfaced raw `Error.message` text.
- In the issue detail workflow, `useIssueDetail` already shows sanitized failure feedback and rethrows so the dialog can preserve state. The dialog catch path created a second toast and could leak database or infrastructure messages.
- This split mutation feedback responsibility across the hook and presenter, unlike the maintained RMA dialog pattern.

Workflow protected:

Support issue detail route -> `IssueDetailContainer` -> `useIssueDetail` -> `EscalationDialog` -> `escalateIssue` / `deEscalateIssue` -> existing query invalidation -> one safe failure toast with dialog state preserved.

Implemented slice:

- Removed escalation dialog raw-error toasts and logger-only failure handling.
- Left escalation/de-escalation mutation failure feedback with the submit caller.
- Added behavior coverage that rejected controlled submissions do not toast from the dialog, do not close the dialog, and preserve the typed reason.
- Added a source contract tying escalation dialog feedback ownership to `useIssueDetail`'s support formatter.

Out of scope:

- Changing escalation/de-escalation server functions, validation schemas, transaction behavior, escalation history, support issue cache invalidation, analytics, or browser QA.
- Cleaning remaining raw feedback clusters in support issues board, knowledge base, CSAT, and issue templates.

Closeout:

- Touched domains: support issue escalation dialog, issue detail mutation feedback contract tests, support sprint evidence.
- Workflow protected: support issue detail route -> `IssueDetailContainer` -> `useIssueDetail` -> `EscalationDialog` -> `escalateIssue` / `deEscalateIssue` -> existing support issue invalidation -> safe operator feedback and preserved dialog state.
- Business value protected: operators now get one caller-owned escalation failure message and keep their typed escalation/de-escalation reason after failures, without raw infrastructure text from the presenter.
- Architecture standards checked: route/container/page/hook/server/schema/database/query-key flow unchanged; `useIssueDetail` remains the mutation feedback owner; `EscalationDialog` remains a presenter; server functions, validation schemas, transactions, escalation history writes, analytics payloads, query keys, and cache policy unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, serialized lineage write, or status transition changed. Existing `withAuth`, organization-scoped issue lookup, and escalation history writes remain unchanged.
- Query/cache contract checked: existing escalation and de-escalation mutation invalidation behavior remains unchanged; this slice only changed failed-callback handling inside the presenter.
- Smells removed: raw `Error.message` feedback from `EscalationDialog`; duplicate escalation/de-escalation failure toast path; logger import in a presenter catch path that did not own the mutation boundary.
- Smells deferred: support issues board, new issue creation, knowledge base, CSAT, and issue template workflows still have raw-error/direct-toast patterns; uncontrolled `EscalationDialog` has no current in-repo usage and relies on callers to own mutation feedback.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/escalation-dialog.test.tsx tests/unit/support/escalation-dialog-feedback-contract.test.ts tests/unit/support/issue-detail-mutation-feedback-contract.test.ts`; source scan for escalation dialog raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (45 files, 176 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback ownership slice with unit/source coverage and no visual layout change; serialized/reliability gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not change serialized lineage.
- Goal adaptations: made. Serialized gates are no longer part of the default standing closeout gate list; they should be run only when a sprint touches serialized lineage or a cross-domain invariant that depends on it.
- Residual risk: the remaining support feedback cleanup queue is still substantial, especially issues board, knowledge base, CSAT, new issue creation, and issue template dialogs. This sprint removed one high-trust escalation duplication without broadening scope.
