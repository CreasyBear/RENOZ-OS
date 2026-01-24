/**
 * Xero Sync Status Page (Container)
 *
 * Monitor Xero invoice synchronization status, view sync history,
 * and retry failed syncs.
 *
 * This is the CONTAINER (route) - handles all data fetching and state.
 * @see src/components/domain/financial/xero-sync-status.tsx (presenter)
 * @see src/hooks/financial/use-financial.ts (hooks)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-005)
 */

import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout/page-layout';
import {
  XeroSyncStatus,
  type InvoiceWithSyncStatus,
} from '@/components/domain/financial/xero-sync-status';
import { useXeroSyncs, useResyncXeroInvoice } from '@/hooks/financial';
import type { XeroSyncStatus as SyncStatus } from '@/lib/schemas';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/xero-sync')({
  component: XeroSyncStatusPage,
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function XeroSyncStatusPage() {
  // UI State
  const [activeTab, setActiveTab] = useState<SyncStatus | 'all'>('all');
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  // Data fetching via centralized hooks
  const { data, isLoading, error } = useXeroSyncs({
    status: activeTab === 'all' ? undefined : activeTab,
    pageSize: 50,
  });

  // Resync mutation via centralized hook
  const resyncMutation = useResyncXeroInvoice();

  // Handlers
  const handleTabChange = useCallback((tab: SyncStatus | 'all') => {
    setActiveTab(tab);
  }, []);

  const handleResync = useCallback(
    (orderId: string) => {
      setResyncingId(orderId);
      resyncMutation.mutate(orderId, {
        onSettled: () => setResyncingId(null),
      });
    },
    [resyncMutation]
  );

  // Extract invoices from data
  const invoices: InvoiceWithSyncStatus[] = data?.invoices ?? [];

  return (
    <PageLayout>
      <PageLayout.Header title="Xero Sync" description="Invoice synchronization status and history" />
      <PageLayout.Content>
        <XeroSyncStatus
          invoices={invoices}
          isLoading={isLoading}
          error={error}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onResync={handleResync}
          resyncingId={resyncingId}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
