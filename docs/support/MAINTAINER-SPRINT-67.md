# Support Maintainer Sprint 67

## Status

Closed in commit-ready state.

## Issue 1: Escalation Rule Hook Ownership

### Problem

`useDeleteEscalationRule` lived inside `use-issue-templates.ts` and invalidated `queryKeys.support.all`. That mixed escalation-rule ownership into the issue-template hook module and preserved a support-root cache refresh path for a mutation that only affects escalation-rule management.

### Workflow Spine

Support escalation-rule management
-> `useDeleteEscalationRule`
-> `deleteEscalationRule` server function
-> organization-scoped escalation-rule deletion
-> support escalation-rule cache family
-> future escalation-rule management surface refresh.

### Touched Domains

- Support escalation-rule mutation hook ownership.
- Support issue-template hook boundary.
- Centralized support query keys.
- Support cache contract tests.

### Business Value Protected

Escalation rules govern how urgent support work can be routed and escalated. Their mutation hooks should be owned by the escalation-rule surface, not hidden in issue-template management, so future operators and maintainers can reason about support automation boundaries without broad cache side effects.

### Scope Constraints

- Do not change support escalation server functions, schemas, database predicates, organization scoping, deletion behavior, activity logging, or mutation payloads.
- Do not add a new escalation-rule UI or read hook.
- Do not change issue-template list/detail/popular cache behavior.
- Keep this to hook ownership and cache scope.

### Changes

- Moved `useDeleteEscalationRule` out of `use-issue-templates.ts` into `use-escalation-rules.ts`.
- Exported the dedicated escalation-rule hook from the support hook barrel, preserving the public hook export path through `@/hooks/support`.
- Added `queryKeys.support.escalationRules()` and replaced support-root invalidation with the escalation-rule cache family.
- Added a focused support contract test that rejects escalation-rule ownership in the issue-template hook and rejects `queryKeys.support.all` invalidation for deletion.

### Standards Checked

- Domain ownership: issue-template hooks no longer own escalation-rule deletion; escalation-rule mutation ownership is explicit.
- Route -> container/page -> hook -> server flow: no caller changed; the support barrel still exports the hook while the hook calls the same server function.
- Query/cache policy: deletion now refreshes a named escalation-rule family instead of the support domain root.
- Tenant isolation/data integrity: no server function, schema, organization predicate, deletion query, activity logging, or database transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, warranty, or customer persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: no UI or mutation error feedback behavior changed.
- Reviewability: the diff is limited to hook ownership, one query-key family, focused tests, and this closeout note.

### Smells Removed

- Escalation-rule mutation hidden in the issue-template hook module.
- Support-root cache invalidation after escalation-rule deletion.
- Stale generic comment claiming list/detail invalidation without naming the affected support surface.

### Deferred

- Escalation-rule list/create/update hooks remain deferred because no current UI surface required them in this slice.
- Escalation-rule read-state and mutation-feedback design remain future support automation work.
- Browser QA remains deferred because no visible UI or interaction path changed.
- Broader jobs, pipeline, supplier, dashboard, and support cache cleanup remains separate domain-sliced work.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/escalation-rule-cache-contract.test.tsx tests/unit/support/issue-template-read-state-contract.test.ts tests/unit/support/support-mutation-errors.test.ts` - 3 files, 9 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/support/use-issue-templates.ts src/hooks/support/use-escalation-rules.ts src/hooks/support/index.ts src/lib/query-keys.ts tests/unit/support/escalation-rule-cache-contract.test.tsx --report-unused-disable-directives`.
- Passed: targeted source scan showing the old `support.all` mutation path removed; remaining `support.all` entries are query-key constructors and the negative contract assertion.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, centralized query keys, safe mutation/cache contracts, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Moderate for future escalation-rule management because read/create/update hooks and UI are still not organized around this new family. Low for this slice: the existing deletion server behavior is unchanged, the public barrel still exports the hook, and the old support-root invalidation path is contracted away.
