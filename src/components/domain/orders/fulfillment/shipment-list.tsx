/**
 * ShipmentList Component
 *
 * Displays shipments for an order with tracking links and status indicators.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-UI)
 */

import { memo } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useOrderShipments } from "@/hooks/orders";
import {
  useGenerateShipmentDispatchNote,
  useGenerateShipmentDeliveryNote,
  useGenerateShipmentPackingSlip,
} from "@/hooks/documents";
import { toastError, toastSuccess } from "@/hooks";
import type { ShipmentStatus } from "@/lib/schemas/orders";
import { SerialNumbersList } from "../components/serial-numbers-list";

// ============================================================================
// TYPES
// ============================================================================

export interface ShipmentListProps {
  orderId: string;
  onConfirmDelivery?: (shipmentId: string) => void;
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    color: string;
    icon: typeof Package;
  }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-blue-100 text-blue-800",
    icon: Truck,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-yellow-100 text-yellow-800",
    icon: MapPin,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  returned: {
    label: "Returned",
    color: "bg-orange-100 text-orange-800",
    icon: RotateCcw,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ShipmentList = memo(function ShipmentList({
  orderId,
  onConfirmDelivery,
  className,
}: ShipmentListProps) {
  // Fetch shipments using hook
  const { data: shipments, isLoading, error } = useOrderShipments(orderId);
  const generatePackingSlip = useGenerateShipmentPackingSlip();
  const generateDispatchNote = useGenerateShipmentDispatchNote();
  const generateDeliveryNote = useGenerateShipmentDeliveryNote();

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load shipments. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!shipments || shipments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No shipments yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {shipments.map((shipment) => {
        const status = STATUS_CONFIG[shipment.status];
        const StatusIcon = status.icon;
        const canConfirmDelivery =
          shipment.status === "in_transit" ||
          shipment.status === "out_for_delivery";
        const isGeneratingPackingSlip =
          generatePackingSlip.isPending &&
          generatePackingSlip.variables?.shipmentId === shipment.id;
        const isGeneratingDispatchNote =
          generateDispatchNote.isPending &&
          generateDispatchNote.variables?.shipmentId === shipment.id;
        const isGeneratingDeliveryNote =
          generateDeliveryNote.isPending &&
          generateDeliveryNote.variables?.shipmentId === shipment.id;

        return (
          <Card key={shipment.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  <CardTitle className="text-base">
                    {shipment.shipmentNumber}
                  </CardTitle>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <CardDescription>
                {shipment.carrier && (
                  <span className="font-medium">{shipment.carrier}</span>
                )}
                {shipment.carrierService && (
                  <span> - {shipment.carrierService}</span>
                )}
                {!shipment.carrier && "No carrier assigned"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tracking Info */}
              {shipment.trackingNumber && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tracking Number
                    </p>
                    <p className="font-mono">{shipment.trackingNumber}</p>
                  </div>
                  {shipment.trackingUrl && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(shipment.trackingUrl ?? undefined, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <>
                              Track
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Open carrier tracking page
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingPackingSlip}
                  onClick={async () => {
                    try {
                      const result = await generatePackingSlip.mutateAsync({
                        shipmentId: shipment.id,
                      });
                      toastSuccess('Packing slip generated');
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    } catch (error) {
                      toastError(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate packing slip"
                      );
                    }
                  }}
                >
                  {isGeneratingPackingSlip ? "Generating..." : "Packing Slip"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingDispatchNote || shipment.canGenerateDispatchNote === false}
                  onClick={async () => {
                    try {
                      const result = await generateDispatchNote.mutateAsync({
                        shipmentId: shipment.id,
                      });
                      toastSuccess('Dispatch note generated');
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    } catch (error) {
                      toastError(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate dispatch note"
                      );
                    }
                  }}
                >
                  {isGeneratingDispatchNote ? "Generating..." : "Dispatch Note"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingDeliveryNote || shipment.canGenerateDeliveryNote === false}
                  onClick={async () => {
                    try {
                      const result = await generateDeliveryNote.mutateAsync({
                        shipmentId: shipment.id,
                      });
                      toastSuccess('Delivery note generated');
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    } catch (error) {
                      toastError(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate delivery note"
                      );
                    }
                  }}
                >
                  {isGeneratingDeliveryNote ? "Generating..." : "Delivery Note"}
                </Button>
              </div>
              {shipment.canGenerateDispatchNote === false && shipment.dispatchNoteBlockedReason ? (
                <p className="text-xs text-muted-foreground">
                  {shipment.dispatchNoteBlockedReason}
                </p>
              ) : null}
              {shipment.canGenerateDeliveryNote === false ? (
                <p className="text-xs text-muted-foreground">
                  Delivery note becomes available after delivery is confirmed.
                </p>
              ) : null}

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                {shipment.shippedAt && (
                  <div>
                    <p className="text-muted-foreground">Shipped</p>
                    <p>{format(new Date(shipment.shippedAt), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {shipment.estimatedDeliveryAt && (
                  <div>
                    <p className="text-muted-foreground">Est. Delivery</p>
                    <p>
                      {format(
                        new Date(shipment.estimatedDeliveryAt),
                        "dd/MM/yyyy"
                      )}
                    </p>
                  </div>
                )}
                {shipment.deliveredAt && (
                  <div>
                    <p className="text-muted-foreground">Delivered</p>
                    <p>{format(new Date(shipment.deliveredAt), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="items" className="border-none">
                  <AccordionTrigger className="py-2 text-sm">
                    {shipment.items.length} item
                    {shipment.items.length !== 1 ? "s" : ""} in this shipment
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {shipment.items.map((item) => (
                        <div
                          key={item.id}
                          className="py-1 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span>Line Item #{item.orderLineItemId.slice(0, 8)}...</span>
                            <span className="font-medium">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          {item.serialNumbers && item.serialNumbers.length > 0 ? (
                            <div className="mt-1">
                              <SerialNumbersList serials={item.serialNumbers} />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Tracking Events */}
              {shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="events" className="border-none">
                    <AccordionTrigger className="py-2 text-sm">
                      Tracking History ({shipment.trackingEvents.length} events)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {[...shipment.trackingEvents]
                          .reverse()
                          .map((event, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 text-sm py-1"
                            >
                              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {event.status}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(event.timestamp),
                                      "dd/MM HH:mm"
                                    )}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-muted-foreground">
                                    {event.description}
                                  </p>
                                )}
                                {event.location && (
                                  <p className="text-xs text-muted-foreground">
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Delivery Confirmation */}
              {shipment.deliveryConfirmation && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Delivery Confirmed
                  </p>
                  {shipment.deliveryConfirmation.signedBy && (
                    <p className="text-sm text-green-700">
                      Signed by: {shipment.deliveryConfirmation.signedBy}
                    </p>
                  )}
                  {shipment.deliveryConfirmation.notes && (
                    <p className="text-sm text-green-600 mt-1">
                      {shipment.deliveryConfirmation.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {canConfirmDelivery && onConfirmDelivery && (
                <Button
                  size="sm"
                  onClick={() => onConfirmDelivery(shipment.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Delivery
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

export default ShipmentList;
