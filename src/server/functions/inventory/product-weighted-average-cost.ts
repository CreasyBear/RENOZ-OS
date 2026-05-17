import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/server/errors';
import { inventory, inventoryCostLayers, products } from 'drizzle/schema';

interface UpdateProductWeightedAverageCostInput {
  organizationId: string;
  productId: string;
}

interface UpdateProductWeightedAverageCostResult {
  productId: string;
  costPrice: number | null;
  updated: boolean;
}

export async function updateWeightedAverageProductCost({
  organizationId,
  productId,
}: UpdateProductWeightedAverageCostInput): Promise<UpdateProductWeightedAverageCostResult> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    )
    .limit(1);

  if (!product) {
    throw new NotFoundError('Product not found', 'product');
  }

  const layers = await db
    .select({
      quantityRemaining: inventoryCostLayers.quantityRemaining,
      unitCost: inventoryCostLayers.unitCost,
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
        eq(inventory.organizationId, organizationId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    );

  if (layers.length === 0) {
    return { productId, costPrice: null, updated: false };
  }

  const totalRemaining = layers.reduce((sum, layer) => sum + layer.quantityRemaining, 0);
  const totalValue = layers.reduce(
    (sum, layer) => sum + layer.quantityRemaining * Number(layer.unitCost),
    0
  );
  const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

  await db
    .update(products)
    .set({ costPrice: weightedAvgCost })
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    );

  return { productId, costPrice: weightedAvgCost, updated: true };
}
