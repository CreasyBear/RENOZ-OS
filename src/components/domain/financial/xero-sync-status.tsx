/**
 * XeroSyncStatus Presenter Component
 *
 * Shows Xero sync status for invoices with manual resync capabilities.
 * Displays sync queue, errors, and successful syncs.
 *
 * This is a PRESENTER component - all data fetching happens in the route container.
 * @see src/routes/_authenticated/financial/xero-sync.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-005b)
 */

import { memo } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { format } from 'date-fns';
import type { XeroSyncStatus as SyncStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Invoice data with Xero sync status information.
 */
export interface InvoiceWithSyncStatus {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  total: number;
  customerName: string;
  xeroInvoiceId: string | null;
  xeroSyncStatus: SyncStatus;
  xeroSyncError: string | null;
  lastXeroSyncAt: string | null;
  xeroInvoiceUrl: string | null;
}

/**
 * Props for the XeroSyncStatus presenter component.
 * All data and handlers are injected from the container (route).
 */
export interface XeroSyncStatusProps {
  /** @source useQuery(listInvoicesBySyncStatus) in /financial/xero-sync.tsx */
  invoices: InvoiceWithSyncStatus[];
  /** @source useQuery loading state in /financial/xero-sync.tsx */
  isLoading: boolean;
  /** @source useQuery error state in /financial/xero-sync.tsx */
  error?: unknown;
  /** @source useState(activeTab) in /financial/xero-sync.tsx */
  activeTab: SyncStatus | 'all';
  /** @source setState from useState(activeTab) in /financial/xero-sync.tsx */
  onTabChange: (tab: SyncStatus | 'all') => void;
  /** @source useMutation(resyncInvoiceToXero) handler in /financial/xero-sync.tsx */
  onResync: (orderId: string) => void;
  /** @source useState(resyncingId) in /financial/xero-sync.tsx */
  resyncingId: string | null;
  /** Optional className for styling */
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  SyncStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  syncing: { label: 'Syncing', variant: 'default', icon: Loader2 },
  synced: { label: 'Synced', variant: 'outline', icon: CheckCircle },
  error: { label: 'Error', variant: 'destructive', icon: AlertTriangle },
};

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn('h-3 w-3', status === 'syncing' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// INVOICE ROW
// ============================================================================

interface InvoiceRowProps {
  invoice: InvoiceWithSyncStatus;
  onResync: () => void;
  isResyncing: boolean;
}

function InvoiceRow({ invoice, onResync, isResyncing }: InvoiceRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{invoice.orderNumber}</TableCell>
      <TableCell>{invoice.customerName}</TableCell>
      <TableCell>{format(new Date(invoice.orderDate), 'dd MMM yyyy')}</TableCell>
      <TableCell className="text-right">
        <FormatAmount amount={invoice.total} />
      </TableCell>
      <TableCell>
        <SyncStatusBadge status={invoice.xeroSyncStatus} />
      </TableCell>
      <TableCell>
        {invoice.xeroSyncError && (
          <span className="text-destructive block max-w-[200px] truncate text-sm">
            {invoice.xeroSyncError}
          </span>
        )}
        {invoice.xeroInvoiceId && !invoice.xeroSyncError && (
          <span className="text-muted-foreground font-mono text-sm">{invoice.xeroInvoiceId}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {(invoice.xeroSyncStatus === 'error' || invoice.xeroSyncStatus === 'pending') && (
            <Button variant="ghost" size="sm" onClick={onResync} disabled={isResyncing}>
              <RefreshCw className={cn('h-4 w-4', isResyncing && 'animate-spin')} />
            </Button>
          )}
          {invoice.xeroInvoiceUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={invoice.xeroInvoiceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export const XeroSyncStatus = memo(function XeroSyncStatus({
  invoices,
  isLoading,
  error,
  activeTab,
  onTabChange,
  onResync,
  resyncingId,
  className,
}: XeroSyncStatusProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-destructive p-4', className)}>Failed to load Xero sync status</div>
    );
  }

  // Calculate counts for summary cards
  const errorCount = invoices.filter((i) => i.xeroSyncStatus === 'error').length;
  const pendingCount = invoices.filter((i) => i.xeroSyncStatus === 'pending').length;
  const syncedCount = invoices.filter((i) => i.xeroSyncStatus === 'synced').length;
  const syncingCount = invoices.filter((i) => i.xeroSyncStatus === 'syncing').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Xero Invoice Sync</h2>
          <p className="text-muted-foreground">Manage invoice synchronization with Xero</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-muted-foreground text-sm">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-500" />
              <span className="text-muted-foreground text-sm">Syncing</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{syncingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground text-sm">Synced</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{syncedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-muted-foreground text-sm">Errors</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{errorCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as SyncStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="error">Errors</TabsTrigger>
          <TabsTrigger value="synced">Synced</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {invoices.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.orderId}
                    invoice={invoice}
                    onResync={() => onResync(invoice.orderId)}
                    isResyncing={resyncingId === invoice.orderId}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});
