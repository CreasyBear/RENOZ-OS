# Domain: Pipeline — Diff (PRD vs Drizzle)

## opportunities

- PRD requires `value` NOT NULL with `>= 0`; Drizzle uses `currencyColumn` default 0 but does not enforce a non-negative check.
- PRD stage defaults and probabilities differ from Drizzle (`qualified/proposal/negotiation` defaults 25/50/75 in PRD vs 30/60/80 in Drizzle stage defaults).
- PRD has `createdBy`/`updatedBy` NOT NULL; Drizzle audit columns are nullable and adds `deletedAt`.
- Drizzle adds `weightedValue`, `metadata`, and `tags` not listed in PRD.

## opportunityActivities

- PRD enum values: `call|email|meeting|note|follow_up`; Drizzle uses `opportunityActivityTypeEnum` (check for alignment).
- PRD requires `createdBy` NOT NULL; Drizzle enforces NOT NULL but stores no `updatedAt`.
- Drizzle adds `outcome` and `scheduledAt/completedAt` timestamps with full timezone support (aligns with PRD but uses `timestamp with time zone` explicitly).

## quoteVersions

- PRD expects `subtotal`, `taxAmount`, `total` NOT NULL; Drizzle uses `currencyColumn` with default 0 (NOT NULL).
- PRD has no unique constraint on `versionNumber`; Drizzle enforces unique `(opportunityId, versionNumber)`.
- PRD expects `createdBy` NOT NULL and `updatedBy` optional; Drizzle audit columns are nullable.

## winLossReasons

- PRD uses `orgId` naming; Drizzle uses `organizationId`.
- PRD includes `updatedAt`; Drizzle provides standard timestamps and audit columns (nullable).
- Drizzle adds unique constraint on `(organizationId, type, name)` not specified in PRD.
- Drizzle includes RLS policies not described in PRD.

## quotes

- PRD does not define a `quotes` table; Drizzle keeps a `quotes` table for backward compatibility.

## Open Questions

- Should opportunity stage probability defaults follow PRD (10/25/50/75) or Drizzle (10/30/60/80)?
- Should `opportunities.value` add a non-negative check to match PRD?
