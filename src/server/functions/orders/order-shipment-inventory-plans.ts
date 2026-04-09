import { ValidationError } from '@/lib/server/errors';

export interface InventoryConsumptionCandidate {
  id: string;
  quantityOnHand: number | null | undefined;
  quantityAllocated: number | null | undefined;
}

export interface InventoryConsumptionStep {
  inventoryId: string;
  quantity: number;
  quantityOnHand: number;
  quantityAllocated: number;
}

export interface InventoryRestorationMovement {
  id: string;
  inventoryId: string;
  quantity: number | null | undefined;
}

export interface InventoryRestorationStep {
  movementId: string;
  inventoryId: string;
  quantity: number;
}

export function planInventoryConsumption(
  rows: InventoryConsumptionCandidate[],
  quantity: number,
  itemLabel: string
): InventoryConsumptionStep[] {
  let remaining = quantity;
  const plan: InventoryConsumptionStep[] = [];

  for (const row of rows) {
    if (remaining <= 0) break;

    const quantityOnHand = Number(row.quantityOnHand ?? 0);
    if (quantityOnHand <= 0) continue;

    const quantityAllocated = Number(row.quantityAllocated ?? 0);
    const consumeQuantity = Math.min(remaining, quantityOnHand);

    plan.push({
      inventoryId: row.id,
      quantity: consumeQuantity,
      quantityOnHand,
      quantityAllocated,
    });

    remaining -= consumeQuantity;
  }

  if (remaining > 0) {
    throw new ValidationError('Insufficient inventory to complete shipment', {
      inventory: [
        `Only ${quantity - remaining} unit${quantity - remaining !== 1 ? 's are' : ' is'} available to ship for "${itemLabel}".`,
      ],
    });
  }

  return plan;
}

export function planInventoryRestoration(
  movements: InventoryRestorationMovement[],
  quantity: number,
  itemLabel: string
): InventoryRestorationStep[] {
  let remaining = quantity;
  const plan: InventoryRestorationStep[] = [];

  for (const movement of movements) {
    if (remaining <= 0) break;

    const shippedQuantity = Math.abs(Number(movement.quantity ?? 0));
    if (shippedQuantity <= 0) continue;

    const restoreQuantity = Math.min(remaining, shippedQuantity);
    plan.push({
      movementId: movement.id,
      inventoryId: movement.inventoryId,
      quantity: restoreQuantity,
    });

    remaining -= restoreQuantity;
  }

  if (remaining > 0) {
    throw new ValidationError('Shipment inventory history is incomplete', {
      inventory: [
        `Could not restore ${remaining} unit${remaining !== 1 ? 's' : ''} for "${itemLabel}" because the shipment inventory movements are incomplete.`,
      ],
    });
  }

  return plan;
}
