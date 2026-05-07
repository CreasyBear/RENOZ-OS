# Jobs Maintainer Sprint 15

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Installer Directory Warning Surfaced Raw Read Errors

### Problem

Project and schedule site-visit create dialogs read installer dropdown options through `useAllInstallers`, which normalizes read failures with the shared read-path policy. The shared site-visit option formatter still returned arbitrary `error.message` values, which could leak database, tenant, or runtime details in installer assignment warnings.

### Workflow Spine

Project or schedule site-visit create dialog
-> shared site-visit installer option formatter
-> `useAllInstallers`
-> `listAllActiveInstallers` server function
-> installers schema/database
-> `queryKeys.installers.allActive()`
-> installer directory unavailable or cached-installers warning.

### Touched Domains

- Jobs/site-visit installer assignment read feedback.
- Installer read-feedback helper.
- Site-visit installer directory read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Installer assignment is part of scheduling site visits for battery installation and support work. If the installer directory read fails, operators should keep cached installer options visible where available and see safe recovery copy instead of raw persistence, tenant, or runtime details.

### Scope Constraints

- Do not change installer option values, current-user assignment behavior, project/schedule dialog forms, validation, mutations, server functions, schemas, tenant checks, query keys, cache invalidation, or retry behavior.
- Preserve the unavailable/cached-installers behavior from existing site-visit contract tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `installer-read-error-messages.ts` with `getInstallerDirectoryReadErrorMessage`.
- Routed `formatInstallerDirectoryReadError` through the installer read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused site-visit installer directory read-feedback contract test.

### Standards Checked

- Domain ownership: installer read feedback remains in `src/components/domain/jobs/installers`; site-visit option formatting remains in `src/components/domain/jobs/site-visits`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useAllInstallers` still normalizes reads and uses the centralized all-active installer query key.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, assignment, or database behavior changed.
- Query/cache contract: unchanged; all-active installer query key and retry behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached installer warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one shared formatter, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering through the shared installer directory formatter.
- Installer directory fallback copy living in the site-visit formatter instead of the installer read-feedback helper.
- Missing read-feedback contract coverage for site-visit installer directory warnings.

### Deferred

- Installer profile mutation/read feedback remains a separate Jobs slice.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/site-visit-installer-directory-read-feedback-contract.test.ts tests/unit/jobs/site-visits-mutation-contract.test.ts` (2 files, 4 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw installer directory `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for site-visit installer directory read feedback. Moderate for broader installer UX because installer profile surfaces still have separate mutation/read feedback debt.
