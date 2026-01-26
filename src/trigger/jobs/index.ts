/**
 * Trigger.dev Tasks (v3)
 *
 * Exports all background tasks for registration with Trigger.dev.
 * These tasks are auto-discovered from the `dirs` config in trigger.config.ts.
 *
 * @example
 * ```ts
 * // Triggering a task from server code
 * import { generateQuotePdf } from '@/trigger/jobs';
 *
 * await generateQuotePdf.trigger({
 *   orderId: 'order-123',
 *   orderNumber: 'ORD-001',
 *   organizationId: 'org-123',
 *   customerId: 'cust-123',
 * });
 * ```
 */

// ============================================================================
// PDF GENERATION TASKS
// ============================================================================

export {
  generateQuotePdf,
  type GenerateQuotePdfPayload,
} from "./generate-quote-pdf";

export {
  generateInvoicePdf,
  type GenerateInvoicePdfPayload,
} from "./generate-invoice-pdf";

export {
  generateWarrantyCertificatePdf,
  type GenerateWarrantyCertificatePdfPayload,
} from "./generate-warranty-certificate-pdf";

export {
  generateCompletionCertificatePdf,
  type GenerateCompletionCertificatePdfPayload,
} from "./generate-completion-certificate-pdf";

export {
  generateDeliveryNotePdf,
  type GenerateDeliveryNotePdfPayload,
} from "./generate-delivery-note-pdf";

export {
  generateWorkOrderPdf,
  type GenerateWorkOrderPdfPayload,
} from "./generate-work-order-pdf";

// Legacy exports (v2 naming convention)
export { generateQuotePdf as generateQuotePdfJob } from "./generate-quote-pdf";
export { generateInvoicePdf as generateInvoicePdfJob } from "./generate-invoice-pdf";
export { generateWarrantyCertificatePdf as generateWarrantyCertificatePdfJob } from "./generate-warranty-certificate-pdf";
export { generateCompletionCertificatePdf as generateCompletionCertificatePdfJob } from "./generate-completion-certificate-pdf";
export { generateDeliveryNotePdf as generateDeliveryNotePdfJob } from "./generate-delivery-note-pdf";
export { generateWorkOrderPdf as generateWorkOrderPdfJob } from "./generate-work-order-pdf";

// ============================================================================
// EMAIL TASKS
// ============================================================================

export {
  sendOrderConfirmation,
  sendShippingNotification,
  sendLowStockAlert,
  // Payload types
  type OrderConfirmedPayload,
  type OrderShippedPayload,
  type LowStockPayload,
  // Legacy exports (v2 naming convention)
  sendOrderConfirmationJob,
  sendShippingNotificationJob,
  sendLowStockAlertJob,
} from "./send-email";

// ============================================================================
// SCHEDULED EMAIL PROCESSING
// ============================================================================

export {
  processScheduledEmailsTask,
  // Legacy export
  processScheduledEmailsJob,
} from "./process-scheduled-emails";

// ============================================================================
// CAMPAIGN EMAIL TASKS
// ============================================================================

export {
  sendCampaignTask,
  pauseCampaignTask,
  processScheduledCampaignsTask,
  // Legacy exports
  sendCampaignJob,
  pauseCampaignJob,
  processScheduledCampaignsJob,
} from "./send-campaign";

// ============================================================================
// SCHEDULED CALL PROCESSING
// ============================================================================

export {
  processScheduledCallsTask,
  processOverdueCallsTask,
  // Legacy exports
  processScheduledCallsJob,
  processOverdueCallsJob,
} from "./process-scheduled-calls";

// ============================================================================
// XERO INTEGRATION
// ============================================================================

export {
  syncXeroInvoiceTask,
  syncXeroContactTask,
  // Legacy exports
  syncXeroInvoiceJob,
  syncXeroContactJob,
} from "./sync-xero";

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

export {
  processScheduledReportsTask,
  generateReportTask,
  // Types
  type GenerateReportPayload,
  type ReportGeneratedPayload,
  type ReportFailedPayload,
  type ProcessScheduledReportsResult,
  type GenerateReportResult,
  // Legacy exports
  processScheduledReportsJob,
  generateReportJob,
} from "./process-scheduled-reports";

// ============================================================================
// DASHBOARD PERFORMANCE
// ============================================================================

export {
  refreshDashboardMvsTask,
  onDemandMvRefreshTask,
  cacheInvalidationTask,
  // Types
  type DashboardMvRefreshedPayload,
  type DashboardCacheInvalidatedPayload,
  type MvRefreshResult,
  type CacheInvalidationResult,
  // Legacy exports
  refreshDashboardMvsJob,
  onDemandMvRefreshJob,
  cacheInvalidationJob,
  refreshDailyMetricsJob,
  refreshCurrentStateJob,
  refreshWarrantyMetricsJob,
} from "./dashboard-refresh";

