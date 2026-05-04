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
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { XeroSyncStatus } from '@/components/domain/financial/xero-sync-status';
import type { InvoiceWithSyncStatus } from '@/lib/schemas';
import {
  useXeroIntegrationStatus,
  useXeroInvoiceStatus,
  useXeroPaymentEvents,
  useXeroSyncs,
  useResyncXeroInvoice,
} from '@/hooks/financial';
import type { XeroSyncStatus as SyncStatus } from '@/lib/schemas';

const searchSchema = z.object({
  view: z.enum(['invoice_sync', 'payment_events']).catch('invoice_sync').default('invoice_sync'),
  status: z.enum(['all', 'pending', 'syncing', 'synced', 'error']).catch('all').default('all'),
  issue: z.string().optional().catch(undefined),
  orderId: z.string().optional().catch(undefined),
  eventId: z.string().optional().catch(undefined),
  customerId: z.string().optional().catch(undefined),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_authenticated/financial/xero-sync')({
  validateSearch: (search: Record<string, unknown>): SearchParams => searchSchema.parse(search),
  component: XeroSyncStatusPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => <FinancialTableSkeleton />,
});

function XeroSyncStatusPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const status = search.status;
  const consoleView = search.view;

  const { data, isLoading, error } = useXeroSyncs({
    status: status === 'all' ? undefined : status,
    issue: search.issue,
    customerId: search.customerId,
    orderId: search.orderId,
    pageSize: 50,
  });
  const { data: integration } = useXeroIntegrationStatus();
  const { data: paymentEventsData, isLoading: paymentEventsLoading } = useXeroPaymentEvents({
    page: 1,
    pageSize: 25,
  });
  const { data: selectedInvoice, isLoading: selectedInvoiceLoading } = useXeroInvoiceStatus(
    search.orderId ?? '',
    Boolean(search.orderId)
  );

  const resyncMutation = useResyncXeroInvoice();

  const updateSearch = useCallback(
    (updates: Partial<SearchParams>) => {
      navigate({
        to: '/financial/xero-sync',
        search: (prev) => ({
          ...prev,
          ...updates,
        }),
      });
    },
    [navigate]
  );

  const handleConsoleViewChange = useCallback(
    (view: 'invoice_sync' | 'payment_events') => {
      updateSearch({
        view,
        eventId: view === 'payment_events' ? search.eventId : undefined,
        orderId: view === 'invoice_sync' ? search.orderId : undefined,
      });
    },
    [search.eventId, search.orderId, updateSearch]
  );

  const handleTabChange = useCallback(
    (tab: SyncStatus | 'all') => {
      updateSearch({ status: tab, orderId: search.orderId });
    },
    [search.orderId, updateSearch]
  );

  const handleResync = useCallback(
    (orderId: string) => {
      setResyncingId(orderId);
      resyncMutation.mutate(orderId, {
        onSettled: () => setResyncingId(null),
      });
    },
    [resyncMutation]
  );

  const invoices: InvoiceWithSyncStatus[] = data?.invoices ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Xero Sync</h2>
        <p className="text-sm text-muted-foreground">
          Invoice synchronization status, payment events, and retry history.
        </p>
      </div>
      <XeroSyncStatus
        invoices={invoices}
        isLoading={isLoading}
        error={error}
        activeTab={status}
        onTabChange={handleTabChange}
        consoleView={consoleView}
        onConsoleViewChange={handleConsoleViewChange}
        onResync={handleResync}
        resyncingId={resyncingId}
        integration={integration}
        paymentEvents={paymentEventsData?.items ?? []}
        paymentEventsLoading={paymentEventsLoading}
        selectedOrderId={search.orderId}
        selectedInvoice={selectedInvoice ?? null}
        selectedInvoiceLoading={selectedInvoiceLoading}
        onSelectInvoice={(orderId) =>
          updateSearch({
            view: 'invoice_sync',
            orderId: orderId ?? undefined,
            eventId: undefined,
          })
        }
        selectedPaymentEventId={search.eventId}
        onSelectPaymentEvent={(eventId) =>
          updateSearch({
            view: 'payment_events',
            eventId: eventId ?? undefined,
            orderId: undefined,
          })
        }
      />
    </div>
  );
}
