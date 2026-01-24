# Cross‑Domain — Cleanup & Refinement

## Findings
- Potential missing explicit FK constraints for `organizationId` across multiple tables
  (many use `organizationColumnBase` without `.references()`).
- Generated column expectations in PRDs (e.g., `overallRating`, `quantityAvailable`) are
  implemented as regular columns with checks, not computed.
- PRD composite indexes often specify `(organizationId, <field>, createdAt DESC)` but
  some schemas use plain `createdAt` or omit `id` tiebreaker.
- Type mismatches vs PRD in a few domains (e.g., tags arrays via JSONB, timestamp text fields).

### Recorded Divergences
- `customer_activities.scheduledAt/completedAt` stored as ISO `text` for flexibility.
- Tag-like lists stored as JSONB arrays for forward-compatible metadata shapes.

## Required Fixes (Atomic)
- [x] Decide if `organizationId` FKs should be explicit in every table; add where missing.
- [x] For each PRD-generated column, either adopt generated column or document rationale.
- [x] Standardize DESC composite index pattern and naming.
- [x] Record any deliberate type divergences in domain docs.

## Validation
- [x] Ownership conflicts resolved
- [x] Cross‑domain FK map consistent

