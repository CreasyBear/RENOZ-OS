import { AlertTriangle, MapPin, Package, Truck } from 'lucide-react';
import { SerialNumbersList } from '../components/serial-numbers-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';
import type { ShipOrderLineItemSelection } from './ship-order-item-selection';

export interface ShipOrderConfirmationStepProps {
  values: ShipOrderFormData;
  selectedItems: ShipOrderLineItemSelection[];
  totalQtyToShip: number;
  totalAvailableQty: number;
  remainingUnfulfilled: number;
  isPartialShipment: boolean;
  hasAddressForDisplay: boolean;
  resolvedCarrier: string;
  carrierLabel: string;
}

export function ShipOrderConfirmationStep({
  values,
  selectedItems,
  totalQtyToShip,
  totalAvailableQty,
  remainingUnfulfilled,
  isPartialShipment,
  hasAddressForDisplay,
  resolvedCarrier,
  carrierLabel,
}: ShipOrderConfirmationStepProps) {
  return (
    <div className="space-y-6">
      {isPartialShipment && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Partial shipment.</strong> Shipping {totalQtyToShip} of {totalAvailableQty}{' '}
            available unit{totalAvailableQty !== 1 ? 's' : ''}. {remainingUnfulfilled} unit
            {remainingUnfulfilled !== 1 ? 's' : ''} will remain and can be shipped separately.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base">
            Items ({totalQtyToShip} unit{totalQtyToShip !== 1 ? 's' : ''})
          </Label>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-24 text-right">Qty</TableHead>
                <TableHead className="w-40">Serials</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedItems.map((item) => (
                <TableRow key={item.lineItemId}>
                  <TableCell>
                    <p className="font-medium">{item.productName}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.selectedQty}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.selectedSerials.length > 0 ? (
                      <SerialNumbersList serials={item.selectedSerials} />
                    ) : (
                      <>&mdash;</>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasAddressForDisplay && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base">Ship To</Label>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              {values.addressName && <p className="font-medium">{values.addressName}</p>}
              {values.addressStreet1 && <p>{values.addressStreet1}</p>}
              {values.addressStreet2 && <p>{values.addressStreet2}</p>}
              <p>{[values.addressCity, values.addressState, values.addressPostcode].filter(Boolean).join(' ')}</p>
              {values.addressCountry && values.addressCountry !== 'AU' && (
                <p>{values.addressCountry}</p>
              )}
              {values.addressPhone && (
                <p className="mt-1 text-muted-foreground">{values.addressPhone}</p>
              )}
            </div>
          </div>
        </>
      )}

      {resolvedCarrier && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base">Carrier</Label>
            </div>
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">{carrierLabel}</p>
              {values.carrierService && <p>Service: {values.carrierService}</p>}
              {values.trackingNumber && (
                <p className="text-muted-foreground">Tracking: {values.trackingNumber}</p>
              )}
              {values.shippingCost != null &&
                typeof values.shippingCost === 'number' &&
                values.shippingCost > 0 && (
                  <p className="text-muted-foreground">
                    Cost: ${values.shippingCost.toFixed(2)}
                  </p>
                )}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Shipment will be created as:</span>
        <Badge variant={values.shipNow ? 'default' : 'secondary'}>
          {values.shipNow ? 'Shipped (in transit)' : 'Pending'}
        </Badge>
      </div>

      {values.notes && (
        <div className="text-sm">
          <span className="text-muted-foreground">Notes:</span> {values.notes}
        </div>
      )}
    </div>
  );
}
