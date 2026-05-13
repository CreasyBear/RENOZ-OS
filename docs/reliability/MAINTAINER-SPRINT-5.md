# Reliability Maintainer Sprint 5: Route Helper Ignore Policy

## Status

Closed in commit-ready state.

## Issue 1: Route-Local Helper Files Produced Production Build Warnings

### Problem

Production builds warned that route-local helper modules such as `alert-error-messages.ts`, `receiving-error-messages.ts`, and `mobile-warehouse-action-errors.ts` did not export a TanStack `Route`. These files are intentionally helper modules, but the route ignore policy did not classify their suffixes as non-route files.

### Workflow Spine

TanStack route generation
-> route basename ignore policy
-> route-local helper modules
-> production build route tree
-> warning-free route helper classification.

### Touched Domains

- Route generation configuration.
- Route ignore contract test.
- Reliability maintainer closeout docs.

### Business Value Protected

Production builds should make real release blockers obvious. Repeated expected route-helper warnings make build output noisy and reduce confidence when reviewing deployment readiness.

### Scope Constraints

- Do not rename route files, move helper modules, alter route behavior, or change generated route ownership.
- Keep this slice limited to route ignore policy for known helper suffixes.
- Preserve the existing non-route API handler basename exceptions.

### Changes

- Added `error-messages` and `action-errors` to the route helper suffix ignore policy in `app.config.ts`.
- Kept `tsr.config.json` aligned with the same ignore policy used by tests.
- Extended the route ignore contract to cover inventory/mobile helper filenames that triggered build warnings.

### Standards Checked

- Domain ownership: route helper modules remain owned by their route-local domains.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged; this is route generation hygiene only.
- Tenant isolation/data integrity: not touched.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: unchanged; error helper modules remain as-is.
- Query/cache contract: not touched.
- Reviewability: one route policy extension, one synced config file, one focused contract, one closeout note.

### Smells Removed

- Production build warnings for expected route-local `*-error-messages.ts` helpers.
- Production build warning for expected mobile `*-action-errors.ts` helper.

### Deferred

- The remaining OAuth `node:crypto` externalization warning remains a separate auth/server-boundary slice.
- Procurement dashboard extra export code-splitting warning remains a separate route code-splitting slice.
- Full unit-suite failures from the audit remain a release-readiness stabilization slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/routes/route-ignore-pattern.test.ts`.
- Passed: `./node_modules/.bin/eslint tests/unit/routes/route-ignore-pattern.test.ts --report-unused-disable-directives`.
- Passed: direct suffix check against all six previously warned helper basenames.
- Passed: `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=12288 ./node_modules/.bin/vite build`; the inventory/mobile route-helper warnings were absent.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues production-readiness cleanup under the standing maintainer goal.

### Residual Risk

Low. The change only expands the existing basename ignore suffix list for helper modules that are already not routes.
