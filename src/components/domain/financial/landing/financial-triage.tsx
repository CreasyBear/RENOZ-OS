/**
 * FinancialTriage Component
 *
 * Triage section for financial landing page displaying actionable alerts:
 * - Overdue invoices (critical)
 * - Failed Xero syncs (warning)
 * - Payment reminders due (info)
 *
 * Follows DOMAIN-LANDING-STANDARDS.md triage pattern.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { useMemo } from 'react';
import { AlertTriangle, RefreshCw, Bell } from 'lucide-react';
import { TriageCard, type TriageItem } from './triage-card';
import { useOutstandingInvoices, useXeroSyncs, useOrdersForReminders } from '@/hooks/financial';

export interface FinancialTriageProps {
  /** Maximum number of triage items to display */
  maxItems?: number;
  /** Callback when user dismisses an alert */
  onDismiss?: (id: string) => void;
  /** Dismissed alert IDs (for persistence) */
  dismissedIds?: Set<string>;
}

/**
 * FinancialTriage - Actionable alerts for financial domain
 *
 * Displays:
 * - Critical: Overdue invoices
 * - Warning: Failed Xero syncs
 * - Info: Payment reminders due
 */
export function FinancialTriage({
  maxItems = 5,
  onDismiss,
  dismissedIds = new Set(),
}: FinancialTriageProps) {
  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Overdue invoices (critical)
  const { data: overdueData } = useOutstandingInvoices({
    overdueOnly: true,
    pageSize: 10,
  });

  // Failed Xero syncs (warning)
  const { data: failedSyncsData } = useXeroSyncs({
    errorsOnly: true,
    pageSize: 10,
  });

  // Payment reminders due (info)
  const { data: remindersData } = useOrdersForReminders({
    page: 1,
    pageSize: 10,
    minDaysOverdue: 0,
    matchTemplateDays: false,
    excludeAlreadyReminded: false,
  });

  // ============================================================================
  // BUILD TRIAGE ITEMS
  // ============================================================================

  const triageItems = useMemo(() => {
    const items: TriageItem[] = [];

    // 1. Overdue invoices (critical)
    if (overdueData?.invoices && overdueData.invoices.length > 0) {
      const overdueCount = overdueData.invoices.length;
      const totalOverdue = overdueData.invoices.reduce(
        (sum, inv) => sum + (inv.balanceDue ?? 0),
        0
      );

      items.push({
        id: 'overdue-invoices',
        type: 'critical',
        icon: AlertTriangle,
        title: `${overdueCount} Overdue Invoice${overdueCount > 1 ? 's' : ''}`,
        description: `$${totalOverdue.toLocaleString('en-AU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} total outstanding`,
        primaryAction: {
          label: 'View All',
          href: '/financial/invoices?status=overdue',
        },
        viewAction: {
          label: 'View Invoices',
          href: '/financial/invoices?status=overdue',
        },
        dismissable: true,
      });
    }

    // 2. Failed Xero syncs (warning)
    if (failedSyncsData?.invoices && failedSyncsData.invoices.length > 0) {
      const failedCount = failedSyncsData.invoices.length;

      items.push({
        id: 'failed-xero-syncs',
        type: 'warning',
        icon: RefreshCw,
        title: `${failedCount} Failed Sync${failedCount > 1 ? 's' : ''}`,
        description: 'Invoices failed to sync to Xero. Retry sync to resolve.',
        primaryAction: {
          label: 'View Failed',
          href: '/financial/xero-sync?status=error',
        },
        viewAction: {
          label: 'View Sync Status',
          href: '/financial/xero-sync?status=error',
        },
        dismissable: true,
      });
    }

    // 3. Payment reminders due (info)
    if (remindersData?.items && remindersData.items.length > 0) {
      const remindersCount = remindersData.items.length;

      items.push({
        id: 'payment-reminders-due',
        type: 'info',
        icon: Bell,
        title: `${remindersCount} Reminder${remindersCount > 1 ? 's' : ''} Due`,
        description: 'Orders eligible for payment reminder emails.',
        primaryAction: {
          label: 'Send Reminders',
          href: '/financial/reminders?action=send',
        },
        viewAction: {
          label: 'View Reminders',
          href: '/financial/reminders',
        },
        dismissable: true,
      });
    }

    // Filter out dismissed items
    const filtered = items.filter((item) => !dismissedIds.has(item.id));

    // Sort by severity (critical > warning > info) and limit
    return filtered
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.type] - severityOrder[b.type];
      })
      .slice(0, maxItems);
  }, [
    overdueData,
    failedSyncsData,
    remindersData,
    dismissedIds,
    maxItems,
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (triageItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        All good! No action required.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {triageItems.map((item) => (
        <TriageCard
          key={item.id}
          item={item}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
