/**
 * Trigger.dev Jobs
 *
 * Exports all background jobs for registration with Trigger.dev.
 *
 * @example
 * ```ts
 * // In your Trigger.dev config
 * import { jobs } from './src/trigger/jobs'
 *
 * export const config = {
 *   jobs,
 * }
 * ```
 */

// PDF Generation
export { generateQuotePdfJob } from './generate-quote-pdf'

// Email Jobs
export {
  sendOrderConfirmationJob,
  sendShippingNotificationJob,
  sendLowStockAlertJob,
} from './send-email'

// Scheduled Email Processing
export { processScheduledEmailsJob } from './process-scheduled-emails'

// Campaign Email Jobs
export {
  sendCampaignJob,
  pauseCampaignJob,
  processScheduledCampaignsJob,
} from './send-campaign'

// Scheduled Call Processing
export {
  processScheduledCallsJob,
  processOverdueCallsJob,
} from './process-scheduled-calls'

// Xero Integration
export { syncXeroInvoiceJob, syncXeroContactJob } from './sync-xero';

// Scheduled Reports
export {
  processScheduledReportsJob,
  generateReportJob,
} from './process-scheduled-reports';

// Dashboard Performance
export {
  refreshDashboardMvsJob,
  onDemandMvRefreshJob,
  cacheInvalidationJob,
  // Legacy exports (deprecated - all point to refreshDashboardMvsJob)
  refreshDailyMetricsJob,
  refreshCurrentStateJob,
  refreshWarrantyMetricsJob,
} from './dashboard-refresh';

export {
  warmDashboardCacheJob,
  warmOrgCacheJob,
} from './cache-warming';

// File Cleanup Jobs
export {
  cleanupPendingUploadsJob,
  cleanupSoftDeletedFilesJob,
} from './cleanup-files'

// Resend Webhook Processing
export { processResendWebhookJob } from './process-resend-webhook'

// Security: Scheduled Maintenance Jobs
// These replace public server functions that were vulnerable to unauthorized calls
export {
  expireInvitationsTask,
  expireInvitationsSchedule,
} from './expire-invitations'

export {
  autoEscalateApprovalsTask,
  autoEscalateApprovalsSchedule,
} from './auto-escalate-approvals'

export {
  checkInventoryAlertsTask,
  checkInventoryAlertsSchedule,
} from './check-inventory-alerts'

// ============================================================================
// ALL JOBS ARRAY
// ============================================================================

import { generateQuotePdfJob } from './generate-quote-pdf'
import {
  sendOrderConfirmationJob,
  sendShippingNotificationJob,
  sendLowStockAlertJob,
} from './send-email'
import { processScheduledEmailsJob } from './process-scheduled-emails'
import {
  sendCampaignJob,
  pauseCampaignJob,
  processScheduledCampaignsJob,
} from './send-campaign'
import {
  processScheduledCallsJob,
  processOverdueCallsJob,
} from './process-scheduled-calls'
import { syncXeroInvoiceJob, syncXeroContactJob } from './sync-xero'
import {
  cleanupPendingUploadsJob,
  cleanupSoftDeletedFilesJob,
} from './cleanup-files';
import {
  processScheduledReportsJob,
  generateReportJob,
} from './process-scheduled-reports';
import {
  refreshDashboardMvsJob,
  onDemandMvRefreshJob,
  cacheInvalidationJob,
} from './dashboard-refresh';
import {
  warmDashboardCacheJob,
  warmOrgCacheJob,
} from './cache-warming';
import { processResendWebhookJob } from './process-resend-webhook';
import {
  expireInvitationsTask,
  expireInvitationsSchedule,
} from './expire-invitations';
import {
  autoEscalateApprovalsTask,
  autoEscalateApprovalsSchedule,
} from './auto-escalate-approvals';
import {
  checkInventoryAlertsTask,
  checkInventoryAlertsSchedule,
} from './check-inventory-alerts';

/**
 * All registered jobs for Trigger.dev
 */
export const jobs = [
  generateQuotePdfJob,
  sendOrderConfirmationJob,
  sendShippingNotificationJob,
  sendLowStockAlertJob,
  processScheduledEmailsJob,
  sendCampaignJob,
  pauseCampaignJob,
  processScheduledCampaignsJob,
  processScheduledCallsJob,
  processOverdueCallsJob,
  syncXeroInvoiceJob,
  syncXeroContactJob,
  cleanupPendingUploadsJob,
  cleanupSoftDeletedFilesJob,
  processScheduledReportsJob,
  generateReportJob,
  // Dashboard Performance (consolidated into single job)
  refreshDashboardMvsJob,
  onDemandMvRefreshJob,
  cacheInvalidationJob,
  warmDashboardCacheJob,
  warmOrgCacheJob,
  // Resend Integration
  processResendWebhookJob,
  // Security: Scheduled Maintenance Jobs
  expireInvitationsTask,
  autoEscalateApprovalsTask,
  checkInventoryAlertsTask,
]
