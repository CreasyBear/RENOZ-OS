/**
 * Allocations Tab Component
 *
 * Displays current stock reservations/allocations for an inventory item.
 * Allows releasing reservations with reason tracking.
 *
 * Features:
 * - Allocations table with order/job references
 * - Release reservation dialog with reason selection
 * - Stock distribution visualization
 *
 * Accessibility (WCAG 2.1 AA):
 * - Table has proper headers and scope
 * - Actions have aria-labels
 * - Dialog is keyboard accessible
 *
 * @see INV-004c Reserved Stock Handling
 */
import { memo, useState, useCallback } from 'react';
import {
  Package,
  Calendar,
  User,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

export interface Allocation {
  id: string;
  referenceType: 'order' | 'job' | 'quote' | 'transfer';
  referenceId: string;
  referenceNumber: string;
  quantity: number;
  allocatedAt: Date;
  allocatedBy: string;
  customerName?: string;
  expectedShipDate?: Date;
  notes?: string;
}

export interface StockDistribution {
  onHand: number;
  allocated: number;
  available: number;
}

export interface AllocationsTabProps {
  /** @source useQuery(getItemAllocations) in /inventory/$itemId.tsx */
  allocations: Allocation[];
  /** @source useQuery(getInventoryItem) derived data in /inventory/$itemId.tsx */
  stockDistribution: StockDistribution;
  /** @source useQuery loading state in /inventory/$itemId.tsx */
  isLoading?: boolean;
  /** @source useCallback wrapping useMutation(releaseAllocation) in /inventory/$itemId.tsx */
  onReleaseAllocation?: (allocationId: string, reason: string, notes?: string) => Promise<void>;
  /** @source useMutation isPending state in /inventory/$itemId.tsx */
  isReleasing?: boolean;
  className?: string;
}

// ============================================================================
// RELEASE REASONS
// ============================================================================

const RELEASE_REASONS = [
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'inventory_adjustment', label: 'Inventory Adjustment' },
  { value: 'fulfillment_issue', label: 'Fulfillment Issue' },
  { value: 'stock_reallocation', label: 'Stock Reallocation' },
  { value: 'other', label: 'Other' },
] as const;

type ReleaseReason = (typeof RELEASE_REASONS)[number]['value'];

// ============================================================================
// REFERENCE TYPE CONFIG
// ============================================================================

const REFERENCE_TYPE_CONFIG: Record<
  Allocation['referenceType'],
  { label: string; icon: typeof FileText; color: string }
> = {
  order: {
    label: 'Order',
    icon: FileText,
    color: 'text-blue-600',
  },
  job: {
    label: 'Job',
    icon: Briefcase,
    color: 'text-purple-600',
  },
  quote: {
    label: 'Quote',
    icon: FileText,
    color: 'text-amber-600',
  },
  transfer: {
    label: 'Transfer',
    icon: Package,
    color: 'text-green-600',
  },
};

// ============================================================================
// STOCK DISTRIBUTION BAR
// ============================================================================

interface StockDistributionBarProps {
  distribution: StockDistribution;
}

