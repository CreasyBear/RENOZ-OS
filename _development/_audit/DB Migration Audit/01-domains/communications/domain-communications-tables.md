# Domain: Communications — Tables

## email_history
- id (uuid, PK)
- organizationId (uuid, required)
- senderId (uuid -> users.id, nullable)
- fromAddress
- toAddress
- customerId (uuid -> customers.id, nullable)
- subject
- bodyHtml, bodyText
- status
- campaignId, templateId
- openedAt, clickedAt, linkClicks (jsonb)
- sentAt, deliveredAt, bouncedAt, bounceReason
- metadata (jsonb)
- createdAt

## scheduled_emails
- id (uuid, PK)
- organizationId (uuid, required)
- userId (uuid -> users.id)
- recipientEmail, recipientName
- customerId (uuid -> customers.id, nullable)
- subject
- templateType, templateData (jsonb)
- scheduledAt, timezone
- status, sentAt, cancelledAt, cancelReason
- emailHistoryId
- createdAt, updatedAt

## email_campaigns
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- templateType, templateData (jsonb)
- recipientCriteria (jsonb)
- scheduledAt, startedAt, completedAt
- status
- recipientCount, sentCount, deliveredCount, openCount, clickCount, bounceCount, failedCount, unsubscribeCount
- createdById (uuid -> users.id)
- createdAt, updatedAt

## campaign_recipients
- id (uuid, PK)
- campaignId (uuid -> email_campaigns.id)
- contactId (uuid -> contacts.id, nullable)
- email, name
- recipientData (jsonb)
- status
- sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, unsubscribedAt
- errorMessage
- emailHistoryId
- createdAt, updatedAt

## scheduled_calls
- id (uuid, PK)
- organizationId (uuid, required)
- customerId (uuid -> customers.id)
- assigneeId (uuid -> users.id)
- scheduledAt, reminderAt
- purpose, notes
- status
- completedAt, cancelledAt, cancelReason
- outcome, outcomeNotes
- rescheduledToId (uuid -> scheduled_calls.id)
- createdAt, updatedAt

## email_signatures
- id (uuid, PK)
- organizationId (uuid, required)
- userId (uuid -> users.id, nullable)
- name, content
- isDefault, isCompanyWide
- createdAt, updatedAt, createdBy, updatedBy

## email_templates
- id (uuid, PK)
- organizationId (uuid, required)
- name, description
- category
- subject, bodyHtml
- variables (jsonb)
- version, isActive
- parentTemplateId
- createdAt, updatedAt, createdBy, updatedBy
