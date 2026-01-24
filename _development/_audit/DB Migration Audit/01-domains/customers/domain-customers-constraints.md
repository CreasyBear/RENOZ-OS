# Domain: Customers — Constraints

## customers
- Unique: (organizationId, customerCode) where deletedAt IS NULL
- Unique: (organizationId, email) where email IS NOT NULL and deletedAt IS NULL
- Check: parentId != id
- Check: healthScore between 0 and 100
- Indexes:
  - (organizationId, status)
  - (organizationId, type)
  - (organizationId, healthScore)
  - (organizationId, lastOrderDate)
  - parentId
  - (organizationId, createdAt, id)
  - name full-text GIN
  - tags GIN

## contacts
- Indexes:
  - customerId
  - (organizationId, customerId)
  - email
  - (customerId, isPrimary)

## addresses
- Indexes:
  - customerId
  - (organizationId, customerId)
  - (customerId, type)
  - postcode
  - (customerId, isPrimary)

## customerActivities
- Indexes:
  - customerId
  - (organizationId, customerId)
  - contactId
  - activityType
  - scheduledAt
  - completedAt
  - assignedTo
  - (organizationId, customerId, createdAt)

## customerTags
- Unique: (organizationId, name)
- Indexes:
  - (organizationId, category)
  - (organizationId, isActive)
  - usageCount

## customerTagAssignments
- Unique: (customerId, tagId)
- Indexes:
  - customerId
  - tagId

## customerHealthMetrics
- Unique: (customerId, metricDate)
- Check: score fields between 0 and 100
- Indexes:
  - customerId
  - (organizationId, customerId)
  - metricDate
  - overallScore

## customerPriorities
- Unique: customerId
- Check: contractEndDate > contractStartDate OR contractEndDate IS NULL
- Indexes:
  - (organizationId, customerId)
  - priorityLevel
  - accountManager

## customerMergeAudit
- Indexes:
  - organizationId
  - primaryCustomerId
  - mergedCustomerId
  - action
  - performedAt
  - (organizationId, performedAt)
