import { Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SerialPicker } from './serial-picker';
import type { ShipOrderLineItemSelection } from './ship-order-item-selection';

export interface ShipOrderItemsTableProps {
  items: ShipOrderLineItemSelection[];
  serverItemErrors: Record<string, string>;
  onItemToggle: (lineItemId: string) => void;
  onQtyChange: (lineItemId: string, delta: number) => void;
  onSerialsChange: (lineItemId: string, serials: string[]) => void;
}

function getUnavailableBadge(item: ShipOrderLineItemSelection) {
  if (item.pickedQty === 0) return 'Pick First';
  if (item.shippedQty >= item.pickedQty) return 'Shipped';
  if (item.reservedQty > 0) return 'Reserved in Draft';
  return 'Unavailable';
}

export function ShipOrderItemsTable({
  items,
  serverItemErrors,
  onItemToggle,
  onQtyChange,
  onSerialsChange,
}: ShipOrderItemsTableProps) {
  return (
    <div className="overflow-x-auto overflow-y-visible rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Product</TableHead>
            <TableHead className="w-24 text-right">Available</TableHead>
            <TableHead className="w-32 text-right">Quantity</TableHead>
            <TableHead className="w-44">Serial Numbers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const needsPickFirst =
              item.isSerialized &&
              item.allocatedSerialNumbers.length === 0 &&
              item.availableQty > 0;

            return (
              <TableRow
                key={item.lineItemId}
                className={cn((item.availableQty === 0 || needsPickFirst) && 'opacity-50')}
              >
                <TableCell>
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={() => onItemToggle(item.lineItemId)}
                    disabled={item.availableQty === 0 || needsPickFirst}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.availableQty === 0 ? (
                    <Badge variant="secondary">{getUnavailableBadge(item)}</Badge>
                  ) : (
                    <div className="space-y-1 text-right">
                      <div>{item.availableQty}</div>
                      {item.reservedQty > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {item.reservedQty} in draft
                        </p>
                      ) : null}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.availableQty > 0 && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 min-h-[44px] w-7 min-w-[44px] sm:h-7 sm:min-h-0 sm:w-7 sm:min-w-0"
                        onClick={() => onQtyChange(item.lineItemId, -1)}
                        disabled={!item.selected || item.selectedQty <= 0}
                        aria-label={`Decrease quantity for ${item.productName}`}
                      >
                        <Minus className="h-3 w-3" aria-hidden />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.selected ? item.selectedQty : 0}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 min-h-[44px] w-7 min-w-[44px] sm:h-7 sm:min-h-0 sm:w-7 sm:min-w-0"
                        onClick={() => onQtyChange(item.lineItemId, 1)}
                        disabled={!item.selected || item.selectedQty >= item.availableQty}
                        aria-label={`Increase quantity for ${item.productName}`}
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.availableQty > 0 && item.selected ? (
                    item.isSerialized && item.allocatedSerialNumbers.length > 0 ? (
                      <div className="space-y-1">
                        <SerialPicker
                          options={item.allocatedSerialNumbers.map((serialNumber) => ({
                            serialNumber,
                            locationName: undefined,
                          }))}
                          selectedSerials={item.selectedSerials}
                          onChange={(serials) => onSerialsChange(item.lineItemId, serials)}
                          maxSelections={item.selectedQty}
                          disabled={item.selectedQty <= 0}
                          ariaLabel={`Select serials for ${item.productName}`}
                        />
                        {serverItemErrors[item.lineItemId] && (
                          <p className="text-xs text-destructive" role="alert">
                            {serverItemErrors[item.lineItemId]}
                          </p>
                        )}
                      </div>
                    ) : item.isSerialized && item.allocatedSerialNumbers.length === 0 ? (
                      <p className="text-xs text-amber-600">Pick items first</p>
                    ) : (
                      <span className="text-sm text-muted-foreground">No serials required</span>
                    )
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
