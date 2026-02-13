/**
 * Confirmation Dialog Hook - Gold Standard Pattern
 *
 * Centralized confirmation dialog management.
 * Eliminates scattered confirm() calls and provides consistent UX.
 *
 * Requires ConfirmationProvider in the tree (e.g. _authenticated layout).
 * useConfirmation reads from context so all callers share state with ConfirmationDialog.
 */

import {
  useConfirmationContext,
  type ConfirmationOptions,
  type ConfirmationState,
} from '@/contexts/confirmation-context';
import { logger } from '@/lib/logger';

// Re-export types for consumers
export type { ConfirmationOptions, ConfirmationState };

// ============================================================================
// HOOK
// ============================================================================

/**
 * Centralized confirmation dialog hook.
 * Must be used within ConfirmationProvider.
 */
export function useConfirmation() {
  return useConfirmationContext();
}

// ============================================================================
// PRESET CONFIRMATIONS
// ============================================================================

/**
 * Preset confirmation dialogs for common scenarios
 */
export const confirmations = {
  /**
   * Deactivate confirmation (user/entity loses access, can be reactivated)
   */
  deactivate: (itemName: string, itemType = 'user') => ({
    title: `Deactivate ${itemType}`,
    description: `Are you sure you want to deactivate "${itemName}"? They will lose access to the system. They can be reactivated later.`,
    confirmLabel: `Deactivate ${itemType}`,
    variant: 'destructive' as const,
  }),

  /**
   * Generic delete confirmation
   */
  delete: (itemName: string, itemType = 'item') => ({
    title: `Delete ${itemType}`,
    description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'destructive' as const,
  }),

  /**
   * Bulk delete confirmation
   */
  bulkDelete: (count: number, itemType = 'items') => ({
    title: `Delete ${itemType}`,
    description: `Are you sure you want to delete ${count} ${itemType}? This action cannot be undone.`,
    confirmLabel: 'Delete All',
    variant: 'destructive' as const,
  }),

  /**
   * Status change confirmation
   */
  statusChange: (newStatus: string, itemName: string) => ({
    title: 'Change Status',
    description: `Are you sure you want to change the status of "${itemName}" to ${newStatus}?`,
    confirmLabel: 'Change Status',
  }),

  /**
   * Approval confirmation with reason
   */
  approve: (itemName: string) => ({
    title: 'Approve Changes',
    description: `Are you sure you want to approve the changes for "${itemName}"?`,
    confirmLabel: 'Approve',
    requireReason: true,
    reasonLabel: 'Approval Notes',
    reasonPlaceholder: 'Optional notes about this approval...',
  }),

  /**
   * Rejection confirmation with required reason
   */
  reject: (itemName: string) => ({
    title: 'Reject Changes',
    description: `Are you sure you want to reject the changes for "${itemName}"?`,
    confirmLabel: 'Reject',
    variant: 'destructive' as const,
    requireReason: true,
    reasonLabel: 'Rejection Reason',
    reasonPlaceholder: 'Please provide a reason for rejection...',
  }),

  /**
   * Irreversible action confirmation
   */
  irreversible: (action: string) => ({
    title: 'Irreversible Action',
    description: `The action "${action}" cannot be undone. Are you sure you want to proceed?`,
    confirmLabel: 'Proceed',
    variant: 'destructive' as const,
  }),

  /**
   * Export confirmation
   */
  export: (itemCount: number, format: string) => ({
    title: 'Export Data',
    description: `Export ${itemCount} items in ${format} format?`,
    confirmLabel: 'Export',
  }),

  /**
   * Send campaign confirmation
   */
  sendCampaign: (campaignName: string, recipientCount: number) => ({
    title: 'Send Campaign',
    description: `Send "${campaignName}" to ${recipientCount.toLocaleString()} recipients? This will start sending emails immediately.`,
    confirmLabel: 'Send Now',
    variant: 'default' as const,
  }),

  /**
   * Pause campaign confirmation
   */
  pauseCampaign: (campaignName: string) => ({
    title: 'Pause Campaign',
    description: `Pause sending for "${campaignName}"? You can resume it later.`,
    confirmLabel: 'Pause',
    variant: 'default' as const,
  }),

  /**
   * Cancel RMA confirmation
   */
  cancelRma: (rmaNumber: string) => ({
    title: 'Cancel RMA',
    description: `Are you sure you want to cancel RMA ${rmaNumber}? This action cannot be undone.`,
    confirmLabel: 'Cancel RMA',
    variant: 'destructive' as const,
  }),
};

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy confirm() wrapper for gradual migration
 * @deprecated Use useConfirmation hook instead
 */
export function legacyConfirm(message: string): Promise<boolean> {
  logger.warn('legacyConfirm is deprecated. Use useConfirmation hook instead.');

  return new Promise((resolve) => {
    if (window.confirm(message)) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}
