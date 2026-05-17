import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import type { COGSCalculationInput, COGSResult } from '@/lib/schemas/inventory';
import { inventory, inventoryCostLayers } from 'drizzle/schema';

type CostLayerRecord = typeof inventoryCostLayers.$inferSelect;

interface InventoryCogsPreviewInput
  extends Pick<COGSCalculationInput, 'inventoryId' | 'quantity' | 'simulate'> {
  organizationId: string;
}

function parseDecimal(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

export async function previewInventoryCogs({
  organizationId,
  inventoryId,
  quantity,
  simulate,
}: InventoryCogsPreviewInput): Promise<COGSResult> {
  if (!simulate) {
    throw new ValidationError(
      'Manual COGS application is disabled. Use shipment and RMA workflows to post COGS.',
      {
        simulate: ['Set simulate=true for previews; workflow mutations apply canonical COGS.'],
      }
    );
  }

  const [inv] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, inventoryId), eq(inventory.organizationId, organizationId)))
    .limit(1);

  if (!inv) {
    throw new NotFoundError('Inventory item not found', 'inventory');
  }

  const layers = await db
    .select()
    .from(inventoryCostLayers)
    .where(
      and(
        eq(inventoryCostLayers.organizationId, organizationId),
        eq(inventoryCostLayers.inventoryId, inventoryId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    )
    .orderBy(asc(inventoryCostLayers.receivedAt));

  const totalAvailable = layers.reduce((sum, layer) => sum + layer.quantityRemaining, 0);
  if (totalAvailable < quantity) {
    throw new ValidationError('Insufficient inventory for COGS calculation', {
      quantity: [`Only ${totalAvailable} available in cost layers`],
    });
  }

  let remainingQuantity = quantity;
  let totalCOGS = 0;
  const usedLayers: CostLayerRecord[] = [];
  const updatedLayers: CostLayerRecord[] = [];

  for (const layer of layers) {
    if (remainingQuantity <= 0) break;

    const quantityFromLayer = Math.min(remainingQuantity, layer.quantityRemaining);
    const layerCost = quantityFromLayer * Number(layer.unitCost);

    totalCOGS += layerCost;
    remainingQuantity -= quantityFromLayer;

    usedLayers.push({
      ...layer,
      quantityRemaining: quantityFromLayer,
    });

    updatedLayers.push({
      ...layer,
      quantityRemaining: layer.quantityRemaining - quantityFromLayer,
    });
  }

  return {
    cogs: totalCOGS,
    costLayers: usedLayers.map((layer) => ({
      ...layer,
      unitCost: parseDecimal(layer.unitCost),
    })),
    remainingLayers: updatedLayers
      .filter((layer) => layer.quantityRemaining > 0)
      .map((layer) => ({
        ...layer,
        unitCost: parseDecimal(layer.unitCost),
      })),
  };
}
