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
  RotateCcw,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useOrderShipments } from "@/hooks/orders";
import { usePendingShipmentCompletion } from "@/hooks/orders/use-pending-shipment-completion";
import { useShipmentDocumentActions } from "@/hooks/orders/use-shipment-document-actions";
import type { ShipmentStatus } from "@/lib/schemas/orders";
import { PendingShipmentCompletionDialog } from "./pending-shipment-completion-dialog";
import { ShipmentCardDetails } from "./shipment-card-details";
import { ShipmentDocumentActions } from "./shipment-document-actions";

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
  const { data: shipments, isLoading, error } = useOrderShipments(orderId);
  const shipmentDocumentActions = useShipmentDocumentActions();
  const pendingShipmentCompletion = usePendingShipmentCompletion(shipments);

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
    <>
      <div className={cn("space-y-4", className)}>
      {shipments.map((shipment) => {
        const status = STATUS_CONFIG[shipment.status];
        const StatusIcon = status.icon;
        const canConfirmDelivery =
          shipment.status === "in_transit" ||
          shipment.status === "out_for_delivery";
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
              <div className="flex flex-wrap items-center gap-2">
                {shipment.status === "pending" ? (
                  <Button
                    size="sm"
                    onClick={() => pendingShipmentCompletion.open(shipment)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark Shipped
                  </Button>
                ) : null}
                <ShipmentDocumentActions
                  shipment={shipment}
                  actions={shipmentDocumentActions}
                />
              </div>

              <ShipmentCardDetails shipment={shipment} />

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

      <PendingShipmentCompletionDialog
        shipment={pendingShipmentCompletion.pendingShipment}
        form={pendingShipmentCompletion.form}
        isPending={pendingShipmentCompletion.isPending}
        onClose={pendingShipmentCompletion.close}
        onSubmit={pendingShipmentCompletion.submit}
        onFormChange={pendingShipmentCompletion.updateForm}
      />
    </>
  );
});

export default ShipmentList;
