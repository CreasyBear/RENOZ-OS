import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inventory, inventoryCostLayers } from 'drizzle/schema';

interface ReadProductCostLayersInput {
  organizationId: string;
  productId: string;
}

export async function readProductCostLayers({
  organizationId,
  productId,
}: ReadProductCostLayersInput) {
  const layers = await db
    .select({
      id: inventoryCostLayers.id,
      receivedAt: inventoryCostLayers.receivedAt,
      quantityReceived: inventoryCostLayers.quantityReceived,
      quantityRemaining: inventoryCostLayers.quantityRemaining,
      unitCost: inventoryCostLayers.unitCost,
      referenceType: inventoryCostLayers.referenceType,
      referenceId: inventoryCostLayers.referenceId,
      createdAt: inventoryCostLayers.createdAt,
    })
    .from(inventoryCostLayers)
    .innerJoin(
      inventory,
      and(
        eq(inventoryCostLayers.inventoryId, inventory.id),
        eq(inventory.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(inventoryCostLayers.organizationId, organizationId),
        eq(inventory.productId, productId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .orderBy(asc(inventoryCostLayers.receivedAt));

  const activeLayers = layers.filter((layer) => layer.quantityRemaining > 0);
  const totalRemaining = activeLayers.reduce((sum, layer) => sum + layer.quantityRemaining, 0);
  const totalValue = activeLayers.reduce(
    (sum, layer) => sum + layer.quantityRemaining * Number(layer.unitCost),
    0
  );
  const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;
  const lastPurchaseCost = layers.length > 0 ? Number(layers[layers.length - 1].unitCost) : 0;

  return {
    layers: layers.map((layer) => ({
      ...layer,
      unitCost: Number(layer.unitCost),
    })),
    summary: {
      totalLayers: layers.length,
      activeLayers: activeLayers.length,
      totalRemaining,
      totalValue,
      weightedAvgCost,
      lastPurchaseCost,
    },
  };
}
