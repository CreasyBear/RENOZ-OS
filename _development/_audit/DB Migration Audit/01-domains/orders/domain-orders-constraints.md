# Domain: Orders — Constraints

## orders

- Unique: (organizationId, orderNumber) where deletedAt IS NULL
- Indexes:
  - (organizationId, status)
  - (organizationId, paymentStatus)
  - (organizationId, customerId)
  - (organizationId, orderDate)
  - customerId
  - (organizationId, xeroSyncStatus)

## orderLineItems

- Indexes:
  - orderId
  - productId
  - (organizationId, orderId)

## orderAmendments

- Indexes:
  - organizationId
  - orderId
  - (organizationId, status)
  - (organizationId, requestedAt)

## orderShipments

- Indexes:
  - orderId
  - status
  - (organizationId, status)
  - trackingNumber
  - shippedAt

## shipmentItems

- Indexes:
  - shipmentId
  - orderLineItemId

## orderTemplates

- Indexes:
  - organizationId
  - (organizationId, isActive)
  - name

## orderTemplateItems

- Indexes:
  - templateId
  - productId
