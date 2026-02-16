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

import { memo, useState, useEffect, useRef, startTransition } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
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
  /** When provided and order becomes picked, opens ShipOrderDialog (auto-open + toast action) */
  onShipOrder?: () => void;
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
  // Inline variant: always fetch when rendered (parent only renders when pickQty > 0)
  const { data, isLoading } = useAvailableSerials({
    productId,
    locationId,
    enabled: true,
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
      variant="inline"
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
  onShipOrder,
}: PickItemsDialogProps) {
  const [pickLines, setPickLines] = useState<PickLineState[]>([]);
  const [locationFilterId, setLocationFilterId] = useState<string | undefined>();
  const hasInitialized = useRef(false);

  const {
    data: orderData,
    isLoading: orderLoading,
    isRefetching,
    refetch,
  } = useOrderWithCustomer({
    orderId,
    enabled: open,
    // Disable polling while dialog is open to avoid flashing when user fills the form
    refetchInterval: false,
  });

  const { locations, isLoading: locationsLoading } = useLocations({
    autoFetch: open,
  });

  const pickMutation = usePickOrderItems();

  // Reset hasInitialized when dialog closes
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open]);

  // Initialize pick lines only when dialog first opens with order data (avoid wiping on refetch)
  useEffect(() => {
    if (!open || hasInitialized.current || !orderData?.lineItems) return;
    hasInitialized.current = true;
    startTransition(() =>
      setPickLines(
        (orderData.lineItems as OrderLineItem[]).map((item) => {
          const ordered = Number(item.quantity);
          const alreadyPicked = Number(item.qtyPicked) || 0;
          const remaining = ordered - alreadyPicked;
          const isSerialized = item.product?.isSerialized ?? false;
          const productId = item.productId;
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
      )
    );
  }, [open, orderData]);

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
        onOpenChange(false);
        onSuccess?.();
        if (onShipOrder) {
          onShipOrder();
          toastSuccess('All items picked. Ready to ship.', {
            description: 'Ship Order dialog opened. Create a shipment with carrier and tracking.',
            action: {
              label: 'Ship Order',
              onClick: () => onShipOrder(),
            },
          });
        } else {
          toastSuccess('All items picked. Ready to ship.', {
            description: 'Proceed to create a shipment.',
            action: {
              label: 'Go to Fulfillment',
              onClick: () => onSuccess?.(),
            },
          });
        }
      } else {
        toastSuccess('Items picked. Refreshing remaining items…');
        hasInitialized.current = false;
        await refetch();
      }
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
      <DialogContent className="max-w-7xl sm:max-w-7xl max-h-[90vh] min-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Pick Items
            {isRefetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
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
          <div className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">
              All items have been fully picked.
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Location filter */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {pickLines.map((line) => (
                <Card
                  key={line.lineItemId}
                  className={cn(line.remaining === 0 && 'opacity-50')}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="space-y-4">
                      {/* Product meta + qty row */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-0">
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
                        <div className="flex items-center gap-4 tabular-nums text-sm">
                          <span>Ordered: {line.ordered}</span>
                          <span
                            className={cn(
                              line.alreadyPicked >= line.ordered
                                ? 'text-green-600'
                                : line.alreadyPicked > 0
                                  ? 'text-amber-600'
                                  : ''
                            )}
                          >
                            Picked: {line.alreadyPicked}
                          </span>
                          <span>Remaining: {line.remaining}</span>
                          {line.remaining > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Pick Qty:
                              </span>
                              <Input
                                type="number"
                                min={0}
                                max={line.remaining}
                                value={line.pickQty}
                                onChange={(e) =>
                                  handlePickQtyChange(
                                    line.lineItemId,
                                    e.target.value
                                  )
                                }
                                className="w-16 text-center h-8"
                                disabled={
                                  line.isSerialized &&
                                  line.remaining > 0 &&
                                  line.productId == null
                                }
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">
                              Done
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Serial selector below each item */}
                      {line.isSerialized && line.remaining > 0 && (
                        <div className="border-t pt-4">
                          {line.productId == null ? (
                            <span className="text-sm text-amber-600">
                              Product link required for serial selection
                            </span>
                          ) : line.pickQty > 0 ? (
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Serial Numbers
                              </p>
                              <PickSerialSelector
                                productId={line.productId}
                                locationId={locationFilterId}
                                selectedSerials={line.selectedSerials}
                                onChange={(serials) =>
                                  handleSerialsChange(line.lineItemId, serials)
                                }
                                maxSelections={line.pickQty}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Enter quantity first
                            </span>
                          )}
                        </div>
                      )}
                      {!line.isSerialized && line.pickQty > 0 && (
                        <p className="text-sm text-muted-foreground">
                          No serials required
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalToPick > 0 && (
              <div className="flex items-center justify-between shrink-0">
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
