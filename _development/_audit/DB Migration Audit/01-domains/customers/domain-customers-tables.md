# Domain: Customers — Tables

## customers
- id (uuid, PK)
- organizationId (uuid, required)
- customerCode (text, default `CUST-` prefix, unique per org)
- name, legalName, email, phone, website
- status, type, size, industry (enum)
- taxId, registrationNumber
- parentId (uuid -> customers.id)
- creditLimit, creditHold, creditHoldReason
- healthScore, healthScoreUpdatedAt (text ISO)
- lifetimeValue, firstOrderDate, lastOrderDate, totalOrders, totalOrderValue, averageOrderValue
- tags (jsonb string[])
- customFields (jsonb)
- warrantyExpiryAlertOptOut
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## contacts
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- firstName, lastName, title
- email, phone, mobile, department
- isPrimary, decisionMaker, influencer
- emailOptIn, smsOptIn, emailOptInAt, smsOptInAt
- lastContactedAt
- notes
- createdAt, updatedAt, createdBy, updatedBy

## addresses
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- type (enum)
- isPrimary
- street1, street2, city, state, postcode, country
- latitude, longitude
- notes
- createdAt, updatedAt

## customerActivities
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- contactId (uuid -> contacts.id)
- activityType, direction (enum)
- subject, description, outcome
- duration
- scheduledAt, completedAt
- assignedTo (uuid)
- metadata (jsonb)
- createdAt, createdBy

## customerTags
- id (uuid, PK)
- organizationId (uuid, required)
- name, description, color, category
- isActive, usageCount
- createdBy (uuid)
- createdAt, updatedAt

## customerTagAssignments
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- tagId (uuid -> customerTags.id)
- assignedBy (uuid)
- assignedAt
- notes

## customerHealthMetrics
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- metricDate
- recencyScore, frequencyScore, monetaryScore, engagementScore, overallScore
- createdAt

## customerPriorities
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- priorityLevel, serviceLevel (enum)
- accountManager (uuid)
- contractValue, contractStartDate, contractEndDate
- specialTerms
- createdAt, updatedAt

## customerMergeAudit
- id (uuid, PK)
- organizationId (uuid, required)
- primaryCustomerId (uuid -> customers.id)
- mergedCustomerId (uuid -> customers.id, nullable)
- action, reason
- performedBy
- performedAt
- mergedData (jsonb)
- metadata (jsonb)
