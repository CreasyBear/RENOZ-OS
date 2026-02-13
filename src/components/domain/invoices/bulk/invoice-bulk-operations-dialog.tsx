/* eslint-disable react-refresh/only-export-components -- Dialog exports component + constants */
/**
 * Invoice Bulk Operations Dialog
 *
 * Confirmation dialog for bulk invoice operations with progress indicators.
 * Handles bulk status updates and sending reminders.
 *
 * @see src/components/domain/orders/order-bulk-operations-dialog.tsx for reference
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
import { CheckCircle, AlertTriangle, Mail, Loader2 } from 'lucide-react';
import { FormatAmount } from '@/components/shared/format';
import { InvoiceStatusBadge } from '../invoice-status-badge';
import { toastError } from '@/hooks';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';
import { INVOICE_STATUS_VALUES, INVOICE_STATUS_CONFIG } from '@/lib/constants/invoice-status';

export interface InvoiceBulkOperation {
  id: string;
  invoiceNumber: string | null;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  total: number;
  balanceDue: number;
  currentStatus: InvoiceStatus | null;
}

export interface BulkOperationConfig {
  type: 'send_reminder' | 'status_update';
  title: string;
  description: string;
  confirmText: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'secondary';
}

export interface InvoiceBulkOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BulkOperationConfig | null;
  invoices: InvoiceBulkOperation[];
  onConfirm: (status?: InvoiceStatus) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Bulk operation configurations.
 * Shared between dialog and container components.
 */
export const OPERATION_CONFIGS: Record<string, BulkOperationConfig> = {
  send_reminder: {
    type: 'send_reminder',
    title: 'Send Payment Reminders',
    description: 'Send payment reminder emails to customers for selected invoices.',
    confirmText: 'Send Reminders',
    icon: Mail,
    variant: 'default',
  },
  status_update: {
    type: 'status_update',
    title: 'Bulk Status Update',
    description: 'Update the status of selected invoices.',
    confirmText: 'Update Status',
    icon: CheckCircle,
    variant: 'secondary',
  },
};

export function InvoiceBulkOperationsDialog({
  open,
  onOpenChange,
  operation,
  invoices,
  onConfirm,
  isLoading = false,
}: InvoiceBulkOperationsDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | ''>('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const config = operation ? OPERATION_CONFIGS[operation.type] || operation : null;
  const requiresStatus = config?.type === 'status_update';

  useEffect(() => {
    if (open) {
      setSelectedStatus('');
      setStatusError(null);
    }
  }, [open, config?.type]);

  if (!config) return null;

  const totalValue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);

  const handleConfirm = async () => {
    if (requiresStatus && !selectedStatus) {
      setStatusError('Select a status to continue.');
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(selectedStatus || undefined);
      onOpenChange(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to complete bulk operation');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <config.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
            <div>
              <div className="text-sm text-muted-foreground">Invoices Selected</div>
              <div className="text-2xl font-semibold">{invoices.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-semibold">
                <FormatAmount amount={totalValue} />
              </div>
            </div>
            {totalBalance > 0 && (
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Total Balance Due</div>
                <div className="text-xl font-semibold text-amber-600">
                  <FormatAmount amount={totalBalance} />
                </div>
              </div>
            )}
          </div>

          {/* Status selection for status update */}
          {requiresStatus && (
            <div className="space-y-2">
              <Label htmlFor="status-select">New Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  setSelectedStatus(value as InvoiceStatus);
                  setStatusError(null);
                }}
              >
                <SelectTrigger id="status-select" className="w-full">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {INVOICE_STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{statusError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Separator />

          {/* Selected invoices list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Invoices</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {invoice.invoiceNumber || invoice.orderNumber}
                    </div>
                    <div className="text-muted-foreground">
                      {invoice.customerId ? (
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: invoice.customerId }}
                          search={{}}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoice.customerName}
                        </Link>
                      ) : (
                        invoice.customerName
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-medium">
                        <FormatAmount amount={invoice.total} />
                      </div>
                      {invoice.balanceDue > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Balance: <FormatAmount amount={invoice.balanceDue} />
                        </div>
                      )}
                    </div>
                    <InvoiceStatusBadge status={invoice.currentStatus} />
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
