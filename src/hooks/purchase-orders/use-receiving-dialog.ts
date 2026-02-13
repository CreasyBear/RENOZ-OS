/**
 * Receiving Dialog State Hook
 *
 * Manages UI state for the goods receipt dialog.
 * Separated from data fetching per STANDARDS.md:
 * "Never mix UI state with data fetching hooks."
 *
 * @see STANDARDS.md §2.3 Hook Patterns
 * @see hooks/jobs/use-project-detail-ui.ts - Reference pattern
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingDialogState {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Selected PO ID for receiving */
  selectedPOId: string | null;
  /** Open the dialog for a specific PO */
  openDialog: (poId: string) => void;
  /** Close the dialog */
  closeDialog: () => void;
  /** Handle dialog open change */
  onOpenChange: (open: boolean) => void;
}

export interface UseReceivingDialogOptions {
  /** Initial PO ID from URL param (optional) */
  initialPOId?: string | null;
  /** Whether to sync dialog state with URL param */
  syncWithUrl?: boolean;
  /** URL param name for PO ID (default: 'receive') */
  urlParamName?: string;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing receiving dialog state.
 * Handles URL synchronization and state management.
 *
 * @example
 * ```tsx
 * const dialog = useReceivingDialog({
 *   initialPOId: search.receive,
 *   syncWithUrl: true,
 * });
 *
 * <GoodsReceiptDialog
 *   open={dialog.isOpen}
 *   onOpenChange={dialog.onOpenChange}
 *   poId={dialog.selectedPOId}
 * />
 * ```
 */
export function useReceivingDialog(
  options: UseReceivingDialogOptions = {}
): ReceivingDialogState {
  const {
    initialPOId = null,
    syncWithUrl = false,
    urlParamName = 'receive',
  } = options;

  const navigate = useNavigate();

  // Initialize state from URL param if provided
  const [isOpen, setIsOpen] = useState(!!initialPOId);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(initialPOId);

  // Sync state when initialPOId changes (e.g., URL param updates)
  // Only update if it's different to avoid unnecessary re-renders
  useEffect(() => {
    if (initialPOId && initialPOId !== selectedPOId) {
      setSelectedPOId(initialPOId);
      setIsOpen(true);
    } else if (!initialPOId && selectedPOId) {
      // URL param was cleared, close dialog
      setSelectedPOId(null);
      setIsOpen(false);
    }
  }, [initialPOId, selectedPOId]);

  // Clear URL param helper
  const clearUrlParam = useCallback(() => {
    if (!syncWithUrl) return;

    navigate({
      to: '.',
      search: (prev) => {
        const { [urlParamName]: _, ...rest } = prev as Record<string, unknown>;
        return rest;
      },
      replace: true,
    });
  }, [navigate, syncWithUrl, urlParamName]);

  // Open dialog for a specific PO
  const openDialog = useCallback(
    (poId: string) => {
      setSelectedPOId(poId);
      setIsOpen(true);

      // Update URL param if syncing
      if (syncWithUrl) {
        navigate({
          to: '.',
          search: (prev) => ({
            ...prev,
            [urlParamName]: poId,
          }),
          replace: true,
        });
      }
    },
    [navigate, syncWithUrl, urlParamName]
  );

  // Close dialog
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setSelectedPOId(null);
    clearUrlParam();
  }, [clearUrlParam]);

  // Handle dialog open change (from Dialog component)
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Opening handled by openDialog
        setIsOpen(true);
      } else {
        // Closing
        closeDialog();
      }
    },
    [closeDialog]
  );

  return {
    isOpen,
    selectedPOId,
    openDialog,
    closeDialog,
    onOpenChange,
  };
}
