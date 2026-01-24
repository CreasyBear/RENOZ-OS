/**
 * Confirmation Dialog Hook - Gold Standard Pattern
 *
 * Centralized confirmation dialog management.
 * Eliminates scattered confirm() calls and provides consistent UX.
 */

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfirmationOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  resolve?: (result: { confirmed: boolean; reason?: string }) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Centralized confirmation dialog hook
 * Replaces scattered window.confirm() and confirm() calls throughout the codebase
 */
export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
  });

  const confirm = useCallback(
    (options: ConfirmationOptions = {}): Promise<{ confirmed: boolean; reason?: string }> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          isOpen: true,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(
    (reason?: string) => {
      state.resolve?.({ confirmed: true, reason });
      setState({ isOpen: false });
    },
    [state]
  );

  const handleCancel = useCallback(() => {
    state.resolve?.({ confirmed: false });
    setState({ isOpen: false });
  }, [state]);

  const close = useCallback(() => {
    state.resolve?.({ confirmed: false });
    setState({ isOpen: false });
  }, [state]);

  return {
    // State for rendering
    isOpen: state.isOpen,
    title: state.title || 'Confirm Action',
    description: state.description || 'Are you sure you want to proceed?',
    confirmLabel: state.confirmLabel || 'Confirm',
    cancelLabel: state.cancelLabel || 'Cancel',
    variant: state.variant || 'default',
    requireReason: state.requireReason || false,
    reasonLabel: state.reasonLabel || 'Reason',
    reasonPlaceholder: state.reasonPlaceholder || 'Please provide a reason...',

    // Actions
    confirm,
    handleConfirm,
    handleCancel,
    close,
  };
}

// ============================================================================
// PRESET CONFIRMATIONS
// ============================================================================

/**
 * Preset confirmation dialogs for common scenarios
 */
export const confirmations = {
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
};

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy confirm() wrapper for gradual migration
 * @deprecated Use useConfirmation hook instead
 */
export function legacyConfirm(message: string): Promise<boolean> {
  console.warn('legacyConfirm is deprecated. Use useConfirmation hook instead.');

  return new Promise((resolve) => {
    if (window.confirm(message)) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}
