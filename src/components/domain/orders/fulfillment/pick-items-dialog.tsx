/**
 * PickItemsDialog Component
 *
 * Dialog for picking order items with serial number tracking for serialized products.
 * Supports multi-round picking (quantities are additive).
 *
 * @source orderData from useOrderWithCustomer hook
 * @source availableSerials from useAvailableSerials hook
 * @source pickMutation from usePickOrderItems hook
 */

import { memo, useState, useEffect, startTransition } from 'react';
import { PackageCheck, Loader2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import { useOrderWithCustomer } from '@/hooks/orders/use-order-detail';
import { usePickOrderItems } from '@/hooks/orders/use-picking';
import { useAvailableSerials, useLocations } from '@/hooks/inventory';
import { SerialPicker } from './serial-picker';

// ============================================================================
// TYPES
// ============================================================================

export interface PickItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

interface OrderLineItem {
  id: string;
  productId: string | null;
  product: { name: string; sku: string | null; isSerialized?: boolean | null } | null;
  description: string;
  sku: string | null;
  quantity: number;
  qtyPicked: number | null;
}

interface PickLineState {
  lineItemId: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  isSerialized: boolean;
  ordered: number;
  alreadyPicked: number;
  remaining: number;
  pickQty: number;
  selectedSerials: string[];
}

// ============================================================================
// PICK SERIAL SELECTOR (uses SerialPicker + useAvailableSerials)
// ============================================================================

const PickSerialSelector = memo(function PickSerialSelector({
  productId,
  locationId,
  selectedSerials,
  onChange,
  maxSelections,
  disabled,
}: {
  productId: string;
  locationId?: string;
  selectedSerials: string[];
  onChange: (serials: string[]) => void;
  maxSelections: number;
  disabled?: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data, isLoading } = useAvailableSerials({
    productId,
    locationId,
    enabled: popoverOpen || selectedSerials.length > 0,
  });

  const options = (data?.availableSerials ?? []).map((s) => ({
    serialNumber: s.serialNumber,
    locationName: s.locationName ?? undefined,
    receivedAt: s.receivedAt ?? undefined,
  }));

  return (
    <SerialPicker
      options={options}
      selectedSerials={selectedSerials}
      onChange={onChange}
      maxSelections={maxSelections}
      disabled={disabled}
      isLoading={isLoading}
      ariaLabel="Select serial numbers from inventory"
      onOpenChange={setPopoverOpen}
      scanMode
    />
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PickItemsDialog = memo(function PickItemsDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: PickItemsDialogProps) {
  const [pickLines, setPickLines] = useState<PickLineState[]>([]);
  const [locationFilterId, setLocationFilterId] = useState<string | undefined>();

  const { data: orderData, isLoading: orderLoading } = useOrderWithCustomer({
    orderId,
    enabled: open,
  });

  const { locations, isLoading: locationsLoading } = useLocations({
    autoFetch: open,
  });

  const pickMutation = usePickOrderItems();

  // Initialize pick lines when order loads
  useEffect(() => {
    if (orderData?.lineItems) {
      startTransition(() => setPickLines(
        (orderData.lineItems as OrderLineItem[]).map((item) => {
          const ordered = Number(item.quantity);
          const alreadyPicked = Number(item.qtyPicked) || 0;
          const remaining = ordered - alreadyPicked;
          const isSerialized = item.product?.isSerialized ?? false;
          const productId = item.productId;
          // Serialized lines without product cannot be picked
          const canPick = remaining > 0 && (!isSerialized || productId != null);
          return {
            lineItemId: item.id,
            productId,
            productName: item.product?.name ?? item.description,
            sku: item.sku,
            isSerialized,
            ordered,
            alreadyPicked,
            remaining,
            pickQty: canPick ? remaining : 0,
            selectedSerials: [],
          };
        })
      ));
    }
  }, [orderData]);

  const handlePickQtyChange = (lineItemId: string, value: string) => {
    const num = parseInt(value, 10);
    setPickLines((prev) =>
      prev.map((line) => {
        if (line.lineItemId !== lineItemId) return line;
        const qty = isNaN(num) ? 0 : Math.max(0, Math.min(line.remaining, num));
        // Reset serials if quantity changes
        return { ...line, pickQty: qty, selectedSerials: [] };
      })
    );
  };

  const handleSerialsChange = (lineItemId: string, serials: string[]) => {
    setPickLines((prev) =>
      prev.map((line) =>
        line.lineItemId === lineItemId ? { ...line, selectedSerials: serials } : line
      )
    );
  };

  const validateSubmission = (): string | null => {
    const itemsToPick = pickLines.filter((line) => line.pickQty > 0);

    if (itemsToPick.length === 0) {
      return 'Please enter a quantity for at least one item';
    }

    for (const line of itemsToPick) {
      if (line.isSerialized) {
        if (line.productId == null) {
          return `Product link required for serial selection on "${line.productName}"`;
        }
        if (line.selectedSerials.length === 0) {
          return `Serial numbers required for "${line.productName}"`;
        }
        if (line.selectedSerials.length !== line.pickQty) {
          return `Select exactly ${line.pickQty} serial number${line.pickQty !== 1 ? 's' : ''} for "${line.productName}"`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateSubmission();
    if (error) {
      toastError(error);
      return;
    }

    const itemsToPick = pickLines.filter((line) => line.pickQty > 0);

    try {
      const result = await pickMutation.mutateAsync({
        orderId,
        items: itemsToPick.map((line) => ({
          lineItemId: line.lineItemId,
          qtyPicked: line.pickQty,
          serialNumbers: line.selectedSerials.length > 0 ? line.selectedSerials : undefined,
        })),
      });

      if (result.orderStatus === 'picked') {
        toastSuccess('All items picked. Ready to ship.', {
          description: 'Proceed to create a shipment.',
          action: {
            label: 'Go to Fulfillment',
            onClick: () => onSuccess?.(),
          },
        });
      } else {
        toastSuccess('Items picked. Continue picking remaining items.');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : 'Failed to pick items'
      );
    }
  };

  const totalToPick = pickLines.reduce((sum, line) => sum + line.pickQty, 0);
  const hasPickableItems = pickLines.some((line) => line.remaining > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Pick Items
          </DialogTitle>
          <DialogDescription>
            Enter quantities to pick. Serialized products require serial number selection from inventory.
          </DialogDescription>
        </DialogHeader>

        {orderLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasPickableItems ? (
          <div className="py-8 text-center text-muted-foreground">
            All items have been fully picked.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Location filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={locationFilterId ?? 'all'}
                onValueChange={(v) =>
                  setLocationFilterId(v === 'all' ? undefined : v)
                }
                disabled={locationsLoading}
              >
                <SelectTrigger className="w-[200px] h-9">
                  {locationsLoading ? (
                    <span className="text-muted-foreground">
                      Loading locations...
                    </span>
                  ) : (
                    <SelectValue placeholder="All locations" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {!locationsLoading && locations.length === 0 && (
                    <SelectItem value="_empty" disabled>
                      No locations
                    </SelectItem>
                  )}
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locationFilterId && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => setLocationFilterId(undefined)}
                >
                  {locations.find((l) => l.id === locationFilterId)?.name ?? 'Location'}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center w-16">Ordered</TableHead>
                    <TableHead className="text-center w-16">Picked</TableHead>
                    <TableHead className="text-center w-16">Remaining</TableHead>
                    <TableHead className="text-center w-20">Pick Qty</TableHead>
                    <TableHead className="w-72">Serial Numbers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickLines.map((line) => (
                    <TableRow
                      key={line.lineItemId}
                      className={cn(line.remaining === 0 && 'opacity-50')}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.productName}</p>
                          {line.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {line.sku}
                            </p>
                          )}
                          {line.isSerialized && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Serialized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {line.ordered}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-center tabular-nums',
                          line.alreadyPicked >= line.ordered
                            ? 'text-green-600'
                            : line.alreadyPicked > 0
                              ? 'text-amber-600'
                              : ''
                        )}
                      >
                        {line.alreadyPicked}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {line.remaining}
                      </TableCell>
                      <TableCell>
                        {line.remaining > 0 ? (
                          <Input
                            type="number"
                            min={0}
                            max={line.remaining}
                            value={line.pickQty}
                            onChange={(e) =>
                              handlePickQtyChange(line.lineItemId, e.target.value)
                            }
                            className="w-16 text-center h-8"
                            disabled={
                              line.isSerialized &&
                              line.remaining > 0 &&
                              line.productId == null
                            }
                          />
                        ) : (
                          <span className="text-xs text-green-600 font-medium">
                            Done
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {line.isSerialized && line.remaining > 0 ? (
                          line.productId == null ? (
                            <span className="text-sm text-amber-600">
                              Product link required for serial selection
                            </span>
                          ) : line.pickQty > 0 ? (
                            <PickSerialSelector
                              productId={line.productId}
                              locationId={locationFilterId}
                              selectedSerials={line.selectedSerials}
                              onChange={(serials) =>
                                handleSerialsChange(line.lineItemId, serials)
                              }
                              maxSelections={line.pickQty}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Enter quantity first
                            </span>
                          )
                        ) : line.pickQty > 0 ? (
                          <span className="text-sm text-muted-foreground">
                            No serials required
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalToPick > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {totalToPick} unit{totalToPick !== 1 ? 's' : ''} to pick
                </p>
                <p className="text-xs text-muted-foreground">
                  Serialized items require serial number selection
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pickMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pickMutation.isPending || totalToPick === 0}
          >
            {pickMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Picking...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Pick {totalToPick} Item{totalToPick !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default PickItemsDialog;
