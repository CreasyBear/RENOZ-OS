# Jobs Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Installer Availability Warning Surfaced Raw Read Errors

### Problem

The installer availability calendar reads availability through `useInstallerAvailability`, which normalizes read failures with the shared read-path policy. The calendar still rendered arbitrary `error.message` values in its unavailable and cached-availability warning, and its non-Error fallback used generic installer-directory copy instead of availability-specific recovery copy.

### Workflow Spine

Installer availability surface
-> installer availability calendar
-> `useInstallerAvailability`
-> `checkAvailability` server function
-> installer availability schema/database
-> `queryKeys.installers.availability(installerId, startDate, endDate)`
-> availability unavailable or cached-availability warning.

### Touched Domains

- Jobs/installer availability read feedback.
- Installer read-feedback helper.
- Installer availability read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Installer availability supports scheduling and dispatch decisions. If availability reads fail, operators should see safe recovery copy tied to the availability workflow instead of raw persistence, tenant, or runtime details.

### Scope Constraints

- Do not change installer list reads, availability calculations, server functions, schemas, tenant checks, query keys, cache invalidation, filters, date navigation, blockouts, or installer selection behavior.
- Preserve the unavailable/cached-availability UI behavior from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `installer-read-error-messages.ts` with `getInstallerAvailabilityReadErrorMessage`.
- Routed the installer availability warning through the installer-owned read-feedback helper.
- Aligned unsafe fallback copy with the installer availability hook contract.
- Added a focused installer availability read-feedback contract test.

### Standards Checked

- Domain ownership: installer availability read feedback remains in `src/components/domain/jobs/installers`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useInstallerAvailability` still normalizes reads and uses centralized installer availability query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; installer availability query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached availability warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one calendar, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the installer availability warning.
- Generic installer-directory fallback copy inside an availability-specific workflow.
- Missing read-feedback contract coverage for installer availability warnings.

### Deferred

- Site-visit installer option read warnings remain a separate Jobs slice.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/installer-availability-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` (2 files, 11 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw installer availability `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for installer availability read feedback. Moderate for broader scheduling UX because this did not dogfood availability filtering, date navigation, or blockout creation.
