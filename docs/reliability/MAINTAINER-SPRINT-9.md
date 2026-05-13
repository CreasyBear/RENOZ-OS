# Reliability Maintainer Sprint 9: Jobs Visits Tab Boundary Extraction

## Status

Closed in commit-ready state.

## Issue 1: Jobs Site Visit Tests Imported the Whole Project Detail Tab Module

### Problem

The Jobs query-normalization wave 4A suite contained a slow site-visits degradation assertion. The assertion only needed the visits tab presenter, but imported `project-detail-tabs.tsx`, a broad module that also owns overview, workstreams, tasks, BOM, notes, files, dialogs, hooks, mutations, and timeline dependencies.

That made a small read-state contract pay for unrelated project-detail surfaces and kept the full unit suite slower and more fragile than it needed to be.

### Workflow Spine

Project detail page
-> tab renderer hook
-> visits tab presenter
-> cached/degraded site visit read state
-> operator sees cached site visits or an honest unavailable state
-> source contract verifies safe read-error copy.

### Touched Domains

- Jobs/projects component boundary.
- Jobs site-visits read-state test.
- Jobs source-contract test for project site-visit read feedback.
- Jobs project detail tab renderer exports.
- Reliability maintainer closeout docs.

### Business Value Protected

RENOZ operators use project site visits to coordinate installation and field work. The visits tab should be independently testable because it protects a clear operator state: cached site visits remain visible during degraded reads, and empty-state copy must not pretend failed reads mean no visits exist.

For the repo, this removes a concrete source of test-suite drag and makes future Jobs/project work easier to reason about.

### Scope Constraints

- Do not change the visits tab UI contract or runtime behavior.
- Do not alter site-visit query keys, server functions, schemas, or cache policy.
- Preserve existing barrel compatibility for consumers that import from `project-detail-tabs`.
- Keep the slice limited to the Jobs/projects visits boundary.

### Changes

- Extracted `ProjectVisitsTab` from `project-detail-tabs.tsx` into `project-visits-tab.tsx`.
- Re-exported `ProjectVisitsTab` from the existing project detail and projects barrels to preserve compatibility.
- Updated `use-project-detail-tab-renderers` to import the visits tab directly from its focused module.
- Updated the Jobs wave 4A test to import the visits tab directly instead of the broad project detail tabs module.
- Updated the project site-visits read feedback source contract to inspect the new visits tab file.

### Standards Checked

- Domain ownership: the visits presenter remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; the presenter boundary is narrower, while hooks/server/query contracts stay intact.
- Tenant isolation: not touched.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI states: cached and blocking site-visit degradation assertions preserved.
- Operator-safe error handling: site-visit read error helper remains the only source for operator copy.
- Query/cache contract: unchanged.
- Reviewability: one component extraction, direct import cleanup, source-contract update, and this closeout.

### Smells Removed

- A visits-only test importing the whole project detail tabs module.
- `project-detail-tabs.tsx` holding a visit presenter plus unrelated tab surfaces.
- Full-suite Jobs wave 4A cost from the visits assertion dominating the file.

### Deferred

- `query-normalization-wave4b` and `query-normalization-wave4b-admin` still contain slow BOM and installer availability assertions with broad imports.
- Other non-Jobs integration-style tests remain slow: dashboard overview, suppliers detail, orders fulfillment, and customers/pipeline degraded-list coverage.
- Test environment warnings remain: `--localstorage-file`, missing Upstash env, and some router-provider warnings.

### Gates

- Passed: `./node_modules/.bin/eslint src/components/domain/jobs/projects/project-detail-tabs.tsx src/components/domain/jobs/projects/project-visits-tab.tsx src/components/domain/jobs/projects/containers/use-project-detail-tab-renderers.tsx src/components/domain/jobs/projects/index.ts tests/unit/jobs/query-normalization-wave4a.test.tsx tests/unit/jobs/project-site-visits-read-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/query-normalization-wave4a.test.tsx`, `13` tests in `2.27s`; focused file test body time `1.45s`.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/query-normalization-wave4a.test.tsx tests/unit/jobs/project-site-visits-read-feedback-contract.test.ts tests/unit/jobs/project-workstreams-mutation-contract.test.ts`, `17` tests in `2.13s`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `./node_modules/.bin/vitest run tests/unit`, `672` files and `2255` tests in `86.84s`.

### Goal Adaptation

No adaptation needed. This sprint continues the maintainer goal by removing a concrete Jobs domain boundary smell before doing more behavior work.

### Residual Risk

Low for runtime behavior because the component body was moved without changing its UI logic, and the original read-state assertions still pass. Medium for suite health because other broad integration-style tests still deserve the same extraction treatment when their domains are next touched.
