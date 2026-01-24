# Domain: Financial — Diff (PRD vs Drizzle)

## credit_notes
- PRD references `invoiceId` and amounts stored in AUD cents; Drizzle uses `orderId`/`appliedToOrderId` and `currencyColumn` (numeric 12,2).
- PRD lists `createdByUserId` as required; Drizzle uses nullable audit columns.
- Drizzle adds `gstAmount`, `internalNotes`, and soft delete (`deletedAt`) not in PRD.

## payment_schedules
- PRD expects `invoiceId`/`orderId` with amount in AUD cents; Drizzle uses `orderId` and `currencyColumn` (numeric 12,2).
- PRD includes `status` enum `pending|due|paid|overdue`; Drizzle matches.
- Drizzle adds `gstAmount`, `paymentReference`, `notes`, and audit columns beyond PRD.

## statement_history
- PRD specifies balances and PDF path; Drizzle adds transaction counts and totals, GST totals, sentToEmail, notes, and audit columns.
- Drizzle stores `invoiceCount`, `paymentCount`, `creditNoteCount` using `currencyColumn` (numeric 12,2) instead of integer counts.
- PRD expects amounts in AUD cents; Drizzle uses numeric 12,2.

## reminder_templates / reminder_history
- PRD defines basic template and history fields; Drizzle adds `isActive`, `sortOrder`, template snapshot fields, delivery status, manual send flag, notes, and audit columns.
- Drizzle does not enforce uniqueness on `(organizationId, daysOverdue)` for templates; PRD does not specify uniqueness but implies one per stage.

## revenue_recognition
- PRD expects `invoiceId` and `milestoneId`; Drizzle uses only `orderId` with `milestoneName`.
- PRD recognition state enum uses uppercase values; Drizzle uses lowercase with `sync_failed`/`manual_override`.
- PRD expects amounts in AUD cents; Drizzle uses `currencyColumn` (numeric 12,2).

## deferred_revenue
- PRD expects `invoiceId` and `deferredAmount`/`period`; Drizzle uses `orderId`, `originalAmount`, `remainingAmount`, `recognizedAmount`, and explicit deferral dates.
- PRD expects amounts in AUD cents; Drizzle uses `currencyColumn`.

## Open Questions
- Should we standardize on invoice IDs for financial records instead of orders, or document that orders are invoices in this model?
- Do we want to correct `statement_history` count fields to integer types?
