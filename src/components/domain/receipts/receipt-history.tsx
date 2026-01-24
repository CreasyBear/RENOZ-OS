/**
 * Receipt History Component
 *
 * Shows a list of goods receipts for a purchase order with status badges.
 *
 * @see SUPP-GOODS-RECEIPT story
 */

import { Package, CheckCircle, AlertCircle, XCircle, Clock, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  ReceiptHistoryItem,
  ReceiptHistoryProps,
  ReceiptStatus,
} from '@/lib/schemas/receipts';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  ReceiptStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle;
  }
> = {
  pending_inspection: {
    label: 'Pending Inspection',
    variant: 'outline',
    icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    variant: 'default',
    icon: CheckCircle,
  },
  partially_accepted: {
    label: 'Partially Accepted',
    variant: 'secondary',
    icon: AlertCircle,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ReceiptHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Package className="text-muted-foreground mb-3 h-10 w-10" />
      <p className="font-medium">No Receipts Yet</p>
      <p className="text-muted-foreground text-sm">
        No goods have been received for this order yet.
      </p>
    </div>
  );
}

// ============================================================================
// RECEIPT CARD
// ============================================================================

interface ReceiptCardProps {
  receipt: ReceiptHistoryItem;
}

function ReceiptCard({ receipt }: ReceiptCardProps) {
  const config = statusConfig[receipt.status];
  const StatusIcon = config.icon;

  return (
    <div className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          receipt.status === 'accepted' && 'bg-green-100 text-green-600',
          receipt.status === 'partially_accepted' && 'bg-yellow-100 text-yellow-600',
          receipt.status === 'rejected' && 'bg-red-100 text-red-600',
          receipt.status === 'pending_inspection' && 'bg-gray-100 text-gray-600'
        )}
      >
        <StatusIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{receipt.receiptNumber}</p>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        <p className="text-muted-foreground mt-1 text-sm">
          Received by {receipt.receivedByName} on{' '}
          {new Date(receipt.receivedAt).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {receipt.totalItemsAccepted} accepted
          </span>
          {receipt.totalItemsRejected > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              {receipt.totalItemsRejected} rejected
            </span>
          )}
          {receipt.carrier && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {receipt.carrier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReceiptHistory({ receipts, isLoading = false }: ReceiptHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt History</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptHistorySkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receipt History</CardTitle>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { ReceiptHistoryProps };
