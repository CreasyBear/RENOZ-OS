# Domain: Inventory — Tables

## locations

- id (uuid, PK)
- organizationId (uuid, required)
- code, name, description
- address (jsonb)
- isActive, isDefault, allowNegative
- createdAt, updatedAt, createdBy, updatedBy

## warehouseLocations (shared)

- id (uuid, PK)
- organizationId (uuid, required)
- locationCode, name, locationType
- parentId (uuid -> warehouseLocations.id)
- capacity
- isActive, isPickable, isReceivable
- attributes (jsonb)
- createdAt, updatedAt, createdBy, updatedBy, version

## inventory

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- locationId (uuid -> locations.id)
- status
- quantityOnHand, quantityAllocated, quantityAvailable
- unitCost, totalValue
- lotNumber, serialNumber, expiryDate
- createdAt, updatedAt, createdBy, updatedBy

## inventoryMovements

- id (uuid, PK)
- organizationId (uuid, required)
- inventoryId (uuid -> inventory.id)
- productId (uuid -> products.id)
- locationId (uuid -> locations.id)
- movementType
- quantity, previousQuantity, newQuantity
- unitCost, totalCost
- referenceType, referenceId
- metadata (jsonb), notes
- createdAt, createdBy

## stockCounts

- id (uuid, PK)
- organizationId (uuid, required)
- countCode
- status, countType
- locationId (uuid -> warehouseLocations.id)
- assignedTo
- startedAt, completedAt
- approvedBy, approvedAt
- varianceThreshold, notes, metadata (jsonb)
- createdAt, updatedAt, createdBy, updatedBy
- version

## stockCountItems

- id (uuid, PK)
- stockCountId (uuid -> stockCounts.id)
- inventoryId (uuid -> inventory.id)
- expectedQuantity, countedQuantity
- varianceReason
- countedBy, countedAt
- reviewedBy, reviewedAt
- notes
- createdAt, updatedAt

## inventoryCostLayers

- id (uuid, PK)
- organizationId (uuid, required)
- inventoryId (uuid -> inventory.id)
- receivedAt
- quantityReceived, quantityRemaining
- unitCost
- referenceType, referenceId
- expiryDate
- createdAt

## inventoryForecasts

- id (uuid, PK)
- organizationId (uuid, required)
- productId (uuid -> products.id)
- forecastDate, forecastPeriod
- demandQuantity
- forecastAccuracy, confidenceLevel
- safetyStockLevel, reorderPoint, recommendedOrderQuantity
- calculatedAt, createdAt

## inventoryAlerts

- id (uuid, PK)
- organizationId (uuid, required)
- alertType
- productId (uuid -> products.id)
- locationId (uuid -> warehouseLocations.id)
- threshold (jsonb)
- isActive
- notificationChannels (text[])
- escalationUsers (uuid[])
- lastTriggeredAt
- createdAt, updatedAt, createdBy, updatedBy
- version
