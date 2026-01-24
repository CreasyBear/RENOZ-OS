# Domain: Support — Tables

## issues
- id (uuid, PK)
- organizationId (uuid, required)
- issueNumber
- title, description
- type, priority, status
- customerId (uuid)
- assignedToUserId (uuid)
- slaTrackingId (uuid)
- holdReason
- escalatedAt, escalatedBy, escalationReason
- resolvedAt, resolutionNotes
- metadata (jsonb)
- tags (text[])
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## issue_templates
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- type, defaultPriority, defaultAssigneeId
- titleTemplate, descriptionPrompt
- requiredFields (jsonb), defaults (jsonb)
- usageCount, isActive
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## return_authorizations
- id (uuid, PK)
- organizationId (uuid, required)
- rmaNumber, sequenceNumber
- issueId, customerId, orderId
- status, reason, reasonDetails
- resolution, resolutionDetails (jsonb)
- inspectionNotes (jsonb)
- internalNotes, customerNotes
- approvedAt/By, receivedAt/By, processedAt/By, rejectedAt/By, rejectionReason
- createdAt, updatedAt, createdBy, updatedBy

## rma_line_items
- id (uuid, PK)
- rmaId (uuid -> return_authorizations.id)
- orderLineItemId (uuid -> orders.order_line_items.id)
- quantityReturned
- itemReason, itemCondition, serialNumber
- createdAt, updatedAt

## csat_responses
- id (uuid, PK)
- organizationId (uuid, required)
- issueId (uuid -> issues.id)
- rating, comment
- source, submittedAt
- submittedByUserId, submittedByCustomerId, submittedByEmail
- token, tokenExpiresAt, tokenUsedAt
- createdAt, updatedAt, createdBy, updatedBy

## sla_configurations
- id (uuid, PK)
- organizationId (uuid, required)
- domain, name, description
- responseTargetValue/unit
- resolutionTargetValue/unit
- atRiskThresholdPercent
- escalateOnBreach, escalateToUserId
- businessHoursConfigId
- isDefault, priorityOrder, isActive
- createdAt, updatedAt

## sla_tracking
- id (uuid, PK)
- organizationId (uuid, required)
- domain, entityType, entityId
- slaConfigurationId
- startedAt
- responseDueAt, respondedAt, responseBreached, responseTimeSeconds
- resolutionDueAt, resolvedAt, resolutionBreached, resolutionTimeSeconds
- isPaused, pausedAt, pauseReason, totalPausedDurationSeconds
- status
- createdAt, updatedAt

## sla_events
- id (uuid, PK)
- organizationId (uuid, required)
- slaTrackingId
- eventType
- eventData (jsonb)
- triggeredByUserId
- triggeredAt

## escalation_rules
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- condition (jsonb), action (jsonb)
- isActive, priority
- escalateToUserId
- createdAt, updatedAt

## escalation_history
- id (uuid, PK)
- organizationId (uuid, required)
- issueId
- action
- performedByUserId
- reason
- escalationRuleId
- escalatedToUserId, previousAssigneeId
- createdAt, updatedAt

## kb_categories
- id (uuid, PK)
- organizationId (uuid, required)
- name, slug, description
- parentId
- sortOrder, isActive
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## kb_articles
- id (uuid, PK)
- organizationId (uuid, required)
- title, slug, summary, content
- categoryId
- tags (jsonb)
- status, publishedAt
- viewCount, helpfulCount, notHelpfulCount
- metaTitle, metaDescription
- createdAt, updatedAt, createdBy, updatedBy, deletedAt

## business_hours_config
- id (uuid, PK)
- organizationId (uuid, required)
- name
- weeklySchedule (jsonb)
- timezone
- isDefault
- createdAt, updatedAt

## organization_holidays
- id (uuid, PK)
- organizationId (uuid, required)
- name
- date
- isRecurring
- description
- createdAt, updatedAt
