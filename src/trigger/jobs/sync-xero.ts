'use server'

/**
 * Sync Xero Job (Trigger.dev v3)
 *
 * Legacy Trigger.dev tasks retained for backward compatibility.
 * Canonical Xero sync now lives in the server-side financial sync flow.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";

// ============================================================================
// TYPES
// ============================================================================

export interface SyncXeroInvoicePayload {
  opportunityId: string;
  opportunityName: string;
  organizationId: string;
  customerId: string;
  value: number;
}

export interface SyncXeroContactPayload {
  customerId: string;
  organizationId: string;
}

export interface SyncXeroInvoiceResult {
  success: boolean;
  opportunityId: string;
  reason?: string;
}

export interface SyncXeroContactResult {
  success: boolean;
  customerId: string;
  message: string;
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

/**
 * Legacy invoice sync task.
 *
 * This task should not report success because the real integration path is the
 * server-side Xero sync workflow.
 */
export const syncXeroInvoiceTask = task({
  id: "sync-xero-invoice",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: SyncXeroInvoicePayload): Promise<SyncXeroInvoiceResult> => {
    const {
      opportunityId,
      opportunityName,
      organizationId,
      customerId,
      value,
    } = payload;

    logger.warn("Legacy Trigger-based Xero invoice sync is unavailable", {
      opportunityId,
      opportunityName,
      organizationId,
      customerId,
      value,
    });

    return {
      success: false,
      opportunityId,
      reason: "Legacy Trigger-based Xero invoice sync is unavailable. Use the server-side Xero sync flow instead.",
    };
  },
});

/**
 * Legacy contact sync task.
 */
export const syncXeroContactTask = task({
  id: "sync-xero-contact",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: SyncXeroContactPayload): Promise<SyncXeroContactResult> => {
    const { customerId, organizationId } = payload;

    logger.warn("Legacy Trigger-based Xero contact sync is unavailable", {
      customerId,
      organizationId,
    });

    return {
      success: false,
      customerId,
      message: "Legacy Trigger-based Xero contact sync is unavailable. Use the server-side Xero sync flow instead.",
    };
  },
});

// Legacy exports for backward compatibility
export const syncXeroInvoiceJob = syncXeroInvoiceTask;
export const syncXeroContactJob = syncXeroContactTask;