export {
  warmDashboardCacheTask,
  warmOrgCacheTask,
  // Types
  type WarmDashboardCacheResult,
  type WarmOrgCachePayload,
  type WarmOrgCacheResult,
  // Legacy exports
  warmDashboardCacheJob,
  warmOrgCacheJob,
} from "./cache-warming";

// ============================================================================
// FILE CLEANUP TASKS
// ============================================================================

export {
  cleanupPendingUploadsTask,
  cleanupSoftDeletedFilesTask,
  // Types
  type CleanupResult,
  // Legacy exports
  cleanupPendingUploadsJob,
  cleanupSoftDeletedFilesJob,
} from "./cleanup-files";

// ============================================================================
// RESEND WEBHOOK PROCESSING
// ============================================================================

export {
  processResendWebhookTask,
  // Legacy export
  processResendWebhookJob,
} from "./process-resend-webhook";

// ============================================================================
// SCHEDULED MAINTENANCE TASKS (already v3)
// ============================================================================

export { expireInvitationsTask } from "./expire-invitations";

export { autoEscalateApprovalsTask } from "./auto-escalate-approvals";

export { checkInventoryAlertsTask } from "./check-inventory-alerts";

// Note: In Trigger.dev v3, scheduled tasks (created with `schedules.task()`)
// are auto-discovered from the `dirs` config. No separate schedules array needed.

// ============================================================================
// ALL TASKS ARRAY (for reference - v3 auto-discovers from dirs config)
// ============================================================================

import { generateQuotePdf } from "./generate-quote-pdf";
import { generateInvoicePdf } from "./generate-invoice-pdf";
import { generateWarrantyCertificatePdf } from "./generate-warranty-certificate-pdf";
import { generateCompletionCertificatePdf } from "./generate-completion-certificate-pdf";
import { generateDeliveryNotePdf } from "./generate-delivery-note-pdf";
import { generateWorkOrderPdf } from "./generate-work-order-pdf";
import {
  sendOrderConfirmation,
  sendShippingNotification,
  sendLowStockAlert,
} from "./send-email";
import { processScheduledEmailsTask } from "./process-scheduled-emails";
import {
  sendCampaignTask,
  pauseCampaignTask,
  processScheduledCampaignsTask,
} from "./send-campaign";
import {
  processScheduledCallsTask,
  processOverdueCallsTask,
} from "./process-scheduled-calls";
import { syncXeroInvoiceTask, syncXeroContactTask } from "./sync-xero";
import {
  processScheduledReportsTask,
  generateReportTask,
} from "./process-scheduled-reports";
import {
  refreshDashboardMvsTask,
  onDemandMvRefreshTask,
  cacheInvalidationTask,
} from "./dashboard-refresh";
import { warmDashboardCacheTask, warmOrgCacheTask } from "./cache-warming";
import {
  cleanupPendingUploadsTask,
  cleanupSoftDeletedFilesTask,
} from "./cleanup-files";
import { processResendWebhookTask } from "./process-resend-webhook";
import { expireInvitationsTask } from "./expire-invitations";
import { autoEscalateApprovalsTask } from "./auto-escalate-approvals";
import { checkInventoryAlertsTask } from "./check-inventory-alerts";

/**
 * All registered tasks for Trigger.dev
 *
 * Note: In v3, tasks are auto-discovered from the `dirs` config.
 * This array is for reference/documentation purposes.
 */
export const tasks = [
  // PDF Generation
  generateQuotePdf,
  generateInvoicePdf,
  // Certificate Generation
  generateWarrantyCertificatePdf,
  generateCompletionCertificatePdf,
  // Operational Documents
  generateDeliveryNotePdf,
  generateWorkOrderPdf,
  // Email
  sendOrderConfirmation,
  sendShippingNotification,
  sendLowStockAlert,
  // Scheduled Emails
  processScheduledEmailsTask,
  // Campaigns
  sendCampaignTask,
  pauseCampaignTask,
  processScheduledCampaignsTask,
  // Scheduled Calls
  processScheduledCallsTask,
  processOverdueCallsTask,
  // Xero
  syncXeroInvoiceTask,
  syncXeroContactTask,
  // Reports
  processScheduledReportsTask,
  generateReportTask,
  // Dashboard
  refreshDashboardMvsTask,
  onDemandMvRefreshTask,
  cacheInvalidationTask,
  warmDashboardCacheTask,
  warmOrgCacheTask,
  // File Cleanup
  cleanupPendingUploadsTask,
  cleanupSoftDeletedFilesTask,
  // Resend
  processResendWebhookTask,
  // Scheduled Maintenance
  expireInvitationsTask,
  autoEscalateApprovalsTask,
  checkInventoryAlertsTask,
];

/**
 * @deprecated Use `tasks` array instead
 */
export const jobs = tasks;