const StockDistributionBar = memo(function StockDistributionBar({
  distribution,
}: StockDistributionBarProps) {
  const { onHand, allocated, available } = distribution;
  const allocatedPercent = onHand > 0 ? (allocated / onHand) * 100 : 0;
  const availablePercent = onHand > 0 ? (available / onHand) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Numbers row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums">{onHand}</div>
          <div className="text-xs text-muted-foreground">On Hand</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-blue-600">{allocated}</div>
          <div className="text-xs text-muted-foreground">Allocated</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-green-600">{available}</div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
      </div>

      {/* Stacked bar */}
      <div
        className="flex h-4 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={allocatedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${allocated} of ${onHand} units allocated (${allocatedPercent.toFixed(0)}%), ${available} available`}
      >
        {allocated > 0 && (
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${allocatedPercent}%` }}
          />
        )}
        {available > 0 && (
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${availablePercent}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />
          <span>Allocated ({allocatedPercent.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
          <span>Available ({availablePercent.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// RELEASE RESERVATION DIALOG
// ============================================================================

interface ReleaseReservationDialogProps {
  allocation: Allocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes?: string) => Promise<void>;
  isReleasing?: boolean;
}

const ReleaseReservationDialog = memo(function ReleaseReservationDialog({
  allocation,
  open,
  onOpenChange,
  onConfirm,
  isReleasing,
}: ReleaseReservationDialogProps) {
  const [reason, setReason] = useState<ReleaseReason | ''>('');
  const [notes, setNotes] = useState('');

  const handleConfirm = useCallback(async () => {
    if (!reason) return;
    await onConfirm(reason, notes || undefined);
    setReason('');
    setNotes('');
  }, [reason, notes, onConfirm]);

  const handleClose = useCallback(() => {
    setReason('');
    setNotes('');
    onOpenChange(false);
  }, [onOpenChange]);

  if (!allocation) return null;

  const refConfig = REFERENCE_TYPE_CONFIG[allocation.referenceType];
  const RefIcon = refConfig.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Release Reservation
          </DialogTitle>
          <DialogDescription>
            Release {allocation.quantity} units from {allocation.referenceNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Allocation info banner */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <RefIcon className={cn('h-8 w-8', refConfig.color)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={refConfig.color}>
                {refConfig.label}
              </Badge>
              <span className="font-medium">{allocation.referenceNumber}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {allocation.quantity} units
              {allocation.customerName && ` for ${allocation.customerName}`}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            Releasing this reservation will make the stock available for other orders. This action
            cannot be undone.
          </p>
        </div>

        {/* Reason selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="release-reason">Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReleaseReason)}>
              <SelectTrigger id="release-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {RELEASE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="release-notes">Notes (optional)</Label>
            <Textarea
              id="release-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this release..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || isReleasing}
          >
            {isReleasing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            Release Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ============================================================================
// ALLOCATIONS TAB
// ============================================================================

export const AllocationsTab = memo(function AllocationsTab({
  allocations,
  stockDistribution,
  isLoading,
  onReleaseAllocation,
  isReleasing,
  className,
}: AllocationsTabProps) {
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);

  const handleReleaseClick = useCallback((allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setReleaseDialogOpen(true);
  }, []);

  const handleReleaseConfirm = useCallback(
    async (reason: string, notes?: string) => {
      if (!selectedAllocation || !onReleaseAllocation) return;
      await onReleaseAllocation(selectedAllocation.id, reason, notes);
      setReleaseDialogOpen(false);
      setSelectedAllocation(null);
    },
    [selectedAllocation, onReleaseAllocation]
  );

  const formatDate = (date: Date | undefined) =>
    date
      ? new Date(date).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stock Distribution Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock Distribution</CardTitle>
          <CardDescription>Current allocation breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <StockDistributionBar distribution={stockDistribution} />
        </CardContent>
      </Card>

      {/* Allocations Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Allocations</CardTitle>
              <CardDescription>
                {allocations.length} active reservation{allocations.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-600">No Active Allocations</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All stock is currently available
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Ship Date</TableHead>
                    {onReleaseAllocation && <TableHead className="w-[100px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => {
                    const refConfig = REFERENCE_TYPE_CONFIG[allocation.referenceType];
                    const RefIcon = refConfig.icon;

                    return (
                      <TableRow key={allocation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RefIcon className={cn('h-4 w-4', refConfig.color)} aria-hidden="true" />
                            <div>
                              <Badge variant="outline" className={cn('text-xs', refConfig.color)}>
                                {refConfig.label}
                              </Badge>
                              <div className="font-medium">{allocation.referenceNumber}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {allocation.customerName ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              <span className="truncate">{allocation.customerName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {allocation.quantity}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(allocation.allocatedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {allocation.expectedShipDate ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              {formatDate(allocation.expectedShipDate)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {onReleaseAllocation && (
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleReleaseClick(allocation)}
                                    aria-label={`Release reservation for ${allocation.referenceNumber}`}
                                  >
                                    <Unlock className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Release reservation</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Release Reservation Dialog */}
      <ReleaseReservationDialog
        allocation={selectedAllocation}
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        onConfirm={handleReleaseConfirm}
        isReleasing={isReleasing}
      />
    </div>
  );
});

export default AllocationsTab;
