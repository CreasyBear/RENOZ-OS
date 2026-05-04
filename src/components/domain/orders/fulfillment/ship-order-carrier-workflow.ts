import { toCents } from '@/lib/currency';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';

export const SHIP_ORDER_SELECT_PLACEHOLDER_VALUE = '__placeholder__';

export const SHIP_ORDER_CARRIERS = [
  { value: 'australia_post', label: 'Australia Post' },
  { value: 'chemcouriers', label: 'Chemcouriers' },
  { value: 'startrack', label: 'StarTrack' },
  { value: 'tnt', label: 'TNT' },
  { value: 'dhl', label: 'DHL' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'sendle', label: 'Sendle' },
  { value: 'aramex', label: 'Aramex' },
  { value: 'toll', label: 'Toll' },
  { value: 'couriers_please', label: 'Couriers Please' },
  { value: 'other', label: 'Other' },
] as const;

export const SHIP_ORDER_CARRIER_SERVICES: Record<string, readonly string[]> = {
  australia_post: ['Express Post', 'Parcel Post', 'Express Courier'],
  chemcouriers: ['Road', 'Air', 'Express'],
  startrack: ['Express', 'Premium', 'Standard'],
  tnt: ['Express', 'Road Express', 'Economy'],
  dhl: ['Express Worldwide', 'Express Easy'],
  fedex: ['International Priority', 'International Economy'],
  sendle: ['Standard', 'Express'],
  aramex: ['Express', 'Economy'],
  toll: ['Priority', 'IPEC'],
  couriers_please: ['Standard', 'Express'],
  other: [],
};

export interface ShipOrderSuccessToast {
  title: string;
  description: string;
}

export function resolveShipOrderCarrierValue(
  values: Pick<ShipOrderFormData, 'carrier' | 'customCarrier'>
): string {
  return (
    values.carrier === 'other' ? values.customCarrier?.trim() : values.carrier?.trim()
  ) ?? '';
}

export function getShipOrderCarrierServices(carrier: string | null | undefined) {
  return carrier ? (SHIP_ORDER_CARRIER_SERVICES[carrier] ?? []) : [];
}

export function getShipOrderCarrierLabel(
  values: Pick<ShipOrderFormData, 'carrier' | 'customCarrier'>
): string {
  const resolvedCarrier = resolveShipOrderCarrierValue(values);

  if (values.carrier === 'other') return resolvedCarrier;

  return (
    SHIP_ORDER_CARRIERS.find((carrier) => carrier.value === values.carrier)?.label ??
    resolvedCarrier
  );
}

export function getShipOrderShippingCostCents(
  values: Pick<ShipOrderFormData, 'shippingCost'>
): number | undefined {
  return values.shippingCost != null &&
    typeof values.shippingCost === 'number' &&
    Number.isFinite(values.shippingCost) &&
    values.shippingCost >= 0
    ? toCents(values.shippingCost)
    : undefined;
}

export function buildShipOrderSuccessToast({
  shipNow,
  totalShipped,
  remainingUnfulfilled,
  carrierLabel,
}: {
  shipNow: boolean;
  totalShipped: number;
  remainingUnfulfilled: number;
  carrierLabel: string;
}): ShipOrderSuccessToast {
  if (remainingUnfulfilled > 0) {
    return {
      title: shipNow ? 'Shipment shipped' : 'Shipment created (pending)',
      description: `${totalShipped} unit${totalShipped !== 1 ? 's' : ''} ${shipNow ? 'shipped' : 'created'}. ${remainingUnfulfilled} unit${remainingUnfulfilled !== 1 ? 's' : ''} remaining \u2014 reopen to ship again.`,
    };
  }

  if (shipNow) {
    return {
      title: 'Shipment shipped',
      description: `${totalShipped} unit${totalShipped !== 1 ? 's' : ''} via ${carrierLabel || 'carrier'}. Inventory updated.`,
    };
  }

  return {
    title: 'Shipment created (pending)',
    description: `${totalShipped} unit${totalShipped !== 1 ? 's' : ''} ready to ship. Mark as shipped from the Fulfillment tab.`,
  };
}
