# Supabase Schema Snapshot (renoz-website)

Snapshot source: Supabase project `renoz-website` (`tcrpfwxfsbkrwqielhfg`).

## Raw JSON Artifacts
- `schema-snapshot-tables.json` - tables/views with columns (no defaults/udt)
- `schema-snapshot-constraints.json` - PK/UK/FK/CHECK constraints
- `schema-snapshot-indexes.json` - indexes
- `schema-snapshot-rls.json` - RLS policies
- `schema-snapshot-enums.json` - enums
- `schema-snapshot-matviews.json` - materialized views

## High-Level Observations
- Public schema reflects the baseline CRM tables from the greenfield reset.
- RLS policies have been normalized and enforced across all public tables.
- Materialized views exist in `public` but are locked down from API access.

## Post-Reset Update (2026-01-22)
- RLS remediation applied and verified via Security Advisor (no RLS warnings).
- MV refresh completed (greenfield counts are zero).
- Snapshot artifacts in `schema-snapshot-*.json` were **not regenerated** after the reset; re-run snapshot extraction if a fresh JSON snapshot is needed.

## Notes on Coverage
- Column defaults and UDT names were omitted in `schema-snapshot-tables.json` to keep size manageable.
- If defaults/UDT details are required later, re-query and store as a separate artifact.
