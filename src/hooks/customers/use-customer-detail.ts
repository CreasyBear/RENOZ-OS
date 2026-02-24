/**
 * Customer Detail Hook
 *
 * Custom hook that encapsulates all data fetching, state management, and actions
 * for the customer detail view. Follows the hook pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @source customer from useCustomer hook
 * @source activities from useUnifiedActivities hook
 * @source alerts from useCustomerAlerts hook
 * @source activeItems from useCustomerActiveItems hook
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Hook patterns
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCustomerNavigation } from './use-customer-navigation';
import { useCustomer, useDeleteCustomer } from './use-customers';
import { useCustomerAlerts, useCustomerActiveItems } from './use-customer-detail-extended';
import { useUnifiedActivities } from '@/hooks/activities';
import { toastSuccess, toastError } from '@/hooks';
import type { ActivityType } from '@/components/shared/activity';
import type { CustomerDetailData, CustomerAlert, CustomerActiveItems } from '@/lib/schemas/customers';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerDetailActions {
  /** Navigate to edit page */
  onEdit: () => void;
  /** Create new quote for customer */
  onCreateQuote: () => void;
  /** Create new order for customer */
  onCreateOrder: () => void;
  /** Add note/communication */
  onAddNote: () => void;
  /** Schedule meeting */
  onScheduleMeeting: () => void;
  /** Delete customer (requires confirmation) */
  onDelete: () => Promise<void>;
  /** Copy page link to clipboard */
  onCopyLink: () => void;
  /** Print page */
  onPrint: () => void;
  /** Navigate back to customers list */
  onBack: () => void;
  /** Open activity logging dialog */
  onLogActivity: () => void;
  /** Open follow-up scheduling dialog */
  onScheduleFollowUp: () => void;
}

export interface UseCustomerDetailReturn {
  // Data
  customer: CustomerDetailData | undefined;
  activities: UnifiedActivity[];
  alerts: CustomerAlert[];
  activeItems: CustomerActiveItems | undefined;

  // Loading states
  isLoading: boolean;
  error: Error | null;
  activitiesLoading: boolean;
  activitiesError: Error | null;
  alertsLoading: boolean;
  activeItemsLoading: boolean;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;

  // Delete dialog state
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  isDeleting: boolean;

  // Activity dialog state
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;
  activityDialogDefaultType: ActivityType;

  // Actions
  actions: CustomerDetailActions;

  // Refetch
  refetch: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export interface UseCustomerDetailOptions {
  initialTab?: string;
}

export function useCustomerDetail(
  customerId: string,
  options: UseCustomerDetailOptions = {}
): UseCustomerDetailReturn {
  const { initialTab } = options;
  const navigate = useNavigate();
  const { navigateToEdit, navigateToList } = useCustomerNavigation();
  const normalizeTab = useCallback((tab?: string) => {
    return tab && ['overview', 'orders', 'activity'].includes(tab) ? tab : 'overview';
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(normalizeTab(initialTab));
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpenInternal] = useState(false);
  const [activityDialogDefaultType, setActivityDialogDefaultType] = useState<ActivityType>('note');

  useEffect(() => {
    const nextTab = normalizeTab(initialTab);
    globalThis.queueMicrotask(() =>
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
    );
  }, [initialTab, normalizeTab]);

  const handleTabChange = useCallback((tab: string) => {
    const nextTab = normalizeTab(tab);
    setActiveTab(nextTab);
    navigate({
      to: '/customers/$customerId',
      params: { customerId },
      search: { tab: nextTab as 'overview' | 'orders' | 'activity' },
      replace: true,
    });
  }, [navigate, customerId, normalizeTab]);

  const setActivityDialogOpen = useCallback((open: boolean) => {
    if (!open) setActivityDialogDefaultType('note');
    setActivityDialogOpenInternal(open);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: customer,
    isLoading,
    error,
    refetch,
  } = useCustomer({ id: customerId });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'customer',
    entityId: customerId,
  });

  const {
    data: alertsData,
    isLoading: alertsLoading,
  } = useCustomerAlerts({ customerId });

  const {
    data: activeItemsData,
    isLoading: activeItemsLoading,
  } = useCustomerActiveItems({ customerId });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteCustomer();

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (memoized to prevent unnecessary re-renders)
  // ─────────────────────────────────────────────────────────────────────────
  const actions = useMemo<CustomerDetailActions>(() => ({
    onEdit: () => {
      navigateToEdit(customerId);
    },
    // Navigate to create quote with stage and customer pre-selected
    onCreateQuote: () => {
      navigate({
        to: '/pipeline/new',
        search: { stage: 'proposal', customerId: customerId || undefined },
      });
    },
    // Navigate to order creation with customer pre-selected
    onCreateOrder: () => {
      navigate({
        to: '/orders/create',
        search: customerId ? { customerId } : undefined,
      });
    },
    onAddNote: () => {
      setActivityDialogDefaultType('note');
      setActivityDialogOpenInternal(true);
    },
    onScheduleMeeting: () => {
      setActivityDialogDefaultType('follow_up');
      setActivityDialogOpenInternal(true);
    },
    onDelete: async () => {
      try {
        await deleteMutation.mutateAsync(customerId);
        toastSuccess('Customer deleted');
        setDeleteDialogOpen(false);
        navigateToList();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Failed to delete customer';
        toastError(message);
        throw error instanceof Error ? error : new Error('Delete failed');
      }
    },
    onCopyLink: () => {
      navigator.clipboard.writeText(window.location.href);
      toastSuccess('Link copied to clipboard');
    },
    onPrint: () => {
      window.print();
    },
    onBack: () => {
      navigateToList();
    },
    onLogActivity: () => {
      setActivityDialogDefaultType('note');
      setActivityDialogOpenInternal(true);
    },
    onScheduleFollowUp: () => {
      setActivityDialogDefaultType('follow_up');
      setActivityDialogOpenInternal(true);
    },
  }), [customerId, navigate, navigateToEdit, navigateToList, deleteMutation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar toggle
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Data
    customer,
    activities: activities ?? [],
    alerts: alertsData?.alerts ?? [],
    activeItems: activeItemsData,

    // Loading states
    isLoading,
    error: error as Error | null,
    activitiesLoading,
    activitiesError: activitiesError as Error | null,
    alertsLoading,
    activeItemsLoading,

    // UI State
    activeTab,
    onTabChange: handleTabChange,
    showSidebar,
    toggleSidebar,

    // Delete dialog state
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting: deleteMutation.isPending,

    // Activity dialog state
    activityDialogOpen,
    setActivityDialogOpen,
    activityDialogDefaultType,

    // Actions
    actions,

    // Refetch
    refetch,
  };
}

export default useCustomerDetail;
