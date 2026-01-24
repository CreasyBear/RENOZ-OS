# Domain: Pipeline — Tables

## winLossReasons

- id (uuid, PK)
- organizationId (uuid, required)
- name, type, description
- isActive, sortOrder
- version
- createdAt, updatedAt, createdBy, updatedBy

## opportunities

- id (uuid, PK)
- organizationId (uuid, required)
- title, description
- customerId (uuid -> customers.id)
- contactId (uuid -> contacts.id)
- assignedTo (uuid -> users.id)
- stage, probability
- value, weightedValue
- expectedCloseDate, actualCloseDate
- quoteExpiresAt, quotePdfUrl
- winLossReasonId (uuid -> winLossReasons.id)
- lostReason, lostNotes, competitorName
- daysInStage
- version
- metadata (jsonb), tags (jsonb string[])
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## opportunityActivities

- id (uuid, PK)
- organizationId (uuid, required)
- opportunityId (uuid -> opportunities.id)
- type, description, outcome
- scheduledAt, completedAt
- createdBy (uuid -> users.id)
- createdAt

## quoteVersions

- id (uuid, PK)
- organizationId (uuid, required)
- opportunityId (uuid -> opportunities.id)
- versionNumber
- items (jsonb)
- subtotal, taxAmount, total
- notes
- version
- createdAt, updatedAt, createdBy, updatedBy

## quotes (legacy/current quote)

- id (uuid, PK)
- organizationId (uuid, required)
- quoteNumber
- opportunityId (uuid -> opportunities.id)
- customerId (uuid -> customers.id)
- status
- quoteDate, validUntil, acceptedAt
- lineItems (jsonb)
- subtotal, discountAmount, taxAmount, total
- terms, notes
- createdAt, updatedAt, createdBy, updatedBy
