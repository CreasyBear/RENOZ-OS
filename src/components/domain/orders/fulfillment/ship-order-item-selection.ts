import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';
import {
  getLineItemShipmentAvailability,
  summarizePendingShipmentReservations,
} from './shipment-availability';

type PendingShipmentReservationSource = Parameters<typeof summarizePendingShipmentReservations>[0][number];

export interface ShipOrderLineItemSelection {
  lineItemId: string;
  productName: string;
  sku: string | null;
  availableQty: number;
  reservedQty: number;
  pickedQty: number;
  shippedQty: number;
  selectedQty: number;
  selected: boolean;
  allocatedSerialNumbers: string[];
  selectedSerials: string[];
  isSerialized?: boolean;
  productId?: string | null;
}

export interface ShipOrderItemSelectionSummary {
  selectedItems: ShipOrderLineItemSelection[];
  totalQtyToShip: number;
  totalAvailableQty: number;
  totalReservedQty: number;
  remainingUnfulfilled: number;
  isPartialShipment: boolean;
  quantitiesChanged: boolean;
  needsConfirmation: boolean;
  totalItemsToShip: number;
}

export function createShipOrderItemSelections(
  orderData: Pick<OrderWithCustomer, 'lineItems'> | null | undefined,
  shipments: PendingShipmentReservationSource[]
): ShipOrderLineItemSelection[] {
  const pendingReservations = summarizePendingShipmentReservations(shipments);

  return (orderData?.lineItems ?? []).map((item) => {
    const { availableQty, reservedQty, availableSerialNumbers } =
      getLineItemShipmentAvailability(item, pendingReservations);
    const initialQty = Math.max(0, availableQty);

    return {
      lineItemId: item.id,
      productName: item.description,
      sku: item.sku,
      availableQty,
      reservedQty,
      pickedQty: Number(item.qtyPicked ?? 0),
      shippedQty: Number(item.qtyShipped ?? 0),
      selectedQty: initialQty,
      selected: initialQty > 0,
      allocatedSerialNumbers: availableSerialNumbers,
      selectedSerials: availableSerialNumbers.slice(0, initialQty),
      isSerialized: item.product?.isSerialized ?? false,
      productId: item.productId ?? item.product?.id ?? null,
    };
  });
}

export function summarizeShipOrderItemSelection(
  selections: ShipOrderLineItemSelection[]
): ShipOrderItemSelectionSummary {
  const selectedItems = selections.filter((item) => item.selected && item.selectedQty > 0);
  const totalQtyToShip = selectedItems.reduce((sum, item) => sum + item.selectedQty, 0);
  const totalAvailableQty = selections.reduce((sum, item) => sum + item.availableQty, 0);
  const totalReservedQty = selections.reduce((sum, item) => sum + item.reservedQty, 0);
  const remainingUnfulfilled = totalAvailableQty - totalQtyToShip;
  const isPartialShipment = remainingUnfulfilled > 0 && totalQtyToShip > 0;
  const quantitiesChanged = selections.some(
    (item) => item.availableQty > 0 && (item.selectedQty !== item.availableQty || !item.selected)
  );

  return {
    selectedItems,
    totalQtyToShip,
    totalAvailableQty,
    totalReservedQty,
    remainingUnfulfilled,
    isPartialShipment,
    quantitiesChanged,
    needsConfirmation: isPartialShipment || quantitiesChanged,
    totalItemsToShip: selectedItems.length,
  };
}

export function toggleShipOrderItemSelection(
  selections: ShipOrderLineItemSelection[],
  lineItemId: string
): ShipOrderLineItemSelection[] {
  return selections.map((item) =>
    item.lineItemId === lineItemId ? { ...item, selected: !item.selected } : item
  );
}

export function changeShipOrderItemQuantity(
  selections: ShipOrderLineItemSelection[],
  lineItemId: string,
  delta: number
): ShipOrderLineItemSelection[] {
  return selections.map((item) => {
    if (item.lineItemId !== lineItemId) return item;

    const selectedQty = Math.max(0, Math.min(item.availableQty, item.selectedQty + delta));
    const selectedSerials =
      item.isSerialized && selectedQty < item.selectedSerials.length
        ? item.selectedSerials.slice(0, selectedQty)
        : item.selectedSerials;

    return {
      ...item,
      selectedQty,
      selected: selectedQty > 0,
      selectedSerials,
    };
  });
}

export function changeShipOrderItemSerials(
  selections: ShipOrderLineItemSelection[],
  lineItemId: string,
  serials: string[]
): ShipOrderLineItemSelection[] {
  return selections.map((item) =>
    item.lineItemId === lineItemId ? { ...item, selectedSerials: serials } : item
  );
}

export function selectAllShipOrderItems(
  selections: ShipOrderLineItemSelection[]
): ShipOrderLineItemSelection[] {
  return selections.map((item) => ({
    ...item,
    selected: item.availableQty > 0,
    selectedQty: item.availableQty,
    selectedSerials:
      item.isSerialized && item.allocatedSerialNumbers.length > 0
        ? item.allocatedSerialNumbers.slice(0, item.availableQty)
        : item.selectedSerials,
  }));
}

export function getShipOrderAvailableQtyByLineItem(
  orderData: Pick<OrderWithCustomer, 'lineItems'> | null | undefined,
  shipments: PendingShipmentReservationSource[]
): Map<string, number> {
  const pendingReservations = summarizePendingShipmentReservations(shipments);
  const availableQtyByLineItem = new Map<string, number>();

  for (const item of orderData?.lineItems ?? []) {
    availableQtyByLineItem.set(
      item.id,
      getLineItemShipmentAvailability(item, pendingReservations).availableQty
    );
  }

  return availableQtyByLineItem;
}
