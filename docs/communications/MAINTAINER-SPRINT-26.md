# Communications Maintainer Sprint 26

## Status

Closed in commit-ready state.

## Issue 1: Communications Mutation Implementation-Message Boundary

### Problem

Communications mutation surfaces already route through communications-owned formatters, and the formatter blocks provider, OAuth, token, database, and stack-shaped messages. It still did not classify JavaScript runtime errors, SQL-shaped text, or stack-frame-shaped strings as unsafe. A template, campaign, inbox account, scheduled communication, signature, suppression, quick-log, or preference mutation could therefore surface implementation copy if a backend returned that shape through the existing friendly-message helper.

### Workflow Spine

Communications route, customer communications container, or dialog action
-> communications mutation hook or component mutation
-> `formatCommunicationMutationError` or action-specific wrapper
-> communications server function/provider failure
-> safe recovery copy or workflow-specific fallback
-> operator toast or form summary.

### Touched Domains

- Communications mutation feedback formatting.
- Communications template mutation feedback.
- Communications campaign mutation feedback.
- Communications inbox account mutation feedback.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Communications support customer follow-up, warranty/service coordination, dealer outreach, order updates, and support history. Failed communication actions should tell operators what can be retried or corrected without exposing JavaScript runtime, SQL, OAuth, provider, token, database, or stack internals.

### Scope Constraints

- Do not change communications hooks, server functions, schemas, provider calls, query keys, cache invalidation, mutation behavior, scheduled processing, campaign send processing, or UI layout.
- Preserve safe user-facing recovery copy returned by the existing friendly-message helper.
- Preserve the existing action-specific fallback copy for each communication workflow.
- Change only the unsafe-message classifier inside the communications mutation formatter.

### Changes

- Extended the communications unsafe-message classifier to include SQL phrases, JavaScript runtime error names, `not a function`, `Cannot read/set properties of undefined/null`, and stack-frame-shaped text.
- Added focused coverage for template runtime-error fallback behavior.
- Added focused coverage for campaign SQL-shaped fallback behavior.
- Added focused coverage for inbox-account runtime-error fallback behavior.
- Kept existing formatter adoption contracts and bulk action failure formatting coverage intact.

### Standards Checked

- Domain ownership: communications mutation feedback remains owned by `src/hooks/communications/_mutation-errors.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only client feedback formatting after existing mutation failures.
- Query/cache policy: unchanged. No communications query keys, invalidations, stale behavior, or mutation state contracts changed.
- Tenant isolation/data integrity: unchanged. No organization predicates, provider token flows, campaign state, inbox account state, templates, signatures, suppression entries, scheduled emails/calls, or preference writes changed.
- UI states/error handling: strengthened. Communications toasts and form summaries no longer pass through implementation-shaped messages.
- Reviewability: one formatter branch, one focused test expansion, and this closeout note.

### Smells Removed

- Permissive formatter policy for SQL-shaped communications mutation messages.
- Permissive formatter policy for JavaScript runtime and stack-frame-shaped mutation messages.
- Missing focused tests for implementation-shaped communications mutation feedback.

### Deferred

- Generic communications render-boundary behavior remains separate because it handles render exceptions rather than mutation feedback.
- Other domains with raw mutation or read-state feedback remain separate live-evidence slices.
- Browser QA was deferred because this is formatter behavior with no intended visual layout change.

### Gates

- Passed: focused communications mutation set, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts tests/unit/communications/scheduled-email-processing-behavior.test.ts tests/unit/communications/campaign-send-processing-behavior.test.ts` - 3 files, 22 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 20 files, 71 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Declined. The standing maintainer process already covers operator-safe errors, communications-domain ownership, meaningful tests, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for communications mutation formatter safety. Moderate across the broader repo because finance, jobs, admin, mobile, and API route surfaces still have live raw-error debt that needs separate domain slices.
