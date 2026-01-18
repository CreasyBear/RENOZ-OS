/**
 * ShipOrderDialog Component
 *
 * Dialog for creating a shipment from an order with item selection.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-UI)
 */

import { memo, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { getOrderWithCustomer } from "@/lib/server/functions/orders";
import {
  createShipment,
  markShipped,
} from "@/lib/server/functions/order-shipments";

// ============================================================================
// TYPES
// ============================================================================

export interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

interface LineItemSelection {
  lineItemId: string;
  productName: string;
  sku: string | null;
  availableQty: number;
  selectedQty: number;
  selected: boolean;
}

const CARRIERS = [
  { value: "australia_post", label: "Australia Post" },
  { value: "startrack", label: "StarTrack" },
  { value: "tnt", label: "TNT" },
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "sendle", label: "Sendle" },
  { value: "aramex", label: "Aramex" },
  { value: "toll", label: "Toll" },
  { value: "couriers_please", label: "Couriers Please" },
  { value: "other", label: "Other" },
];

const CARRIER_SERVICES = {
  australia_post: ["Express Post", "Parcel Post", "Express Courier"],
  startrack: ["Express", "Premium", "Standard"],
  tnt: ["Express", "Road Express", "Economy"],
  dhl: ["Express Worldwide", "Express Easy"],
  fedex: ["International Priority", "International Economy"],
  sendle: ["Standard", "Express"],
  aramex: ["Express", "Economy"],
  toll: ["Priority", "IPEC"],
  couriers_please: ["Standard", "Express"],
  other: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ShipOrderDialog = memo(function ShipOrderDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: ShipOrderDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [carrier, setCarrier] = useState("");
  const [carrierService, setCarrierService] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [shipNow, setShipNow] = useState(true);
  const [itemSelections, setItemSelections] = useState<LineItemSelection[]>([]);

  // Fetch order with line items
  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId, "withCustomer"],
    queryFn: () => getOrderWithCustomer({ data: { id: orderId } }),
    enabled: open,
  });

  // Initialize item selections when order loads
  useEffect(() => {
    if (orderData?.lineItems) {
      setItemSelections(
        orderData.lineItems.map((item) => ({
          lineItemId: item.id,
          productName: item.description,
          sku: item.sku,
          availableQty: item.quantity - item.qtyShipped,
          selectedQty: item.quantity - item.qtyShipped,
          selected: item.quantity - item.qtyShipped > 0,
        }))
      );
    }
  }, [orderData]);

  // Create shipment mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = itemSelections.filter(
        (item) => item.selected && item.selectedQty > 0
      );

      if (selectedItems.length === 0) {
        throw new Error("Please select at least one item to ship");
      }

      // Create shipment
      const shipment = await createShipment({
        data: {
          orderId,
          carrier: carrier || undefined,
          carrierService: carrierService || undefined,
          trackingNumber: trackingNumber || undefined,
          notes: notes || undefined,
          shippingAddress: orderData?.shippingAddress
            ? {
                name: orderData.shippingAddress.contactName || orderData.customer?.name || "Recipient",
                street1: orderData.shippingAddress.street1,
                street2: orderData.shippingAddress.street2,
                city: orderData.shippingAddress.city,
                state: orderData.shippingAddress.state,
                postcode: orderData.shippingAddress.postalCode,
                country: orderData.shippingAddress.country,
                phone: orderData.shippingAddress.contactPhone,
              }
            : undefined,
          items: selectedItems.map((item) => ({
            orderLineItemId: item.lineItemId,
            quantity: item.selectedQty,
          })),
        },
      });

      // If ship now, mark as shipped
      if (shipNow && carrier) {
        await markShipped({
          data: {
            id: shipment.id,
            carrier,
            carrierService: carrierService || undefined,
            trackingNumber: trackingNumber || undefined,
          },
        });
      }

      return shipment;
    },
    onSuccess: () => {
      toastSuccess("Shipment created successfully");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setCarrier("");
      setCarrierService("");
      setTrackingNumber("");
      setNotes("");
      setShipNow(true);
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to create shipment"
      );
    },
  });

  // Handle item selection toggle
  const handleItemToggle = useCallback((lineItemId: string) => {
    setItemSelections((prev) =>
      prev.map((item) =>
        item.lineItemId === lineItemId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  }, []);

  // Handle quantity change
  const handleQtyChange = useCallback(
    (lineItemId: string, delta: number) => {
      setItemSelections((prev) =>
        prev.map((item) => {
          if (item.lineItemId !== lineItemId) return item;
          const newQty = Math.max(0, Math.min(item.availableQty, item.selectedQty + delta));
          return { ...item, selectedQty: newQty, selected: newQty > 0 };
        })
      );
    },
    []
  );

  // Select all items
  const handleSelectAll = useCallback(() => {
    setItemSelections((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.availableQty > 0,
        selectedQty: item.availableQty,
      }))
    );
  }, []);

  const services = carrier
    ? CARRIER_SERVICES[carrier as keyof typeof CARRIER_SERVICES] || []
    : [];

  const totalItemsToShip = itemSelections.filter(
    (item) => item.selected && item.selectedQty > 0
  ).length;
  const totalQtyToShip = itemSelections.reduce(
    (sum, item) => sum + (item.selected ? item.selectedQty : 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Create Shipment
          </DialogTitle>
          <DialogDescription>
            Select items to ship and enter carrier details
          </DialogDescription>
        </DialogHeader>

        {orderLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Item Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Items to Ship</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-auto py-1"
                >
                  Select All
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-24">Available</TableHead>
                      <TableHead className="text-right w-32">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSelections.map((item) => (
                      <TableRow
                        key={item.lineItemId}
                        className={cn(
                          item.availableQty === 0 && "opacity-50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() =>
                              handleItemToggle(item.lineItemId)
                            }
                            disabled={item.availableQty === 0}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.availableQty === 0 ? (
                            <Badge variant="secondary">Shipped</Badge>
                          ) : (
                            item.availableQty
                          )}
                        </TableCell>
                        <TableCell>
                          {item.availableQty > 0 && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, -1)
                                }
                                disabled={!item.selected || item.selectedQty <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.selected ? item.selectedQty : 0}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQtyChange(item.lineItemId, 1)
                                }
                                disabled={
                                  !item.selected ||
                                  item.selectedQty >= item.availableQty
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalItemsToShip > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totalItemsToShip} item{totalItemsToShip !== 1 ? "s" : ""},{" "}
                  {totalQtyToShip} unit{totalQtyToShip !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <Separator />

            {/* Carrier Details */}
            <div className="space-y-4">
              <Label className="text-base">Carrier Details</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger id="carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select
                    value={carrierService}
                    onValueChange={setCarrierService}
                    disabled={!carrier || services.length === 0}
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal shipping notes..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Ship Now Toggle */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="ship-now"
                checked={shipNow}
                onCheckedChange={(checked) => setShipNow(!!checked)}
              />
              <div>
                <Label htmlFor="ship-now" className="font-normal cursor-pointer">
                  Mark as shipped immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  If unchecked, shipment will be created in pending status
                </p>
              </div>
            </div>

            {shipNow && !carrier && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a carrier to mark as shipped
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              totalItemsToShip === 0 ||
              (shipNow && !carrier)
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {shipNow ? "Create & Ship" : "Create Shipment"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ShipOrderDialog;
