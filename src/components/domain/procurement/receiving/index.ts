/**
 * Receiving Components Barrel Export
 *
 * Centralized exports for receiving dashboard components.
 */

export { ReceivingDashboardContainer } from './receiving-dashboard-container';
export type { ReceivingDashboardContainerProps } from './receiving-dashboard-container';

export { ReceivingDashboard } from './receiving-dashboard';
export type { ReceivingDashboardProps } from './receiving-dashboard';
export type { ReceivingMetrics } from '@/lib/schemas/procurement/procurement-types';

export { ReceivingStats } from './receiving-stats';
export type { ReceivingStatsProps } from './receiving-stats';

// Bulk receiving
export { BulkReceivingDialogContainer } from './bulk-receiving-dialog-container';
export type { BulkReceivingDialogContainerProps } from './bulk-receiving-dialog-container';
export type { BulkReceiptData, PODetailsWithSerials } from '@/lib/schemas/procurement/procurement-types';

// Serial number entry
export { SerialNumberBatchEntry } from './serial-number-batch-entry';
export type { SerialNumberBatchEntryProps } from './serial-number-batch-entry';
