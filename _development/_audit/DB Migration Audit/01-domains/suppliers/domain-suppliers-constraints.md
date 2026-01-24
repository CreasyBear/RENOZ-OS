# Domain: Suppliers — Constraints

## suppliers
- Unique: (organizationId, supplierCode) when deletedAt IS NULL
- Unique: (organizationId, email) when email IS NOT NULL and deletedAt IS NULL
- Indexes:
  - (organizationId, status)
  - (organizationId, supplierType)
  - (organizationId, overallRating)
  - (organizationId, lastOrderDate)
  - (organizationId, createdAt, id)
  - GIN: full-text search on name
  - GIN: tags
- Checks:
  - rating ranges 0–5
  - minimumOrderValue <= maximumOrderValue (when both set)

## supplier_performance_metrics
- Unique: (supplierId, metricMonth)
- Indexes:
  - supplierId
  - (organizationId, supplierId)
  - metricMonth
  - overallScore
- Checks:
  - deliveryScore, qualityScore, overallScore in 0–100
  - defectRate in 0–100

## purchase_orders
- Unique: (organizationId, poNumber) when deletedAt IS NULL
- Indexes:
  - (organizationId, status)
  - (organizationId, supplierId)
  - supplierId
  - (supplierId, status)
  - orderDate
  - requiredDate
  - expectedDeliveryDate
  - (organizationId, status, orderDate)
  - (organizationId, createdAt, id)
  - orderedBy
  - approvedBy
- Checks:
  - totalAmount = subtotal + taxAmount + shippingAmount - discountAmount
  - approvedAt/approvedBy consistency
  - closedAt/closedBy consistency
  - requiredDate >= orderDate (when requiredDate set)

## purchase_order_items
- Indexes:
  - purchaseOrderId
  - (organizationId, purchaseOrderId)
  - productId
  - (purchaseOrderId, lineNumber)
  - (organizationId, quantityReceived)
  - (organizationId, createdAt, id)
- Checks:
  - quantity > 0
  - unitPrice >= 0
  - lineTotal >= 0
  - quantityReceived <= quantity
  - quantityRejected <= quantityReceived
  - quantityPending = quantity - quantityReceived
  - discountPercent 0–100
  - taxRate 0–100

## purchase_order_receipts
- Unique: (organizationId, receiptNumber)
- Indexes:
  - purchaseOrderId
  - (organizationId, purchaseOrderId)
  - (organizationId, status)
  - receivedAt
  - receivedBy
  - inspectionCompletedBy
  - (organizationId, status, inspectionCompletedAt)
  - (organizationId, createdAt, id)
- Checks:
  - totalItemsExpected/Received/Accepted/Rejected >= 0
  - totalItemsAccepted + totalItemsRejected <= totalItemsReceived
  - inspectionCompletedAt/inspectionCompletedBy consistency

## purchase_order_receipt_items
- Indexes:
  - receiptId
  - (organizationId, receiptId)
  - purchaseOrderItemId
  - (receiptId, lineNumber)
  - condition
  - warehouseLocation
  - lotNumber
  - (organizationId, createdAt, id)
- Checks:
  - quantities >= 0
  - quantityAccepted + quantityRejected = quantityReceived
  - rejectionReason required when quantityRejected > 0

## purchase_order_approvals
- Unique: (purchaseOrderId, level)
- Indexes:
  - purchaseOrderId
  - (organizationId, purchaseOrderId)
  - approverId
  - (approverId, status)
  - (organizationId, status)
  - dueAt
  - (organizationId, status, dueAt)
  - (organizationId, createdAt, id)
- Checks:
  - level > 0
  - approvedAt set only when status = approved
  - rejectedAt set only when status = rejected
  - escalatedTo/escalatedAt consistency

## purchase_order_approval_rules
- Indexes:
  - organizationId
  - (organizationId, isActive)
  - (organizationId, isActive, priority)
  - minAmount
  - maxAmount
  - (organizationId, createdAt, id)
- Checks:
  - maxAmount >= minAmount (when both set)
  - escalationHours > 0 (when set)
  - priority >= 0

## purchase_order_amendments
- Unique: (purchaseOrderId, amendmentNumber)
- Indexes:
  - purchaseOrderId
  - (organizationId, purchaseOrderId)
  - (organizationId, status)
  - requestedBy
  - requestedAt
  - (organizationId, status, requestedAt)
  - (organizationId, createdAt, id)
- Checks:
  - amendmentNumber > 0
  - approvedAt/approvedBy consistency with status
  - rejectedAt/rejectedBy consistency with status
  - appliedAt/appliedBy consistency with status

## purchase_order_costs
- Indexes:
  - purchaseOrderId
  - (organizationId, purchaseOrderId)
  - costType
  - (organizationId, costType)
  - supplierInvoiceNumber
  - (organizationId, createdAt, id)
- Checks:
  - amount >= 0

## price_agreements
- Unique: (organizationId, agreementNumber) when deletedAt IS NULL
- Indexes:
  - supplierId
  - (organizationId, supplierId)
  - (organizationId, status)
  - effectiveDate
  - expiryDate
  - (organizationId, status, expiryDate)
  - createdBy
  - approvedBy
  - (organizationId, createdAt, id)
- Checks:
  - expiryDate > effectiveDate (when set)
  - discountPercent 0–100
  - approvedAt/approvedBy consistency
  - rejectedAt/rejectedBy consistency
  - totalItems >= 0

## supplier_price_lists
- Unique: (supplierId, productId, minQuantity) when isActive = true
- Indexes:
  - supplierId
  - (organizationId, supplierId)
  - productId
  - (organizationId, productId)
  - (supplierId, productId)
  - (organizationId, isActive)
  - isPreferredPrice
  - effectiveDate
  - expiryDate
  - (organizationId, createdAt, id)
- Checks:
  - price >= 0
  - minQuantity > 0
  - maxQuantity >= minQuantity (when set)
  - expiryDate > effectiveDate (when set)
  - discountPercent 0–100
  - leadTimeDays >= 0 (when set)

## supplier_price_history
- Indexes:
  - (supplierId, productId)
  - effectiveDate
  - changedAt
  - priceListId
  - (organizationId, supplierId)
  - (organizationId, productId)
  - (organizationId, changedAt, id)

## price_change_history
- Indexes:
  - priceListId
  - agreementId
  - supplierId
  - (organizationId, supplierId)
  - (organizationId, status)
  - requestedBy
  - requestedAt
  - (organizationId, status, requestedAt)
  - (organizationId, createdAt, id)
- Checks:
  - approvedAt/approvedBy consistency
  - rejectedAt/rejectedBy consistency
  - appliedAt/appliedBy consistency
