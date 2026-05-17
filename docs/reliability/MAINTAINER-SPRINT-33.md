# Reliability Maintainer Sprint 33: Routine Reliability Gate Contract Cleanup

## Status

Closed and commit-ready.

## Problem

The standing maintainer policy says the old serialized gate pack is closed work
and should not be treated as routine closeout evidence for unrelated slices.
`package.json` still wired `check-serialized-read-auto-upsert.mjs` into
`lint:reliability`, so the executable gate contract contradicted the goal and
process docs.

That made routine reliability evidence noisier than the product-owner posture:
serialized lineage remains a battery-asset invariant, but serial-lineage
evidence should be selected by slices that actually touch serial identity,
movement, warranty/RMA continuity, or related repair scripts.

## Workflow Spine Protected

Maintainer sprint closeout -> quality gate selection -> `lint:reliability` ->
route cast guard, pending dialog guard, read-path query guard -> optional focused
serialized read policy guard only for serial-lineage slices.

## Touched Domains

- Reliability package scripts.
- Maintainer sprint process documentation.
- README quality gate guidance.
- Script inventory documentation.

## Business Value Protected

RENOZ-V3 needs quality gates that operators and maintainers can trust. Routine
closeout should catch broad reliability regressions without reopening completed
serial-lineage work for unrelated UI, docs, or domain-boundary slices. Keeping
the retained serialized policy guard explicit makes future inventory, warranty,
RMA, and repair-script work easier to verify without making every sprint carry a
stale proof burden.

## Scope Constraints

- No application route, UI, hook, server function, schema, query key, mutation,
  tenant, inventory, finance, or serialized-lineage behavior changed.
- No guard implementation logic changed.
- The serialized read policy guard remains available as an explicit command.
- Historical sprint closeout records were left intact as historical evidence.

## Changes

- Removed `check-serialized-read-auto-upsert.mjs` from routine
  `lint:reliability`.
- Added `reliability:serialized-read-policy` as the explicit retained serial
  policy command.
- Updated `docs/reference/maintainer-sprint-process.md` so routine reliability
  covers route casts, pending dialog guards, and read-path query guards.
- Updated `README.md` to describe when the explicit serialized read policy gate
  should be run.
- Updated `scripts/README.md` so the script inventory matches `package.json`.

## Standards Checked

- Domain ownership: reliability gate ownership stays in package scripts and
  reliability docs.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: no app workflow changed.
- Tenant isolation: unchanged.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged in product behavior; the retained
  guard is now opt-in evidence for future slices that deliberately touch serial
  contracts.
- Honest UI states and operator-safe errors: unchanged.
- Mutation/cache contracts: unchanged.
- Reviewable diff: small package/docs-only change.

## Smells Removed

- Routine `lint:reliability` no longer contradicts the maintainer policy by
  running a closed serialized gate for unrelated slices.
- The retained serialized read policy guard now has a named command that states
  its intent.
- README, maintainer process docs, script inventory, and package scripts now
  agree on routine versus focused reliability evidence.

## Smells Deferred

- Historical sprint docs still mention old `lint:reliability` behavior because
  they are records of prior closeouts, not current policy.
- The local `bun run` runtime still fails in this environment with
  `CouldntReadCurrentDirectory`; direct node commands remain the reliable gate
  path for this workspace.
- The serialized read policy guard script name still reflects the old policy
  language. It is retained because renaming the script would add churn without
  improving the current gate contract.

## Gates

- Package script inspection:
  `node -e "const s=JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts; console.log(JSON.stringify({routine:s['lint:reliability'], serial:s['reliability:serialized-read-policy'], routineIncludesSerialized:s['lint:reliability'].includes('serialized')}, null, 2))"`
  - Passed: `routineIncludesSerialized` is `false`.
- Package JSON parse:
  `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package-json-ok')"`
  - Passed.
- Routine reliability command through `bun run lint:reliability`:
  - Failed in this runtime with `CouldntReadCurrentDirectory`.
- Explicit serialized policy command through
  `bun run reliability:serialized-read-policy`:
  - Failed in this runtime with `CouldntReadCurrentDirectory`.
- Direct routine reliability guard evidence:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Direct retained serialized policy guard evidence:
  - `node scripts/check-serialized-read-auto-upsert.mjs` passed.
- Diff hygiene:
  - `git diff --check` passed.
- Typecheck, ESLint, full unit, build, browser QA:
  - Skipped because this slice changes package script wiring and documentation
    only; no TypeScript source, route loading, rendered UI, server behavior,
    schema, mutation, query key, or build-time application code changed.

## Goal Adaptation

No new goal text added. This sprint applies the existing goal adaptation that
serialized lineage remains a domain invariant while the old serialized gate pack
is not routine maintainer evidence.

## Residual Risk

Low application risk because no runtime app code changed. Medium process risk
remains from the local `bun run` cwd failure: package scripts are inspectable and
their underlying node commands pass, but this environment still cannot execute
the `bun run` wrappers directly.
