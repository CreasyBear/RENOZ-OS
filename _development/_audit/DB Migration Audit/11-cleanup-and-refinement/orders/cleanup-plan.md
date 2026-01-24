# Domain: Orders — Cleanup & Refinement

## Findings
- Verify org+createdAt DESC indexes across orders, line items, shipments, templates, amendments.
- PRD expects delivered/shipped composite indexes for shipments.

## Required Fixes (Atomic)
- [x] Confirm PRD composite indexes exist (org + createdAt DESC).
- [x] Ensure shipment deliveredAt/shippedAt DESC indexes match PRD.

## Validation
- [x] DESC indexes match PRD
- [x] Shipment/order template integrity

