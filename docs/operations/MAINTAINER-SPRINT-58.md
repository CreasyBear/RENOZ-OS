# Operations Maintainer Sprint 58: Prune Dead Extended Settings Presenters

## Status

Closed in commit-ready state.

## Issue 1: Dead Settings Presenter Surface Remained Public

### Problem

After the settings dialog stopped rendering fake preference, notification, security, API token, and target panes, `settings-sections-extended.tsx` became dead component surface. It was still re-exported from the settings domain barrel, leaving a large stale module available for future code to reuse accidentally.

### Workflow Spine

Settings component ownership workflow
-> `src/components/domain/settings/index.ts`
-> live route/container-owned settings components
-> canonical settings routes and presenters
-> route-owned hooks/server functions/query keys
-> persisted settings behavior.

### Touched Domains

- Settings domain component barrel.
- Legacy settings schema comments.
- Dead settings presenter module.
- Focused settings barrel tests.
- Operations maintainer closeout docs.

### Business Value Protected

The settings domain now exposes fewer misleading building blocks. Future work is less likely to copy stale fake controls into operator workflows, and the repo has less code to scan when maintaining settings behavior.

### Scope Constraints

- Do not change live settings routes, organization settings sections, presenters, hooks, server functions, schemas, query keys, cache invalidation, or UI behavior.
- Keep legacy schema data types exported for compatibility.
- Limit the slice to pruning unused component exports and the dead component file.

### Changes

- Deleted `src/components/domain/settings/settings-sections-extended.tsx`.
- Removed extended settings presenter exports from `src/components/domain/settings/index.ts`.
- Updated the schema comment so legacy settings data types no longer reference the deleted file.
- Added a focused contract that keeps the dead extended presenter file and exports out of the settings domain barrel.

### Standards Checked

- Domain ownership: settings domain exports now reflect live components instead of stale modal-era presenters.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged for every live settings workflow.
- Tenant isolation/data integrity: unchanged. No server functions, permissions, tenant predicates, database writes, or cache keys changed.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: unchanged in behavior; stale fake UI implementation code was removed.
- Reviewability: the diff deletes a dead 585-line component module and adds one focused guard test.

### Smells Removed

- Dead extended settings component module.
- Settings barrel exports for unused fake presenters.
- Stale schema comment pointing at a deleted component implementation.
- Future reuse path for local-only fake save controls.

### Deferred

- Legacy schema data types remain exported because the schemas barrel still exposes them; removing those types should be a separate compatibility slice.
- Broader settings IA remains product design work.
- Other settings route polish should continue domain-by-domain.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/settings-domain-barrel-contract.test.ts tests/unit/settings/settings-dialog-route-handoff-contract.test.ts` - 2 files, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice deleted unused component exports without changing live settings routes, server behavior, schema/database, query key shape, cache invalidation, inventory behavior, or financial behavior.
- Skipped: browser QA because the live UI behavior was already changed and covered in Sprint 57; this slice removes dead code only.

### Goal Adaptation

Declined. The standing maintainer goal already covers modularity, domain ownership, honest UI states, reviewable diffs, and meaningful tests.

### Residual Risk

Low. Typecheck found no hidden consumers. The only remaining risk is external human expectation that these barrel exports existed, but the app itself did not use them.
