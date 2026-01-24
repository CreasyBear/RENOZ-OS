# Domain: Financial — Tables

## credit_notes
- id (uuid, PK)
- organizationId (uuid, required)
- creditNoteNumber
- orderId (uuid -> orders.id, nullable)
- customerId (uuid -> customers.id)
- amount, gstAmount
- reason
- status
- appliedToOrderId (uuid -> orders.id, nullable)
- appliedAt
- internalNotes
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## payment_schedules
- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- planType
- installmentNo, description
- dueDate
- amount, gstAmount
- status
- paidAmount, paidAt, paymentReference
- notes
- createdAt, updatedAt, createdBy, updatedBy

## reminder_templates
- id (uuid, PK)
- organizationId (uuid, required)
- name
- daysOverdue
- subject, body
- isActive
- sortOrder
- createdAt, updatedAt, createdBy, updatedBy

## reminder_history
- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- templateId (uuid -> reminder_templates.id, nullable)
- templateName, daysOverdue, subjectSent, bodySent
- recipientEmail
- sentAt
- deliveryStatus, deliveryError
- isManualSend
- notes
- createdAt, updatedAt, createdBy, updatedBy

## statement_history
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- startDate, endDate
- openingBalance, closingBalance
- invoiceCount, paymentCount, creditNoteCount
- totalInvoiced, totalPayments, totalCredits
- totalGst
- pdfPath
- sentAt, sentToEmail
- notes
- createdAt, updatedAt, createdBy, updatedBy

## revenue_recognition
- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- recognitionType
- milestoneName
- recognizedAmount
- recognitionDate
- state
- xeroSyncAttempts, xeroSyncError, lastXeroSyncAt
- xeroJournalId
- notes
- createdAt, updatedAt

## deferred_revenue
- id (uuid, PK)
- organizationId (uuid, required)
- orderId (uuid -> orders.id)
- originalAmount, remainingAmount, recognizedAmount
- deferralDate, expectedRecognitionDate
- status
- reason
- createdAt, updatedAt
