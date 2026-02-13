'use client';

/**
 * Invoice Detail Composite Hook
 *
 * Combines data fetching and UI state for the invoice detail view.
 * Follows the custom hook pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Custom Hook Pattern)
 */

import { useState, useMemo, useCallback } from 'react';
import { useInvoice, type InvoiceDetail } from './use-invoices';
import { useUpdateInvoiceStatus } from './use-update-invoice-status';
import { useSendInvoiceReminder } from './use-send-invoice-reminder';
import { useUnifiedActivities } from '@/hooks/activities';
import { toastError } from '@/hooks';
import {
  type InvoiceStatus,
  INVOICE_STATUS_TRANSITIONS,
  INVOICE_STATUS_CONFIG,
  INVOICE_ALERT_THRESHOLDS,
  isValidInvoiceStatusTransition,
} from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceAlert {
  id: string;
  type: 'overdue' | 'payment_reminder' | 'expiring_quote';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface InvoiceDetailActions {
  onUpdateStatus: (status: InvoiceStatus, note?: string) => void;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onSchedule: () => void;
  onSendReminder: () => void;
  onVoid: () => void;
  onRefund: () => void;
  onRestore: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
}

export interface UseInvoiceDetailReturn {
  invoice: InvoiceDetail | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;

  // Status
  nextStatusActions: InvoiceStatus[];
  isUpdatingStatus: boolean;
  isSendingReminder: boolean;

  // Alerts
  alerts: InvoiceAlert[];

  // Activities (for timeline)
  activities: import('@/lib/schemas/unified-activity').UnifiedActivity[];
  activitiesLoading: boolean;
  activitiesError: Error | null;

  // Actions
  actions: InvoiceDetailActions;
}

// ============================================================================
// HOOK
// ============================================================================

export function useInvoiceDetail(invoiceId: string): UseInvoiceDetailReturn {
  // Data fetching
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);

  // Activities (for timeline - invoice is an order)
  const {
    activities = [],
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'order',
    entityId: invoiceId,
    enabled: !!invoiceId,
  });

  // Mutations
  const updateStatus = useUpdateInvoiceStatus();
  const sendReminder = useSendInvoiceReminder();

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(true);

  // Calculate valid next status transitions
  // Note: invoiceStatus can be null (draft invoices), so we handle null explicitly
  const nextStatusActions = useMemo<InvoiceStatus[]>(() => {
    if (!invoice?.invoiceStatus) return [];
    // TypeScript narrows invoiceStatus to non-null after the check above
    const currentStatus: InvoiceStatus = invoice.invoiceStatus;
    return INVOICE_STATUS_TRANSITIONS[currentStatus] || [];
  }, [invoice?.invoiceStatus]);

  // Callback for send reminder (needs to be stable for useMemo dependency)
  const handleSendReminder = useCallback(() => {
    sendReminder.mutate(invoiceId);
  }, [invoiceId, sendReminder]);

  // Stable "now" for overdue calc - Date.now() in useMemo is acceptable for derived display
  // eslint-disable-next-line react-hooks/purity -- cached "now" for component lifetime is intentional
  const now = useMemo(() => Date.now(), []);

  // Calculate alerts based on invoice data
  const alerts = useMemo<InvoiceAlert[]>(() => {
    if (!invoice) return [];

    const result: InvoiceAlert[] = [];

    // Overdue alert
    if (invoice.invoiceStatus === 'overdue') {
      const daysOverdue = invoice.invoiceDueDate
        ? Math.floor((now - new Date(invoice.invoiceDueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      result.push({
        id: `${invoiceId}-overdue`,
        type: 'overdue',
        severity: 'critical',
        title: 'Payment Overdue',
        message: `This invoice is ${daysOverdue} days overdue. Balance due: $${Number(invoice.balanceDue || 0).toFixed(2)}`,
        action: {
          label: 'Send Reminder',
          onClick: handleSendReminder,
        },
      });
    }

    // Large balance warning (for unpaid invoices)
    if (
      invoice.invoiceStatus === 'unpaid' &&
      Number(invoice.balanceDue || 0) > INVOICE_ALERT_THRESHOLDS.LARGE_BALANCE_THRESHOLD
    ) {
      result.push({
        id: `${invoiceId}-large-balance`,
        type: 'payment_reminder',
        severity: 'warning',
        title: 'Large Outstanding Balance',
        message: `Outstanding balance of $${Number(invoice.balanceDue).toFixed(2)} requires attention.`,
      });
    }

    return result;
  }, [invoice, invoiceId, handleSendReminder, now]);

  // Actions
  const actions = useMemo<InvoiceDetailActions>(() => ({
    onUpdateStatus: (status: InvoiceStatus, note?: string) => {
      // Early return if invoice or status is missing
      if (!invoice || !invoice.invoiceStatus) return;

      // TypeScript narrows invoiceStatus to non-null after the check above
      const currentStatus: InvoiceStatus = invoice.invoiceStatus;
      if (!isValidInvoiceStatusTransition(currentStatus, status)) {
        const currentLabel = INVOICE_STATUS_CONFIG[currentStatus]?.label || currentStatus;
        const newLabel = INVOICE_STATUS_CONFIG[status]?.label || status;
        toastError(
          `Cannot change invoice status from ${currentLabel} to ${newLabel}`,
          {
            description: 'This status transition is not allowed. Please check the invoice workflow.',
          }
        );
        return;
      }

      updateStatus.mutate({
        id: invoiceId,
        status,
        note,
        paidAt: status === 'paid' ? new Date() : undefined,
      });
    },

    onMarkPaid: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'paid',
        paidAt: new Date(),
      });
    },

    onMarkUnpaid: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'unpaid',
        note: 'Payment status reversed',
      });
    },

    onSchedule: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'scheduled',
        note: 'Invoice scheduled for automatic sending',
      });
    },

    onSendReminder: () => {
      if (!invoice) return;
      sendReminder.mutate(invoiceId);
    },

    onVoid: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'canceled',
        note: 'Invoice voided',
      });
    },

    onRefund: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'refunded',
        note: 'Payment refunded',
      });
    },

    onRestore: () => {
      if (!invoice) return;
      updateStatus.mutate({
        id: invoiceId,
        status: 'draft',
        note: 'Invoice restored from canceled',
      });
    },

    onPrint: () => {
      window.print();
    },

    onDownloadPdf: () => {
      if (!invoice?.invoicePdfUrl) return;
      window.open(invoice.invoicePdfUrl, '_blank');
    },
  }), [invoice, invoiceId, updateStatus, sendReminder]);

  return {
    invoice,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,

    activeTab,
    onTabChange: setActiveTab,
    showSidebar,
    toggleSidebar: useCallback(() => setShowSidebar((v) => !v), []),

    nextStatusActions,
    isUpdatingStatus: updateStatus.isPending,
    isSendingReminder: sendReminder.isPending,

    alerts,
    activities,
    activitiesLoading,
    activitiesError: activitiesError instanceof Error ? activitiesError : null,
    actions,
  };
}
