# Support Maintainer Sprint 66

This sprint follows the recent support read/error cleanup into the shared support mutation-error boundary. The target is implementation-shaped mutation failures that arrive as client errors and would otherwise be eligible for operator toasts.

Status: Closed in commit-ready state.

## Business Value

Support operators use issue, RMA, knowledge-base, CSAT, and board mutations while handling aftersales and warranty work. A failed mutation should give them recovery guidance, not JavaScript runtime text, SQL details, or stack-shaped implementation clues.

## Workflow Spine

support mutation caller
-> `formatSupportMutationError`
-> optional support workflow wrapper such as `formatRmaMutationError`
-> toast or blocked-action feedback
-> operator retry, correction, or escalation decision.

## Architecture Constraints

- Keep this sprint inside support mutation feedback formatting.
- Do not change support server functions, schemas, database queries, query keys, cache invalidation, mutation behavior, permissions, transactions, or UI layout.
- Preserve safe validation field messages, known code mappings, and workflow-specific override copy.
- Treat implementation-shaped messages as unsafe even when a server layer incorrectly reports them with a 4xx status.

## Issue 1: Support Mutation Implementation-Message Boundary

### Problem

`formatSupportMutationError` already blocked common backend leakage and mapped known support codes, but its 4xx pass-through could still display implementation-shaped messages such as JavaScript runtime errors or SQL syntax details if those arrived as structured client errors. That weakens operator trust across every support mutation surface that correctly uses the shared formatter.

### Implemented Slice

- Extended the shared unsafe-message classifier to include SQL phrases, JavaScript runtime error names, `not a function`, `Cannot read/set properties of undefined/null`, and stack-frame-shaped text.
- Kept existing safe field validation messages, code mappings, and support-specific override behavior unchanged.
- Added focused coverage for generic support mutation feedback and RMA mutation wrappers.

### Closeout

- Touched domains: support mutation feedback, support RMA mutation feedback, support feedback tests, support sprint evidence.
- Workflow protected: support mutation caller -> `formatSupportMutationError` -> optional workflow wrapper -> toast or blocked-action feedback -> operator recovery decision.
- Business value protected: support/RMA operators no longer see JavaScript runtime or SQL-shaped implementation details in mutation failure toasts when a backend reports those as client errors.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; query keys, cache invalidation, mutation payloads, rollback behavior, permissions, and transactions unchanged.
- Tenant isolation and data integrity checked: no organization predicates, tenant IDs, RMA transitions, issue status updates, inventory movements, finance records, or persistence behavior changed.
- Query/cache contract checked: no query keys, invalidation policy, stale data handling, or read-state behavior changed.
- Smells removed: permissive 4xx raw-message pass-through for implementation-shaped Support mutation errors.
- Smells deferred: the formatter still intentionally allows safe field validation text; broader non-support mutation formatter adoption remains a cross-domain future slice.
- Gates run: focused support mutation formatter set, `./node_modules/.bin/vitest run tests/unit/support/support-mutation-errors.test.ts tests/unit/support/rma-mutation-errors.test.ts tests/unit/support/issue-board-feedback.test.ts tests/unit/support/rma-bulk-feedback.test.ts` - 4 files, 14 tests.
- Gates run: broader support suite, `./node_modules/.bin/vitest run tests/unit/support` - 67 files, 205 tests.
- Gates run: `bun run typecheck`.
- Gates run: `bun run lint`.
- Gates run: `git diff --check`.
- Gates skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.
- Goal adaptations: made. Sprint closeout no longer lists the retired serialized gate pack as skipped evidence; serial-lineage evidence should be defined only by slices that actually touch serial identity or movement.
- Residual risk: low for support mutation formatter safety; moderate across the repo because non-support mutation feedback may still have uneven formatter adoption.
