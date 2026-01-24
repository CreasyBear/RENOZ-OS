# Domain: Communications — Diff (PRD vs Drizzle)

## scheduled_emails
- PRD required fields align; Drizzle adds `customerId`, `sentAt`, `cancelledAt`, `cancelReason`, and `emailHistoryId`.
- PRD status enum: `pending|sent|cancelled`; Drizzle matches.

## email_campaigns
- PRD lists core fields (name, templateType, templateData, status, scheduledAt, sent/open/click counts); Drizzle adds `description`, `recipientCriteria`, `startedAt`, `completedAt`, extended stats (`recipientCount`, `deliveredCount`, `bounceCount`, `failedCount`, `unsubscribeCount`), and `createdById`.
- PRD does not mention `recipientCriteria`; Drizzle uses JSONB criteria for segment selection.

## campaign_recipients
- PRD includes `campaignId`, `contactId`, `email`, `status`, `sentAt`, `openedAt`, `clickedAt`; Drizzle adds `name`, `recipientData`, delivery timestamps, `errorMessage`, `emailHistoryId`, and audit timestamps.
- Drizzle status enum includes `delivered`, `bounced`, `failed`, `unsubscribed` beyond PRD.

## scheduled_calls
- PRD includes scheduling essentials (customerId, assigneeId, scheduledAt, reminderAt, notes, status); Drizzle adds `purpose`, outcome fields, cancellation metadata, and reschedule linkage.
- PRD status enum matches Drizzle (`pending|completed|cancelled|rescheduled`).

## email_signatures
- PRD defines `id`, `userId`, `organizationId`, `name`, `content`, `isDefault`; Drizzle adds `isCompanyWide` and audit columns.

## email_templates
- PRD defines `name`, `category`, `subject`, `bodyHtml`, `variables`, `version`, `isActive`; Drizzle adds `description`, `parentTemplateId`, and audit columns.

## email_history
- PRD COMMS-001a adds `openedAt`, `clickedAt`, `linkClicks`; Drizzle includes these plus `campaignId` and `templateId` tracking.
- PRD references append-only behavior; Drizzle models append-only by omitting `updatedAt`, but does not enforce no-update constraints in schema.

## Open Questions
- Do we want to constrain `campaign_recipients` to prevent duplicates via a unique index on `(campaignId, email)` instead of a non-unique index?
- Should `email_history.campaignId`/`templateId` use FKs for referential integrity or remain loose references?
