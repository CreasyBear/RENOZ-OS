/**
 * OrderBulkOperationsDialog Component
 *
 * Confirmation dialog for bulk order operations with progress indicators.
 * Handles bulk status updates, allocation, and shipping operations.
 *
 * @see src/components/domain/jobs/jobs-bulk-actions.tsx for reference
 */

import { useState } from 'react';
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
import { CheckCircle, AlertTriangle, Package, Truck, Loader2 } from 'lucide-react';
import { FormatAmount } from '@/components/shared/format';

export interface OrderBulkOperation {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  currentStatus: string;
}

export interface BulkOperationConfig {
  type: 'allocate' | 'ship' | 'status_update';
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
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

const OPERATION_CONFIGS: Record<string, BulkOperationConfig> = {
  allocate: {
    type: 'allocate',
    title: 'Bulk Allocate Orders',
    description: 'Move selected orders to the picking stage for fulfillment.',
    confirmText: 'Allocate Orders',
    icon: Package,
    variant: 'default',
  },
  ship: {
    type: 'ship',
    title: 'Bulk Ship Orders',
    description: 'Mark selected orders as shipped and update their status.',
    confirmText: 'Ship Orders',
    icon: Truck,
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

export function OrderBulkOperationsDialog({
  open,
  onOpenChange,
  operation,
  orders,
  onConfirm,
  isLoading = false,
}: OrderBulkOperationsDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!operation) return null;

  const config = OPERATION_CONFIGS[operation.type] || operation;
  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
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
                {operation.type.replace('_', ' ')}
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

          <Separator />

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
                    <div className="text-muted-foreground">{order.customerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      <FormatAmount amount={order.total} />
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {order.currentStatus}
                    </Badge>
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
            disabled={isConfirming || isLoading}
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
