/**
 * Fulfillment Dashboard Utilities
 *
 * Helper functions and constants for the fulfillment dashboard.
 */

import { Package, Truck, CheckCircle, Clock, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus, ShipmentStatus } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface FulfillmentStats {
  toPick: number;
  readyToShip: number;
  inTransit: number;
  overdue: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const POLLING_INTERVAL = 30000; // 30 seconds

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Package;
  }
> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle },
  picking: { label: 'Picking', variant: 'default', icon: Package },
  picked: { label: 'Picked', variant: 'default', icon: Package },
  partially_shipped: { label: 'Partial', variant: 'default', icon: Truck },
  shipped: { label: 'Shipped', variant: 'default', icon: Truck },
  delivered: { label: 'Delivered', variant: 'outline', icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: Clock },
};

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; color: string; icon: typeof Package }
> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-800', icon: Truck },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'bg-yellow-100 text-yellow-800',
    icon: MapPin,
  },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  returned: { label: 'Returned', color: 'bg-orange-100 text-orange-800', icon: RefreshCw },
};

// ============================================================================
// HELPERS
// ============================================================================

export function getOrderStatusBadge(status: OrderStatus) {
  const config = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function getShipmentStatusBadge(status: ShipmentStatus) {
  const config = SHIPMENT_STATUS_CONFIG[status] ?? SHIPMENT_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function isOverdue(orderDate: string | Date): boolean {
  const date = typeof orderDate === 'string' ? parseISO(orderDate) : orderDate;
  return differenceInDays(new Date(), date) > 3;
}
