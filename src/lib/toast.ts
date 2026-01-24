/**
 * Unified Toast System - Gold Standard Consolidation
 *
 * Consolidates toast notifications into a single, consistent API.
 * Eliminates the inconsistency between toastSuccess/toastError and toast() imports.
 */

import { toast as sonnerToast } from 'sonner';

// Re-export sonner toast for direct access if needed
export { toast as sonnerToast } from 'sonner';

// ============================================================================
// TOAST TYPES
// ============================================================================

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label?: string;
    onClick?: () => void;
  };
}

// ============================================================================
// UNIFIED TOAST API
// ============================================================================

/**
 * Unified toast interface that works with both existing patterns
 */
export const toast = {
  /**
   * Show success message
   */
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show error message
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show info message
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show warning message
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show loading message
   */
  loading: (message: string, options?: Omit<ToastOptions, 'action'>) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      duration: options?.duration,
    });
  },

  /**
   * Dismiss specific toast
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy toastSuccess function for backward compatibility
 * @deprecated Use toast.success() instead
 */
export function toastSuccess(message: string, options?: ToastOptions) {
  console.warn('toastSuccess is deprecated. Use toast.success() instead.');
  return toast.success(message, options);
}

/**
 * Legacy toastError function for backward compatibility
 * @deprecated Use toast.error() instead
 */
export function toastError(message: string, options?: ToastOptions) {
  console.warn('toastError is deprecated. Use toast.error() instead.');
  return toast.error(message, options);
}

// ============================================================================
// DOMAIN-SPECIFIC TOAST HELPERS
// ============================================================================

/**
 * Supplier domain toast helpers
 */
export const supplierToasts = {
  created: (name: string) => toast.success(`Supplier "${name}" created successfully`),
  updated: (name: string) => toast.success(`Supplier "${name}" updated successfully`),
  deleted: (name: string) => toast.success(`Supplier "${name}" deleted successfully`),
  importStarted: () => toast.loading('Starting supplier import...'),
  importCompleted: (count: number) => toast.success(`Successfully imported ${count} suppliers`),
  importFailed: () => toast.error('Supplier import failed'),
};

/**
 * Pricing domain toast helpers
 */
export const pricingToasts = {
  priceCreated: () => toast.success('Price list created successfully'),
  priceUpdated: () => toast.success('Price list updated successfully'),
  priceDeleted: () => toast.success('Price list deleted successfully'),
  agreementCreated: () => toast.success('Price agreement created successfully'),
  agreementUpdated: () => toast.success('Price agreement updated successfully'),
  agreementDeleted: () => toast.success('Price agreement deleted successfully'),
  approvalSubmitted: () => toast.success('Price change submitted for approval'),
  approvalGranted: () => toast.success('Price change approved'),
  approvalRejected: (reason?: string) =>
    toast.error('Price change rejected', {
      description: reason || 'Please check the requirements and try again',
    }),
  exportStarted: () => toast.loading('Preparing export...'),
  exportCompleted: (filename: string) =>
    toast.success('Export completed', {
      description: `Downloaded ${filename}`,
    }),
  bulkUpdateCompleted: (count: number) => toast.success(`Updated ${count} price entries`),
};

/**
 * Order domain toast helpers
 */
export const orderToasts = {
  created: (orderNumber: string) => toast.success(`Order ${orderNumber} created successfully`),
  updated: (orderNumber: string) => toast.success(`Order ${orderNumber} updated successfully`),
  deleted: (orderNumber: string) => toast.success(`Order ${orderNumber} deleted successfully`),
  statusChanged: (orderNumber: string, status: string) =>
    toast.success(`Order ${orderNumber} status changed to ${status}`),
  approved: (orderNumber: string) => toast.success(`Order ${orderNumber} approved`),
  rejected: (orderNumber: string) => toast.error(`Order ${orderNumber} rejected`),
};
