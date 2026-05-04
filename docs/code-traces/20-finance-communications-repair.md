# Finance + Communications Repair Trace

Date: 2026-04-24

## Finance Shell And Workbench

Route: `src/routes/_authenticated/financial.tsx`
Page/component: `src/routes/_authenticated/financial/financial-landing-page.tsx`
Hook/server: `FinancialTriage` and `FinancialCommandBar` retain their existing hooks/server functions
Schema/table: existing financial and invoice schemas remain unchanged
UI state: `/financial` now renders inside one parent shell with workbench links to invoices, AR aging, payment plans, reminders, credit notes, Xero exceptions, and analytics
Follow-up remediation: financial child routes no longer import/render their own `PageLayout`; stale `financial-page.tsx` was removed so the parent shell is the only finance layout source of truth.

## Invoice Detail Payments

Route: `src/routes/_authenticated/financial/invoices/$invoiceId.tsx`
Page/component: `InvoiceDetailContainer` -> `InvoiceDetailView`
Hook: `useInvoiceDetail(invoiceId)`, `useOrderPayments(invoiceId)`, `useCreateOrderPayment(invoiceId)`
ServerFn: `getOrderPayments`, `createOrderPayment`, `updateInvoiceStatus`
Schema/table: `order_payments`, `orders`
Projection: `recalculateOrderFinancialProjection`
UI state: Mark paid opens the real record-payment dialog; payment history renders recorded payments/refunds and no longer derives a fake transaction from `invoice.total - invoice.balanceDue`

## Finance Projection

Route: all finance/order payment mutation routes
Page/component: invoice detail, order payments, payment plans, credit notes, Xero sync
Hook: payment, schedule, credit, and Xero mutation hooks retain normalized query keys
ServerFn: `createOrderPayment`, `updateOrderPayment`, `deleteOrderPayment`, `createRefundPayment`, `recordInstallmentPayment`, `applyCreditNoteToInvoice`, `applyXeroPaymentUpdate`
Schema/table: `order_payments` for cash/refunds, `credit_notes` for non-cash adjustments, `payment_schedules` for promises, `payment_schedule_payments` for installment-to-ledger trace links
Projection: `src/server/functions/financial/_shared/order-financial-projection.ts`
UI state: `orders.paidAmount` is net cash, `orders.balanceDue` accounts for cash plus applied credits, and `orders.paymentStatus`/`paidAt` are derived fields

## Payment Plans

Route: `src/routes/_authenticated/financial/payment-plans.tsx`
Page/component: org workbench or `PaymentPlansList` when `orderId` is present
Hook: `useOverdueInstallments`, `usePaymentSchedule`, `useRecordInstallmentPayment`
ServerFn: `getOverdueInstallments`, `getPaymentSchedule`, `recordInstallmentPayment`
Schema/table: `payment_schedules`, `payment_schedule_payments`, `order_payments`
Projection: `recalculateOrderFinancialProjection`
UI state: naked `/financial/payment-plans` shows overdue plan promises; recording an installment writes a real payment and a trace link before recalculating the invoice/order projection

## Credit Notes

Route: `/financial/credit-notes`
Page/component: credit note list/detail
Hook: `useCreditNotes`, `useApplyCreditNote`, `useVoidCreditNote`
ServerFn: `applyCreditNoteToInvoice`
Schema/table: `credit_notes`
Projection: `recalculateOrderFinancialProjection`
UI state: applied credits reduce balance as non-cash adjustments without inflating cash paid

## Xero Sync

Route: `/financial/xero-sync`
Page/component: `XeroSyncStatus`
Hook: existing Xero hooks
ServerFn/job: `applyXeroPaymentUpdate`, webhook reconciliation
Schema/table: `xero_payment_events`, `order_payments`
Projection: `recalculateOrderFinancialProjection`
UI state: successful webhook payments flow through the same order projection as manual payments

## Statements, Reminders, Revenue, And AR Aging

Route: `/financial/statements`, `/financial/reminders`, `/financial/revenue`, `/financial/ar-aging`
Page/component: statement/reminder/revenue/aging route containers render inside the parent financial shell
Hook: `useStatements`, `useMarkStatementSent`, reminder hooks, recognition hooks, AR aging hooks
ServerFn/job: `generateStatement`, `markStatementSent`, `sendReminder`, `processPaymentRemindersTask`, `listRecognitionsByState`, `getARAgingReport`
Schema/table: `statement_history`, `orders`, `order_payments`, `credit_notes`, `reminder_history`, `revenue_recognition`
UI state: statement emails resolve a real customer email, statements count only applied credits, reminders are queued/pending until a real sender updates them, revenue state cards use server counts, and AR aging copy says it is based on order due date/payment terms.

## Communications Shell

Route: `src/routes/_authenticated/communications.tsx`
Page/component: `CommunicationsNav` + `<Outlet />`; index content in `src/routes/_authenticated/communications/index.tsx`
Hook/server: child pages keep their normalized hooks
Schema/table: existing communications schemas remain unchanged
UI state: communications child routes now share one shell instead of loading as sibling islands
Follow-up remediation: duplicate `communications-layout.tsx` was removed and nav active state now chooses the most specific matching route.

## Inbox

Route: `/communications/inbox`
Page/component: `InboxPage` -> `Inbox`
Hook: `useInbox`
ServerFn: `listInboxItems`
Schema/table: `email_history`, `scheduled_emails`, `customers`, `users`, `email_campaigns`
UI state: inbox rows are joined, globally sorted, and paginated server-side; sender/recipient display values come from joined or persisted data rather than client-side fake fallbacks.

## Campaign Pause And Send

Route: `src/routes/_authenticated/communications/campaigns/index.tsx`
Page/component: `CampaignsPage` -> `CampaignsList`
Hook: `useCampaigns`, `useCancelCampaign`, `usePauseCampaign`, `useResumeCampaign`
ServerFn: `cancelCampaign`, `pauseCampaign`, `resumeCampaign`, `sendCampaign`
Schema/table: `email_campaigns`, `campaign_recipients`, `contacts`, `email_history`
Job/webhook: `sendCampaignTask`
UI state: cancel and pause are separate actions; campaign recipients persist `customerId`; campaign sends preserve customer identity when writing `email_history.customerId`

## Scheduled Emails

Route: `src/routes/_authenticated/communications/emails/index.tsx`
Page/component: `ScheduledEmailsPage` -> `ScheduleEmailDialog`
Hook: `useScheduledEmails`, `useScheduledEmail`, `useCancelScheduledEmail`
ServerFn: `getScheduledEmails`, `getScheduledEmailById`, `scheduleEmail`, `updateScheduledEmail`, `cancelScheduledEmail`
Schema/table: `scheduled_emails`
Job/webhook: `processScheduledEmailsTask`
UI state: edit mode fetches initial data; processing and failed states persist with attempt count, last attempt time, and last error
Follow-up remediation: scheduled-email list query keys include pagination, and job sent-state reconciliation scopes the processed row by status and organization.

## Email Permissions

Route: communications pages
Page/component: inbox, history, campaigns, scheduled emails
Hook/server: communications server functions now check `PERMISSIONS.email.*`
Schema/table: role permission map in `src/lib/auth/permissions.ts`
UI state: owner/admin/manager/sales/support can read or operate communications as intended; viewer and operations can read

## Verification

- `npm run typecheck`
- `npx vitest run tests/unit/financial/domain-remediation.test.ts tests/unit/communications/domain-remediation.test.ts tests/unit/financial/finance-projection-trace.test.ts tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx`

Browser smoke note: intentionally skipped for this remediation pass per request; verification is code/test based.
