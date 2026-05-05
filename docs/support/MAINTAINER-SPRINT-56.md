# Support Maintainer Sprint 56

This sprint follows Sprints 54 and 55 by making the cleaned CSAT components part of the live issue-detail workflow. The target is issue detail: CSAT read, feedback-link generation, and internal feedback entry should have a route -> container -> presenter -> hook -> server function -> schema/database -> query key/cache policy spine.

Status: Closed after Issue 1.

## Business Value

CSAT collection only creates business value if operators can see and act on it from the support issue they are closing. Dormant components do not help RENOZ learn from support outcomes, request feedback after resolution, or record customer feedback gathered offline.

## Workflow Spine

`/support/issues/$issueId`
-> `IssueDetailContainer`
-> `IssueDetailView`
-> `CsatDisplayCard` / `CsatEntryDialog`
-> `useIssueFeedback`, `useGenerateFeedbackToken`, `useSubmitInternalFeedback`
-> `getIssueFeedback`, `generateFeedbackToken`, `submitInternalFeedback`
-> CSAT schemas/database rows
-> `queryKeys.support.csatDetail`, `queryKeys.support.csatList`, `queryKeys.support.csatMetrics`
-> honest issue-detail CSAT state, feedback-link action, internal entry, and retry.

## Architecture Constraints

- Keep this sprint to issue-detail CSAT wiring.
- Do not change CSAT server functions, schemas, token lifecycle, issue status rules, mutation cache policy, or query keys.
- Keep data fetching/mutations in the container and presentation in the view/card.
- Do not change public `/feedback/$token`.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Issue Detail CSAT Workflow Wiring

Problem:

- `CsatDisplayCard` and `CsatEntryDialog` were exported but not referenced by any active route or issue-detail surface.
- The previous CSAT cleanup improved dormant components, but the operator workflow still could not read, request, or enter CSAT from issue detail.
- `CsatDisplayCard` had no hard-error UI for issue feedback read failures, which would create fake "No feedback received yet" states once wired.

Workflow protected:

Issue detail route -> issue detail container -> issue detail view side rail -> CSAT display card/dialog -> CSAT hooks -> CSAT server functions/schemas -> CSAT query keys/cache policy.

Implemented slice:

- Wired `useIssueFeedback`, `useGenerateFeedbackToken`, and `useSubmitInternalFeedback` into `IssueDetailContainer`.
- Passed CSAT read state, mutation callbacks, pending state, and retry into `IssueDetailView`.
- Rendered `CsatDisplayCard` in the issue detail side rail.
- Added hard-error rendering in `CsatDisplayCard` so failed feedback reads do not masquerade as missing feedback.
- Added a source contract to protect the issue-detail CSAT wiring.

Out of scope:

- CSAT server function behavior.
- CSAT dashboard read-state cleanup.
- Public feedback route behavior.
- UI redesign of the issue detail side rail.
- Browser QA of the issue detail page.

Closeout:

- Touched domains: support issue detail container/view, support CSAT display card, CSAT hooks wiring, support tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `IssueDetailView` -> `CsatDisplayCard` / `CsatEntryDialog` -> CSAT hooks -> CSAT server functions/schemas -> CSAT query keys/cache policy -> honest issue-detail CSAT display and actions.
- Business value protected: issue detail now exposes customer satisfaction state and actions where operators close and review support work.
- Architecture standards checked: container owns CSAT hooks and mutations; view/card own presentation; CSAT server functions, schemas, token lifecycle, issue status rules, and query keys unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue lookup, token insert, feedback insert/update transaction, duplicate-feedback check, or permission boundary changed.
- Query/cache contract checked: `useIssueFeedback` still reads `queryKeys.support.csatDetail(issueId)`; `useGenerateFeedbackToken` remains cache-free; `useSubmitInternalFeedback` still updates detail and invalidates CSAT list/metrics keys.
- Smells removed: dormant CSAT issue-detail components; fake empty CSAT issue-detail state on read failure.
- Smells deferred: CSAT dashboard read-state copy still needs review; side-rail layout should be browser-checked when the issue detail UI gets a visual QA pass.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/csat-issue-detail-wiring-contract.test.ts tests/unit/support/csat-entry-feedback-contract.test.ts tests/unit/support/csat-feedback-link-contract.test.ts tests/unit/support/public-feedback-error-contract.test.ts tests/unit/support/support-mutation-errors.test.ts` (5 files, 9 tests); source scan for issue-detail CSAT wiring and honest CSAT read failure state; `./node_modules/.bin/vitest run tests/unit/support` (56 files, 190 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this sprint is route wiring plus source/contract coverage and no dev server was already running; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. The existing maintainer process and risk-selected gate policy fit this slice.
- Residual risk: issue detail side-rail layout should be checked in-browser before a visual release; CSAT dashboard/support read states remain useful cleanup candidates.
