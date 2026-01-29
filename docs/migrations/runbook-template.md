# Migration Runbook Template

## Scope
- Phase:
- Domain(s):
- Source DB:
- Target DB:
- Org name:
- Old org id:
- New org id:
- Dry run date/time:
- Migration date/time:

## Prerequisites
- Target org exists in new DB.
- Required locations seeded (if inventory-related).
- Service role / pooler access verified.
- Any required lookup tables seeded.

## Extract (Old DB)
- Query list:
  - ...
- Export format: direct SQL / CSV / ETL script.

## Transform Rules
- ID strategy: preserve IDs / remap / lookup table.
- Status mapping:
- Defaults for new-only columns:
- Null handling:
- JSON normalization:

## Load (New DB)
- Load order:
  1) ...
  2) ...
- Constraints to watch:
- Upsert strategy: insert-only / on-conflict.

## Validation
- Row count parity queries:
  - ...
- Spot checks:
  - ...
- Integrity checks:
  - ...

## Backfill / Follow-ups
- Cross-domain references to backfill:
  - ...
- Deferred data:
  - ...

## Rollback / Reset
- Reset strategy:
  - ...
