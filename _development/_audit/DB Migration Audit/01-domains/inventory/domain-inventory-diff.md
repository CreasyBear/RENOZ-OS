# Domain: Inventory — Diff (PRD vs Drizzle)

## inventoryItems (PRD) vs inventory (Drizzle)

- PRD uses `inventoryItems` with serial/batch + bin location; Drizzle uses `inventory` with `lotNumber` and no `batchNumber` or `binLocation`.
- PRD has `qualityStatus` and separate `inventoryStatus`; Drizzle has a single `status`.
- PRD requires `quantityOnHand`/`quantityAllocated` integer with `quantityAvailable` generated; Drizzle uses numeric quantities and stores `quantityAvailable` without a generated constraint.
- PRD includes `receivedAt`, `reservedUntil`, `lastMovementAt`; Drizzle does not.
- PRD uses `unitCost` decimal(10,4); Drizzle uses currency (12,2) and adds `totalValue`.
- PRD has `version`; Drizzle does not for inventory.

## inventoryMovements

- PRD references `inventoryItemId`; Drizzle uses `inventoryId` and also stores `productId` + `locationId`.
- PRD requires `quantity != 0` and `newQuantity = previousQuantity + quantity`; Drizzle has no checks.
- PRD uses `referenceType` enum; Drizzle stores `referenceType` as text.
- PRD requires `performedBy` NOT NULL; Drizzle uses `createdBy` (nullable via auditColumns).
- PRD uses `costImpact`; Drizzle stores `unitCost` and `totalCost`.

## warehouseLocations (PRD) vs warehouseLocations + locations (Drizzle)

- PRD expects a single `warehouseLocations` hierarchy; Drizzle also has a separate `locations` table used by `inventory` and `inventoryMovements`.
- PRD fields: `locationCode`, `locationType` enum, `attributes`, `capacity`, `isActive`; Drizzle adds `isPickable`, `isReceivable`, and audit/version fields.
- PRD includes `orgId` naming in some sections; Drizzle uses `organizationId`.

## stockCounts / stockCountItems

- PRD `stockCountItems` uses `inventoryItemId`; Drizzle uses `inventoryId`.
- PRD includes generated `variance` column; Drizzle does not store variance.
- PRD requires `varianceThreshold` between 0 and 100; Drizzle has no check.

## inventoryCostLayers

- PRD expects `totalCost` generated and `quantityRemaining <= quantityReceived`; Drizzle does not enforce either.

## inventoryForecasts

- PRD aligns with Drizzle; both store demand, safety stock, reorder points, and unique per product/date/period.

## inventoryAlerts

- PRD uses `notificationChannels` as `text[]`; Drizzle matches but stores arrays via `.array()`.
- PRD includes `threshold` required; Drizzle enforces `NOT NULL`.

## Open Questions

- Do we want to consolidate on `warehouseLocations` and remove the separate `locations` table?
- Should we add generated `quantityAvailable` and allocation constraints to match PRD?
- Should movement reference types be normalized to enum instead of text?
