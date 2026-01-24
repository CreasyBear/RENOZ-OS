# Domain: Products — Tables

## products

- id (uuid, PK)
- organizationId (uuid, required)
- sku, name, description, barcode
- categoryId (uuid -> categories.id)
- type, status
- isSerialized, trackInventory
- basePrice, costPrice, taxType
- weight, dimensions (jsonb)
- specifications (jsonb)
- seoTitle, seoDescription
- tags (jsonb string[])
- xeroItemId
- pricing (jsonb legacy)
- reorderPoint, reorderQty
- metadata (jsonb)
- warrantyPolicyId (uuid -> warrantyPolicies.id)
- isActive, isSellable, isPurchasable
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## categories

- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- parentId (uuid -> categories.id)
- sortOrder
- isActive
- defaultWarrantyPolicyId (uuid -> warrantyPolicies.id)
- createdAt, updatedAt

## productPriceTiers

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- minQuantity, maxQuantity
- price, discountPercent
- isActive
- createdAt

## customerProductPrices

- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- productId (uuid -> products.id)
- price, discountPercent
- validFrom, validTo
- createdAt, createdBy, updatedBy

## priceHistory

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- changeType
- previousPrice, newPrice, previousDiscountPercent, newDiscountPercent
- tierId, customerId
- reason, changedBy, changedAt

## productBundles

- id (uuid, PK)
- organizationId (uuid, required)
- bundleProductId (uuid -> products.id)
- componentProductId (uuid -> products.id)
- quantity, isOptional, sortOrder
- createdAt

## productImages

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- imageUrl
- altText, caption
- sortOrder, isPrimary
- fileSize, dimensions (jsonb)
- uploadedBy
- createdAt

## productAttributes

- id (uuid, PK)
- organizationId (uuid, required)
- name, attributeType, description
- options (jsonb)
- isRequired, isFilterable, isSearchable
- categoryIds (jsonb string[])
- sortOrder
- isActive
- createdBy, createdAt

## productAttributeValues

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- attributeId (uuid -> productAttributes.id)
- value (jsonb)
- createdAt, updatedAt

## productRelations

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- relatedProductId (uuid -> products.id)
- relationType
- sortOrder, isActive
- createdBy, createdAt
