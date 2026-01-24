# Domain: Orders — Tables

## orders

- id (uuid, PK)
- organizationId (uuid, required)
- orderNumber
- customerId (uuid -> customers.id)
- status, paymentStatus (enum)
- orderDate, dueDate, shippedDate, deliveredDate
- billingAddress, shippingAddress (jsonb)
- subtotal, discountAmount, discountPercent, taxAmount, shippingAmount, total
- paidAmount, balanceDue
- metadata (jsonb), internalNotes, customerNotes
- xeroInvoiceId, xeroSyncStatus, xeroSyncError, lastXeroSyncAt, xeroInvoiceUrl
- version
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## orderLineItems

- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- productId (uuid -> products.id, nullable)
- lineNumber, sku, description
- quantity, unitPrice, discountPercent, discountAmount, taxType, taxAmount, lineTotal
- qtyPicked, qtyShipped, qtyDelivered
- notes
- createdAt, updatedAt

## orderAmendments

- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- amendmentType (enum)
- reason
- changes (jsonb)
- status (enum)
- requestedAt, requestedBy
- reviewedAt, reviewedBy, approvalNotes (jsonb)
- appliedAt, appliedBy
- orderVersionBefore, orderVersionAfter
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## orderShipments

- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- shipmentNumber
- status (enum)
- carrier, carrierService, trackingNumber, trackingUrl
- shippingAddress, returnAddress (jsonb)
- weight, length, width, height, packageCount
- shippedAt, estimatedDeliveryAt, deliveredAt
- deliveryConfirmation (jsonb)
- trackingEvents (jsonb)
- shippedBy
- notes, carrierNotes
- createdAt, updatedAt, createdBy, updatedBy

## shipmentItems

- id (uuid, PK)
- organizationId (uuid, required)
- shipmentId (uuid -> orderShipments.id)
- orderLineItemId (uuid -> orderLineItems.id)
- quantity
- serialNumbers (jsonb)
- lotNumber, expiryDate
- notes
- createdAt, updatedAt

## orderTemplates

- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- isActive, isGlobal
- defaultCustomerId (uuid -> customers.id)
- defaultValues (jsonb)
- metadata (jsonb)
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## orderTemplateItems

- id (uuid, PK)
- organizationId (uuid, required)
- templateId (uuid -> orderTemplates.id)
- lineNumber, sortOrder
- productId (uuid -> products.id, nullable)
- sku, description
- defaultQuantity
- fixedUnitPrice, useCurrentPrice
- discountPercent, discountAmount
- taxType
- notes
- createdAt, updatedAt
