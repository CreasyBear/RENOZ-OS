/* eslint-disable react-refresh/only-export-components -- Dialog exports component + constants */
/**
 * OrderBulkOperationsDialog Component
 *
 * Confirmation dialog for bulk order operations with progress indicators.
 * Handles bulk status updates, allocation, and shipping operations.
 *
 * @see src/components/domain/jobs/jobs-bulk-actions.tsx for reference
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from '@tanstack/react-router';
import { CheckCircle, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { FormatAmount } from '@/components/shared/format';
import { StatusBadge, type StatusConfigItem } from '@/components/shared/status-badge';
import type { OrderStatus } from '@/lib/schemas/orders';
import { orderStatusValues } from '@/lib/schemas/orders';
import { ORDER_STATUS_OPTIONS } from './order-filter-config';

// Type guard for order status validation
function isValidOrderStatus(value: string): value is OrderStatus {
  return orderStatusValues.includes(value as OrderStatus);
}

export interface OrderBulkOperation {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  total: number;
  currentStatus: string;
}

export interface BulkOperationConfig {
  type: 'allocate' | 'status_update';
  title: string;
  description: string;
  confirmText: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'secondary';
}

export interface OrderBulkOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BulkOperationConfig | null;
  orders: OrderBulkOperation[];
  onConfirm: (status?: OrderStatus) => Promise<void>;
  isLoading?: boolean;
  failures?: string[];
}

/**
 * Bulk operation configurations.
 * Shared between dialog and container components.
 */
export const OPERATION_CONFIGS: Record<string, BulkOperationConfig> = {
  allocate: {
    type: 'allocate',
    title: 'Bulk Allocate Orders',
    description: 'Move selected orders to the picking stage for fulfillment.',
    confirmText: 'Allocate Orders',
    icon: Package,
    variant: 'default',
  },
  status_update: {
    type: 'status_update',
    title: 'Bulk Status Update',
    description: 'Update the status of selected orders.',
    confirmText: 'Update Status',
    icon: CheckCircle,
    variant: 'secondary',
  },
};

const ORDER_STATUS_BADGE_CONFIG: Record<OrderStatus, StatusConfigItem> = {
  draft: { variant: 'neutral', label: 'Draft' },
  confirmed: { variant: 'info', label: 'Confirmed' },
  picking: { variant: 'progress', label: 'Picking' },
  picked: { variant: 'info', label: 'Picked' },
  partially_shipped: { variant: 'warning', label: 'Partially Shipped' },
  shipped: { variant: 'info', label: 'Shipped' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'error', label: 'Cancelled' },
};

export function OrderBulkOperationsDialog({
  open,
  onOpenChange,
  operation,
  orders,
  onConfirm,
  isLoading = false,
  failures = [],
}: OrderBulkOperationsDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const config = operation ? OPERATION_CONFIGS[operation.type] || operation : null;
  const requiresStatus = config?.type === 'status_update';
  const hasShippedSelection = orders.some((order) =>
    ['partially_shipped', 'shipped', 'delivered'].includes(order.currentStatus)
  );

  useEffect(() => {
    if (open) {
      setSelectedStatus('');
      setStatusError(null);
    }
  }, [open, config?.type]);

  if (!config) return null;

  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

  const handleConfirm = async () => {
    if (requiresStatus && !selectedStatus) {
      setStatusError('Select a status to continue.');
      return;
    }
    if (requiresStatus && selectedStatus === 'cancelled' && hasShippedSelection) {
      setStatusError('Selected orders include shipped quantities. Use return/RMA workflow instead of cancellation.');
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(selectedStatus || undefined);
      onOpenChange(false);
    } catch {
      // Parent handles user-facing errors and keeps dialog open for actionable retry.
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <config.icon className="text-primary h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {orders.length} order{orders.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-muted-foreground text-xs">
                  Total value: <FormatAmount amount={totalValue} />
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {config.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Warning for large operations */}
          {orders.length > 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You&apos;re about to perform a bulk operation on {orders.length} orders. This action
                cannot be easily undone. Please review the order list below.
              </AlertDescription>
            </Alert>
          )}

          {failures.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    {failures.length} order{failures.length === 1 ? "" : "s"} failed:
                  </p>
                  <ul className="list-disc pl-4 text-sm">
                    {failures.slice(0, 8).map((failure) => (
                      <li key={failure}>{failure}</li>
                    ))}
                  </ul>
                  {failures.length > 8 && (
                    <p className="text-xs">
                      …and {failures.length - 8} more.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {requiresStatus && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (isValidOrderStatus(value)) {
                    setSelectedStatus(value);
                    setStatusError(null);
                  } else {
                    setStatusError('Invalid status selected');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.value === 'cancelled' && hasShippedSelection}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasShippedSelection && (
                <p className="text-xs text-muted-foreground">
                  Cancelled is disabled because some selected orders already include shipped quantities.
                </p>
              )}
              {statusError && <p className="text-sm text-destructive">{statusError}</p>}
            </div>
          )}

          {/* Orders List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Orders</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-muted-foreground">
                      {order.customerId ? (
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: order.customerId }}
                          search={{}}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.customerName}
                        </Link>
                      ) : (
                        order.customerName
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      <FormatAmount amount={order.total} />
                    </div>
                    <StatusBadge
                      status={order.currentStatus}
                      statusConfig={ORDER_STATUS_BADGE_CONFIG}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || isLoading || (requiresStatus && !selectedStatus)}
            variant={config.variant}
            className="gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <config.icon className="h-4 w-4" />
                {config.confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
