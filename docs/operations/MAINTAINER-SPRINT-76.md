# Operations Maintainer Sprint 76: Site Visit Create Payload Contract

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Create Dialogs Duplicated Default And Mutation Payload Assembly

### Problem

After schema ownership was centralized, the project and schedule site-visit create dialogs still separately built the same form defaults and server create payload. That left two places deciding current-user fallback, default duration, optional time coercion, date formatting, and installer ID resolution.

### Workflow Spine

Project detail, project task dialog, or schedule calendar
-> site-visit create dialog
-> shared create form helper
-> shared form schema
-> `useCreateSiteVisit`
-> `createSiteVisitSchema`
-> `createSiteVisit`
-> `site_visits`
-> site-visit cache invalidation.

### Touched Domains

- Jobs project site-visit creation.
- Jobs schedule site-visit creation.
- Site-visit create form helper.
- Site-visit create helper unit test.
- Site-visit mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Scheduling and project teams now send site-visit create payloads through one small contract. That reduces drift between entry points and makes future changes to assignment fallback, duration defaults, or date/time handling safer for operators.

### Scope Constraints

- Do not change create mutation behavior, server validation, database writes, project scoping, activity logging, cache invalidation, or navigation.
- Do not merge the two dialog components.
- Do not add availability, conflict, or capacity scheduling behavior.
- Do not change the current-user fallback product contract.

### Changes

- Added `site-visit-create-form.ts` with shared project defaults, schedule defaults, and create payload builder.
- Updated project and schedule create dialogs to use the shared defaults and payload builder.
- Removed duplicated date formatting, current-user fallback resolution, and default duration literals from the dialogs.
- Added `site-visit-create-form.test.ts` for helper behavior.
- Extended the site-visit mutation contract test to keep payload assembly out of the dialogs.

### Standards Checked

- Domain ownership: strengthened. Site-visit create payload shaping now has one owner under the site-visits domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: route/dialog ownership stayed the same; the form-to-mutation boundary is clearer.
- Tenant isolation/data integrity: not touched.
- Safe mutation/cache contracts: preserved. The helper returns the same `CreateSiteVisitInput` shape used by `useCreateSiteVisit`.
- Honest UI states/operator-safe errors: preserved from Sprint 74.
- Reviewability: the diff is bounded to two dialog call sites, one helper, focused tests, and this closeout.

### Smells Removed

- Duplicated 120-minute default.
- Duplicated current-user fallback default.
- Duplicated form reset shape.
- Duplicated date formatting and optional field coercion before `mutateAsync`.
- Dialog-level installer fallback resolution.

### Deferred

- The two create dialogs still duplicate UI markup and submit success handling. A future component-boundary slice can address that if it starts blocking behavior work.
- True unassigned scheduling remains a schema/server product decision.
- Browser QA was not run because this was a helper extraction with behavior/source coverage and no intended visual change.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/site-visits-mutation-contract.test.ts tests/unit/jobs/site-visit-create-form.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers workflow contracts, modular ownership, safe mutation payloads, meaningful tests, and sprint closeout.

### Residual Risk

Low. Payload drift is now covered. Remaining risk is broader dialog duplication, which should stay deferred until there is a concrete UX or behavior reason to consolidate it.
