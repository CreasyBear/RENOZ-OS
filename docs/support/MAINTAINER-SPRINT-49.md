# Support Maintainer Sprint 49

This sprint follows Sprint 48's issue intake feedback cleanup and stays in support issue template management. The target is issue template mutation feedback: create, edit, duplicate, and delete failures should be formatted before display, with the settings route owning server mutation feedback and the dialog owning only local validation.

Status: Closed after Issue 1.

## Business Value

Issue templates speed up RENOZ Energy support intake. When template maintenance fails, operators need safe, actionable feedback and the edit dialog must stay open so work is not lost.

## Workflow Spine

Settings issue templates route
-> `IssueTemplatesSettingsPage`
-> `IssueTemplateList` / `IssueTemplateFormDialog`
-> `useIssueTemplates`, `useCreateIssueTemplate`, `useUpdateIssueTemplate`, `useDeleteIssueTemplate`
-> issue template server functions and schemas
-> `queryKeys.support.issueTemplatesList`, popular templates, and detail cache policy
-> safe route-owned mutation feedback and preserved dialog state.

## Architecture Constraints

- Keep this sprint to issue template mutation feedback ownership.
- Do not change issue template list filters, pagination, form payload shape, create/update/delete server functions, schemas, tenant predicates, or query invalidation.
- Keep form validation feedback inside the dialog.
- Keep server mutation failure feedback at the route boundary and rethrow save failures so the dialog stays open.
- Do not run serialized/reliability gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage.

## Issue Ledger

### 1. Issue Template Feedback Boundary

Problem:

- `issue-templates.tsx` imported `sonner` directly and displayed raw `Error.message` text for duplicate/delete failures.
- Save failures from `IssueTemplateFormDialog` displayed raw `Error.message` text inside the presenter.
- Mutation feedback was split between route and dialog, making it inconsistent with the maintained RMA and escalation presenter pattern.

Workflow protected:

Settings issue templates route -> `IssueTemplatesSettingsPage` -> template list/dialog -> issue template hooks -> issue template server functions -> existing template query invalidation -> safe mutation feedback and preserved dialog state.

Implemented slice:

- Moved the settings route and form dialog to the shared toast adapter.
- Added route-local issue template mutation error formatting using the shared support formatter with template-specific code copy.
- Routed duplicate, delete, create, and update failures through the formatter.
- Re-threw save failures after route-owned feedback so the dialog preserves state.
- Removed server mutation failure toasts from the form dialog while keeping local required-name validation.
- Added a source contract to protect the route/dialog feedback ownership boundary.

Out of scope:

- Extracting an issue template settings container or dedicated mutation hook.
- Changing issue template form fields, list behavior, query keys, cache invalidation, server functions, schemas, or permissions.
- Cleaning CSAT, knowledge base, or read-state raw query feedback debt.

Closeout:

- Touched domains: settings issue template route, support issue template dialog, support mutation feedback formatter usage, support/settings tests, support sprint evidence.
- Workflow protected: settings issue templates route -> `IssueTemplatesSettingsPage` -> `IssueTemplateList` / `IssueTemplateFormDialog` -> `useCreateIssueTemplate` / `useUpdateIssueTemplate` / `useDeleteIssueTemplate` -> issue template server functions/schemas -> existing issue template list/popular/detail cache policy -> safe route-owned feedback and preserved dialog state.
- Business value protected: support admins can maintain reusable issue templates without raw infrastructure messages, and failed saves keep the dialog open instead of losing operator input.
- Architecture standards checked: route/list/dialog/hook/server/schema/database/query-key flow unchanged; route owns mutation orchestration and feedback; dialog owns local validation and presentation; hooks still own query invalidation; issue template server functions and schemas unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, or issue template status behavior changed. Existing authenticated server function behavior remains unchanged.
- Query/cache contract checked: `useCreateIssueTemplate`, `useUpdateIssueTemplate`, and `useDeleteIssueTemplate` invalidation behavior remains unchanged for issue template list, popular templates, and detail cache writes.
- Smells removed: direct `sonner` imports in issue template route/dialog; raw duplicate/delete/save mutation error display; split server mutation feedback ownership between route and presenter.
- Smells deferred: issue template settings still mixes route state, mutation orchestration, and view composition; CSAT, knowledge base, and support read-state feedback still contain direct-toast/raw-error patterns.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/issue-template-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/query-normalization-wave5e.test.tsx`; source scan for issue template raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (49 files, 183 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback ownership slice with no intended visual layout change; serialized/reliability gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage.
- Goal adaptations: declined. The current sprint process and serialized-gate posture still fit.
- Residual risk: CSAT link/submission feedback, knowledge base article/category workflows, and support read-state raw query messages remain. Issue template settings should eventually be split into a thinner route/container boundary before larger behavior changes.
