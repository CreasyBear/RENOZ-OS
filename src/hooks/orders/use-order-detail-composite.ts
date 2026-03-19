'use client';

/**
 * Order Detail Composite Hook
 *
 * Encapsulates all data fetching, UI state, and actions for the order detail view.
 * Follows DETAIL-VIEW-STANDARDS.md composite hook pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { type OrderWithCustomer } from './use-order-detail';
import type { OrderStatus } from '@/lib/schemas/orders';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import {
  useOrderDetailDataAlerts,
  type OrderAlert,
} from './use-order-detail-data-alerts';
import { useOrderDetailUiState } from './use-order-detail-ui-state';
import {
  useOrderDetailActions,
  type OrderDetailActions,
} from './use-order-detail-actions';

export type { OrderAlert } from './use-order-detail-data-alerts';

export interface UseOrderDetailReturn {
  // Data
  order: OrderWithCustomer | undefined;
  activities: UnifiedActivity[];
  alerts: OrderAlert[];

  // Loading states
  isLoading: boolean;
  error: Error | null;
  activitiesLoading: boolean;
  activitiesError: Error | null;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;

  // Status workflow
  nextStatusActions: OrderStatus[];
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;

  // Actions
  actions: OrderDetailActions;

  // Refetch
  refetch: () => void;
}

// ============================================================================
// OPTIONS
// ============================================================================

export interface UseOrderDetailCompositeOptions {
  /** Called when user clicks "Ship Order" in status-update toast (e.g. after picking) */
  onOpenShipDialog?: () => void;
  /** Controls background polling for detail refresh. */
  refetchInterval?: number | false;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useOrderDetailComposite(
  orderId: string,
  options?: UseOrderDetailCompositeOptions
): UseOrderDetailReturn {
  const uiState = useOrderDetailUiState();
  const dataState = useOrderDetailDataAlerts({
    orderId,
    refetchInterval: options?.refetchInterval ?? 30000,
  });
  const actionState = useOrderDetailActions({
    orderId,
    onOpenShipDialog: options?.onOpenShipDialog,
    onOpenActivityDialog: () => uiState.setActivityDialogOpen(true),
    onCloseDeleteDialog: () => uiState.setDeleteDialogOpen(false),
    refetch: dataState.refetch,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Data
    order: dataState.order,
    activities: dataState.activities,
    alerts: dataState.alerts,

    // Loading states
    isLoading: dataState.isLoading,
    error: dataState.error,
    activitiesLoading: dataState.activitiesLoading,
    activitiesError: dataState.activitiesError,

    // UI State
    activeTab: uiState.activeTab,
    onTabChange: uiState.onTabChange,
    showSidebar: uiState.showSidebar,
    toggleSidebar: uiState.toggleSidebar,
    deleteDialogOpen: uiState.deleteDialogOpen,
    setDeleteDialogOpen: uiState.setDeleteDialogOpen,
    activityDialogOpen: uiState.activityDialogOpen,
    setActivityDialogOpen: uiState.setActivityDialogOpen,

    // Status workflow
    nextStatusActions: dataState.nextStatusActions,
    isUpdatingStatus: actionState.isUpdatingStatus,
    isDeleting: actionState.isDeleting,
    isDuplicating: actionState.isDuplicating,

    // Actions
    actions: actionState.actions,

    // Refetch
    refetch: dataState.refetch,
  };
}
