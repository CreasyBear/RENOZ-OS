# Domain: Products — Constraints

## products

- Unique: (organizationId, sku) where deletedAt IS NULL
- Unique: (organizationId, barcode) where barcode IS NOT NULL and deletedAt IS NULL
- Check: basePrice >= 0
- Check: costPrice IS NULL OR costPrice >= 0
- Indexes:
  - (organizationId, status)
  - (organizationId, isActive)
  - (organizationId, categoryId)
  - (organizationId, type)
  - categoryId
  - warrantyPolicyId
  - (organizationId, createdAt, id)
  - name full-text GIN
  - sku full-text GIN
  - tags GIN

## categories

- Unique: (organizationId, parentId, name) when parentId IS NOT NULL
- Unique: (organizationId, name) when parentId IS NULL
- Check: parentId != id
- Indexes:
  - (organizationId, isActive)
  - parentId
  - (organizationId, sortOrder)
  - defaultWarrantyPolicyId

## productPriceTiers

- Check: minQuantity > 0
- Check: maxQuantity IS NULL OR maxQuantity > minQuantity
- Check: price >= 0
- Check: discountPercent IS NULL OR (discountPercent between 0 and 100)
- Indexes:
  - (organizationId, productId)
  - (productId, minQuantity)
  - (organizationId, isActive)

## customerProductPrices

- Unique: (organizationId, customerId, productId)
- Check: validTo IS NULL OR validTo > validFrom
- Check: price >= 0
- Check: discountPercent IS NULL OR (discountPercent between 0 and 100)
- Indexes:
  - (organizationId, customerId)
  - (organizationId, productId)
  - validFrom
  - validTo

## priceHistory

- Indexes:
  - (organizationId, productId)
  - changedAt
  - changeType
  - (organizationId, customerId)

## productBundles

- Unique: (organizationId, bundleProductId, componentProductId)
- Check: quantity > 0
- Check: bundleProductId != componentProductId
- Indexes:
  - (organizationId, bundleProductId)
  - (organizationId, componentProductId)
  - (bundleProductId, sortOrder)

## productImages

- Check: fileSize IS NULL OR fileSize >= 0
- Indexes:
  - (organizationId, productId)
  - (productId, sortOrder)
  - (productId, isPrimary)

## productAttributes

- Unique: (organizationId, name)
- Indexes:
  - (organizationId, isActive)
  - (organizationId, attributeType)
  - (organizationId, isFilterable)
  - (organizationId, sortOrder)

## productAttributeValues

- Unique: (organizationId, productId, attributeId)
- Indexes:
  - (organizationId, productId)
  - (organizationId, attributeId)
  - value GIN

## productRelations

- Unique: (organizationId, productId, relatedProductId, relationType)
- Check: productId != relatedProductId
- Indexes:
  - (organizationId, productId)
  - (organizationId, relatedProductId)
  - (organizationId, relationType)
  - (productId, sortOrder)
