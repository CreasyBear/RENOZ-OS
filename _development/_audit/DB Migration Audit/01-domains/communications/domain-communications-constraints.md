# Domain: Communications — Constraints

## email_history
- Indexes:
  - campaignId
  - templateId
  - (organizationId, status)
  - (organizationId, createdAt, id)
  - customerId
  - senderId

## scheduled_emails
- Indexes:
  - (organizationId, status)
  - (scheduledAt, status)
  - userId
  - customerId

## email_campaigns
- Indexes:
  - (organizationId, status)
  - (scheduledAt, status)
  - createdById

## campaign_recipients
- Indexes:
  - campaignId
  - (campaignId, status)
  - contactId
  - (campaignId, email)

## scheduled_calls
- Indexes:
  - assigneeId
  - scheduledAt
  - status
  - (assigneeId, status)
  - customerId
  - (organizationId, status)

## email_signatures
- Indexes:
  - userId
  - organizationId
  - (organizationId, userId, isDefault)

## email_templates
- Indexes:
  - organizationId
  - (organizationId, category)
  - (organizationId, isActive)
  - parentTemplateId
