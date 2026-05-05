# Reliability Maintainer Sprint 1

This sprint codifies the serialized lookup invariant that emerged across orders, warranty, and jobs. The target is a reliability guard that prevents read/fulfillment/support workflows from accidentally re-enabling canonical serialized item auto-upsert through `findSerializedItemBySerial`.

Status: Closed after Issue 1.

## Business Value

RENOZ needs serialized battery lineage to be deliberate. Source-of-stock workflows can create canonical serialized records, but fulfillment, warranty, RMA, support, and service execution workflows should prove those records already exist. A guard keeps that rule from depending on maintainer memory.

## Workflow Spine

```text
developer changes server function
  -> lint:reliability
  -> serialized read auto-upsert guard
  -> every findSerializedItemBySerial call must explicitly set allowAutoUpsert: false
  -> source-of-stock creation remains on upsertSerializedItemForInventory
```

## Architecture Constraints

- Keep this sprint as a static reliability guard, not runtime behavior.
- Preserve existing serialized source-of-stock upsert helpers.
- Avoid a baseline because the current server read call sites already comply.
- Wire the guard into existing `lint:reliability` so normal gates catch regressions.

## Issue Ledger

### 1. Serialized Read Auto-Upsert Was A Cross-Domain Regression Risk

Problem:

- `findSerializedItemBySerial` supports legacy fallback auto-upsert for migration compatibility.
- Multiple sprints hardened non-source workflows by adding `allowAutoUpsert: false`.
- Without a guard, new read/fulfillment/support call sites could omit the flag and silently reintroduce auto-creation.

Workflow protected:

server function serialized read -> explicit auto-upsert opt-out -> canonical record required before business state advances.

Implemented slice:

- Added `scripts/check-serialized-read-auto-upsert.mjs`.
- The guard scans `src/server/functions` for `findSerializedItemBySerial(...)` calls outside the shared helper implementation.
- It fails when a call does not include `allowAutoUpsert: false`.
- It points maintainers toward `upsertSerializedItemForInventory` for source-of-stock workflows.
- Added the guard to `bun run lint:reliability`.

Out of scope:

- Runtime repair/backfill for legacy canonical serialized records.
- Changing source-of-stock upsert paths.
- SQL production serialized lineage gates.
- Browser QA, because this was a static repo reliability guard with no UI behavior change.

Closeout:

- Touched domains: reliability scripts, package reliability gate, reliability sprint evidence.
- Workflow protected: server serialized read call sites -> `lint:reliability` -> explicit auto-upsert opt-out.
- Business value protected: future fulfillment, warranty, support, and service changes cannot accidentally create canonical battery records through read helpers.
- Architecture standards checked: route, container/page, hook, schema, database, query/cache, and runtime behavior were unchanged; this is a gate-only invariant.
- Tenant isolation and data integrity checked: the guard protects org-scoped serialized read contracts by preventing fallback creation in read workflows.
- Query/cache contract checked: no cache changes.
- Smells removed: reliance on human review to catch missing `allowAutoUpsert: false` in server read paths.
- Smells deferred: legacy canonical serialized-record repair/backfill remains needed; source-of-stock upsert paths still need their own documented ownership map.
- Gates run: direct serialized read auto-upsert guard; full `lint:reliability`; diff checks.
- Gates skipped: full unit suite, typecheck, full lint, and browser QA because this was a small Node reliability script/package script change with direct guard execution.
- Goal adaptations: declined. The standing maintainer goal already calls for transactional integrity, serialized lineage continuity, meaningful gates, and evidence-based closeout.
- Residual risk: the guard is static and pattern-based; unusual call formatting could require script improvement, but current server call sites are covered by direct scan evidence.
