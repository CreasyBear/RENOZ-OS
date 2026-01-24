# Domain: Inventory — Cleanup & Refinement

## Findings
- Potential naming/ownership confusion: `locations` vs `warehouse_locations`.
- PRD expects `quantityAvailable` generated and constraint `quantityAllocated <= quantityOnHand`.
- Verify org+createdAt DESC indexes on inventory, movements, stock counts, alerts.

## Required Fixes (Atomic)
- [x] Confirm which location table is canonical and align references.
- [x] Add constraint for allocated <= onHand.
- [x] Enforce `quantityAvailable = quantityOnHand - quantityAllocated`.
- [x] Decide if `quantityAvailable` should be generated vs stored.
- [x] Ensure PRD composite indexes (org + createdAt DESC).

## Validation
- [x] DESC indexes match PRD
- [x] Quantity precision matches PRD

