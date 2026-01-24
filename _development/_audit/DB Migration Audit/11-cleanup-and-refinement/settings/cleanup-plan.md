# Domain: Settings — Cleanup & Refinement

## Findings
- PRD expects `domain`, `timezone`, `locale`, `currency` columns; schema uses `settings` JSONB.
- Business hours/holidays now canonicalized under settings.
- Audit logs use dedicated table.

## Required Fixes (Atomic)
- [x] Decide if `organizations.domain` should be first-class column or remain in JSONB.
- [x] Verify settings JSONB structure matches PRD expectations.

## Validation
- [x] Business hours/holidays ownership verified
- [x] Audit logs separation verified

