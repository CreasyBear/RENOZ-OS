# Domain: Financial — Constraints

## credit_notes
- Indexes:
  - (organizationId, status)
  - (organizationId, customerId)
  - customerId
  - orderId

## payment_schedules
- Indexes:
  - (organizationId, orderId)
  - (organizationId, status)
  - (organizationId, dueDate)
  - orderId
  - (status, dueDate)

## reminder_templates
- Indexes:
  - (organizationId, isActive)
  - (organizationId, daysOverdue)

## reminder_history
- Indexes:
  - (organizationId, orderId)
  - (organizationId, sentAt)
  - orderId
  - templateId

## statement_history
- Indexes:
  - (organizationId, customerId)
  - (organizationId, endDate)
  - customerId
  - (customerId, endDate)

## revenue_recognition
- Indexes:
  - orderId
  - (organizationId, state)
  - (organizationId, recognitionDate)
  - (state, xeroSyncAttempts)

## deferred_revenue
- Indexes:
  - orderId
  - (organizationId, status)
  - (organizationId, deferralDate)
