# Domain: Products — Diff (PRD vs Drizzle)

## products

- PRD field name `productType`; Drizzle uses `type`.
- PRD `tags` is `text[]`; Drizzle stores JSONB string array.
- PRD requires `createdBy`/`updatedBy` NOT NULL; Drizzle audit columns are nullable and adds `deletedAt`.
- Drizzle adds `barcode`, `taxType`, `pricing`, `reorderPoint`, `reorderQty`, `metadata`, warranty policy fields, and legacy flags (`isActive`, `isSellable`, `isPurchasable`) not in PRD.
- PRD omits `xeroItemId` and SEO fields; Drizzle includes them.

## categories

- PRD has no `defaultWarrantyPolicyId`; Drizzle adds it.
- PRD expects indexes on `organizationId`, `parentId`, `isActive`; Drizzle adds sort order and unique constraints for root/child names.

## productPriceTiers

- PRD requires `price` NOT NULL; Drizzle uses currency default 0 and enforces non-negative check.
- Drizzle adds `discountPercent` optional and `isActive` flag (PRD includes both).

## customerProductPrices

- PRD requires `createdBy` NOT NULL; Drizzle uses audit columns (nullable) with `createdAt`.
- PRD requires `price` NOT NULL; Drizzle uses currency default 0 (non-negative check).

## productBundles

- PRD expects `quantity > 0`; Drizzle enforces with check and default 1.
- Drizzle adds `isOptional` and `sortOrder` (PRD includes both).

## productImages

- PRD requires `uploadedBy` NOT NULL; Drizzle enforces.
- PRD uses `dimensions` as jsonb; Drizzle matches but uses `imageUrl` naming and adds sort/primary flags.

## productAttributes

- PRD uses `categoryIds` as `uuid[]`; Drizzle stores JSONB string array.
- PRD requires `createdBy` NOT NULL; Drizzle enforces.

## productAttributeValues

- PRD unique constraint on `(productId, attributeId)`; Drizzle scopes unique to `(organizationId, productId, attributeId)`.
- Drizzle adds JSONB GIN index on `value`.

## productRelations

- PRD fields align; Drizzle adds unique constraint `(organizationId, productId, relatedProductId, relationType)` and `isActive` flag.

## priceHistory

- Not specified in PRD; Drizzle includes `price_history` for auditing.

## inventoryMovements

- PRD notes inventory movements are defined in shared migration `007_inventory-core.ts`; Drizzle products schema does not include it.

## Open Questions

- Should `tags` be `text[]` to match PRD instead of JSONB?
- Do we want to standardize `productType` naming to match PRD?
