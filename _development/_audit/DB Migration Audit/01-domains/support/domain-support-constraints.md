# Domain: Support — Constraints

## issues
- Indexes:
  - customerId
  - assignedToUserId
  - (organizationId, status)
  - (organizationId, priority)
  - slaTrackingId
  - (organizationId, escalatedAt)

## issue_templates
- Indexes:
  - organizationId
  - type
  - usageCount
  - isActive

## return_authorizations
- Unique: (organizationId, rmaNumber)
- Indexes:
  - issueId
  - customerId
  - orderId
  - (organizationId, status)
  - (organizationId, createdAt)

## rma_line_items
- Indexes:
  - rmaId
  - orderLineItemId

## csat_responses
- Indexes:
  - organizationId
  - issueId
  - rating
  - source
  - submittedAt
  - token

## sla_configurations
- Unique: (organizationId, domain, name)
- Indexes:
  - (organizationId, domain)
  - (organizationId, domain, isDefault)

## sla_tracking
- Unique: (domain, entityType, entityId)
- Indexes:
  - (organizationId, responseDueAt, resolutionDueAt)
  - (organizationId, status)
  - slaConfigurationId

## sla_events
- Indexes:
  - (slaTrackingId, triggeredAt)
  - (organizationId, eventType, triggeredAt)

## escalation_rules
- Indexes:
  - (organizationId, isActive, priority)

## escalation_history
- Indexes:
  - (issueId, createdAt)
  - (performedByUserId, createdAt)

## kb_categories
- Indexes:
  - organizationId
  - parentId
  - (organizationId, slug)

## kb_articles
- Indexes:
  - organizationId
  - categoryId
  - status
  - (organizationId, slug)
  - (title, content)

## business_hours_config
- Unique: (organizationId, isDefault) where isDefault = true

## organization_holidays
- Unique: (organizationId, date)
