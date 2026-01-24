# Domain: Suppliers — Tables

## suppliers
- id (uuid, PK)
- organizationId (uuid, required)
- supplierCode
- name, legalName
- email, phone, website
- status, supplierType
- taxId, registrationNumber
- primaryContactName, primaryContactEmail, primaryContactPhone
- billingAddress, shippingAddress (jsonb)
- paymentTerms, currency
- leadTimeDays, minimumOrderValue, maximumOrderValue
- qualityRating, deliveryRating, communicationRating, overallRating, ratingUpdatedAt
- totalPurchaseOrders, totalPurchaseValue, averageOrderValue
- firstOrderDate, lastOrderDate
- tags (jsonb), customFields (jsonb), notes
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## supplier_performance_metrics
- id (uuid, PK)
- organizationId (uuid, required)
- supplierId (uuid -> suppliers.id)
- metricMonth
- delivery metrics (totalOrdersDelivered, onTimeDeliveries, lateDeliveries, averageDeliveryDays)
- quality metrics (totalItemsReceived, acceptedItems, rejectedItems, defectRate)
- financial metrics (totalSpend, averageOrderValue)
- response metrics (averageResponseTimeHours)
- scores (deliveryScore, qualityScore, overallScore)
- createdAt

## purchase_orders
- id (uuid, PK)
- organizationId (uuid, required)
- poNumber
- supplierId (uuid -> suppliers.id)
- status
- orderDate, requiredDate, expectedDeliveryDate, actualDeliveryDate
- shipToAddress, billToAddress (jsonb)
- subtotal, taxAmount, shippingAmount, discountAmount, totalAmount
- currency, paymentTerms
- orderedBy, orderedAt
- approvedBy, approvedAt, approvalNotes
- closedBy, closedAt, closedReason
- supplierReference, internalReference
- notes, internalNotes, metadata (jsonb)
- version
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## purchase_order_items
- id (uuid, PK)
- organizationId (uuid, required)
- purchaseOrderId (uuid -> purchase_orders.id)
- productId (uuid -> products.id, nullable)
- lineNumber
- productName, productSku, description
- quantity, unitOfMeasure
- unitPrice, discountPercent, taxRate, lineTotal
- quantityReceived, quantityRejected, quantityPending
- expectedDeliveryDate, actualDeliveryDate
- notes
- createdAt, updatedAt

## purchase_order_receipts
- id (uuid, PK)
- organizationId (uuid, required)
- purchaseOrderId (uuid -> purchase_orders.id)
- receiptNumber
- receivedBy, receivedAt
- carrier, trackingNumber, deliveryReference
- totalItemsExpected, totalItemsReceived, totalItemsAccepted, totalItemsRejected
- status
- inspectionRequired, inspectionCompletedAt, inspectionCompletedBy, qualityNotes
- notes
- version
- createdAt, updatedAt, createdBy, updatedBy

## purchase_order_receipt_items
- id (uuid, PK)
- organizationId (uuid, required)
- receiptId (uuid -> purchase_order_receipts.id)
- purchaseOrderItemId (uuid -> purchase_order_items.id)
- lineNumber
- quantityExpected, quantityReceived, quantityAccepted, quantityRejected
- condition, rejectionReason, qualityNotes
- warehouseLocation, binNumber
- lotNumber, serialNumbers, expiryDate
- createdAt, updatedAt

## purchase_order_approvals
- id (uuid, PK)
- organizationId (uuid, required)
- purchaseOrderId (uuid -> purchase_orders.id)
- approverId (uuid -> users.id)
- level
- status
- comments
- approvedAt, rejectedAt
- escalatedTo, escalatedAt, escalationReason
- delegatedFrom
- dueAt
- createdAt, updatedAt, createdBy, updatedBy

## purchase_order_approval_rules
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- minAmount, maxAmount
- requiresApproval, autoApproveUnder
- approverRoles, escalationHours, escalationApproverRoles
- priority, isActive
- version
- createdAt, updatedAt, createdBy, updatedBy

## purchase_order_amendments
- id (uuid, PK)
- organizationId (uuid, required)
- purchaseOrderId (uuid -> purchase_orders.id)
- amendmentNumber
- status
- requestedBy, requestedAt, reason
- approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason
- appliedBy, appliedAt
- changes, originalValues, newValues (jsonb)
- notes, internalNotes
- createdAt, updatedAt, createdBy, updatedBy

## purchase_order_costs
- id (uuid, PK)
- organizationId (uuid, required)
- purchaseOrderId (uuid -> purchase_orders.id)
- costType, description
- amount, currency
- allocationMethod, isIncludedInTotal
- supplierInvoiceNumber, referenceNumber
- notes
- version
- createdAt, updatedAt, createdBy, updatedBy

## price_agreements
- id (uuid, PK)
- organizationId (uuid, required)
- supplierId (uuid -> suppliers.id)
- supplierName
- agreementNumber
- title, description
- effectiveDate, expiryDate
- status
- currency, discountPercent, minimumOrderValue
- totalItems
- createdBy, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason
- notes, termsAndConditions
- version
- updatedBy
- createdAt, updatedAt, deletedAt

## supplier_price_lists
- id (uuid, PK)
- organizationId (uuid, required)
- supplierId (uuid -> suppliers.id)
- productId (uuid -> products.id)
- supplierName, productName, productSku
- basePrice, price, effectivePrice, currency
- status
- minQuantity, maxQuantity, minOrderQty, maxOrderQty
- lastUpdated
- discountPercent, discountType, discountValue
- effectiveDate, expiryDate
- isPreferredPrice, isActive
- supplierProductCode, supplierProductName
- leadTimeDays
- notes
- version
- createdAt, updatedAt, createdBy, updatedBy

## supplier_price_history
- id (uuid, PK)
- organizationId (uuid, required)
- supplierId (uuid -> suppliers.id)
- productId (uuid -> products.id)
- priceListId (uuid -> supplier_price_lists.id, nullable)
- previousPrice, newPrice, priceChange, changePercent
- changeReason
- effectiveDate
- changedBy, changedAt
- notes

## price_change_history
- id (uuid, PK)
- organizationId (uuid, required)
- priceListId (uuid -> supplier_price_lists.id, nullable)
- agreementId (uuid -> price_agreements.id, nullable)
- supplierId (uuid -> suppliers.id, nullable)
- previousPrice, newPrice, priceChange, changePercent
- changeReason, effectiveDate
- status
- requestedBy, requestedAt
- approvedBy, approvedAt
- rejectedBy, rejectedAt, rejectionReason
- appliedBy, appliedAt
- notes
- createdAt, updatedAt
