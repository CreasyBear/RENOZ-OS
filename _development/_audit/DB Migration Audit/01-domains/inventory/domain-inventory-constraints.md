# Domain: Inventory — Constraints

## locations

- Unique: (organizationId, code)
- Indexes:
  - (organizationId, isActive)

## warehouseLocations (shared)

- Unique: (organizationId, locationCode)
- Indexes:
  - parentId
  - (organizationId, locationType)

## inventory

- Unique: (organizationId, productId, locationId, lotNumber) when lotNumber IS NOT NULL
- Indexes:
  - (organizationId, productId)
  - (organizationId, locationId)
  - (organizationId, status)
  - productId
  - locationId

## inventoryMovements

- Indexes:
  - (organizationId, productId)
  - (organizationId, locationId)
  - (organizationId, movementType)
  - (organizationId, createdAt)
  - (referenceType, referenceId)

## stockCounts

- Unique: (organizationId, countCode)
- Indexes:
  - (organizationId, status)
  - (organizationId, countType)
  - assignedTo
  - locationId

## stockCountItems

- Unique: (stockCountId, inventoryId)
- Indexes:
  - stockCountId
  - inventoryId
  - countedBy

## inventoryCostLayers

- Indexes:
  - (organizationId, inventoryId)
  - receivedAt
  - quantityRemaining
  - inventoryId

## inventoryForecasts

- Unique: (organizationId, productId, forecastDate, forecastPeriod)
- Indexes:
  - (organizationId, productId)
  - forecastDate
  - forecastPeriod

## inventoryAlerts

- Indexes:
  - (organizationId, alertType)
  - (organizationId, isActive)
  - productId
  - locationId
  - lastTriggeredAt
