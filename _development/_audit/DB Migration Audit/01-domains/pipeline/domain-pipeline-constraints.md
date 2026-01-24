# Domain: Pipeline — Constraints

## winLossReasons

- Unique: (organizationId, type, name)
- Indexes:
  - (organizationId, type)
  - (organizationId, isActive)
  - (organizationId, sortOrder)

## opportunities

- Check: actualCloseDate required when stage is won/lost
- Check: probability between 0 and 100 (nullable)
- Indexes:
  - (organizationId, stage)
  - (organizationId, customerId)
  - (organizationId, assignedTo)
  - (organizationId, expectedCloseDate)
  - (organizationId, probability)
  - (organizationId, createdAt)
  - customerId
  - contactId
  - winLossReasonId
  - quoteExpiresAt

## opportunityActivities

- Indexes:
  - (organizationId, opportunityId)
  - (organizationId, type)
  - (organizationId, createdAt)
  - opportunityId
  - scheduledAt
  - completedAt
  - (opportunityId, createdAt)

## quoteVersions

- Unique: (opportunityId, versionNumber)
- Check: versionNumber > 0
- Check: subtotal, taxAmount, total >= 0
- Indexes:
  - (organizationId, opportunityId)
  - (organizationId, createdAt)
  - opportunityId

## quotes

- Unique: (organizationId, quoteNumber)
- Indexes:
  - (organizationId, status)
  - (organizationId, customerId)
  - (organizationId, opportunityId)
