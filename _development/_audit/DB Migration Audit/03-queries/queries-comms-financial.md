# Queries — Communications & Financial

## Communications
- Email history by status/date/customer/campaign.
- Scheduled emails by status/time window.
- Campaign performance: sent/open/click/bounce rates by period.
- Scheduled calls by assignee/status/date.

## Financial
- Credit notes by status/customer/date.
- Payment schedules by dueDate/status.
- Reminder history by order/date.
- Statements by customer/endDate.
- Revenue recognition and deferred revenue by status/date.

## Notes on query patterns
- Communications queries frequently filter by `organizationId` + date ordering.
- Financial queries center around `orderId` and `customerId` with status filters.
