import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recomputeInventoryValueFromLayers } from '@/server/functions/_shared/inventory-finance';
import { NotFoundError } from '@/lib/server/errors';
import type { CreateCostLayer } from '@/lib/schemas/inventory';
import { inventory, inventoryCostLayers } from 'drizzle/schema';

interface CreateManualInventoryCostLayerInput {
  organizationId: string;
  userId: string;
  data: CreateCostLayer;
}

type InventoryCostLayer = typeof inventoryCostLayers.$inferSelect;

interface CreateManualInventoryCostLayerResult {
  layer: InventoryCostLayer;
}

export async function createManualInventoryCostLayer({
  organizationId,
  userId,
  data,
}: CreateManualInventoryCostLayerInput): Promise<CreateManualInventoryCostLayerResult> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, false)`);

    const [inv] = await tx
      .select({ id: inventory.id })
      .from(inventory)
      .where(and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, organizationId)))
      .for('update')
      .limit(1);

    if (!inv) {
      throw new NotFoundError('Inventory item not found', 'inventory');
    }

    const [layer] = await tx
      .insert(inventoryCostLayers)
      .values({
        organizationId,
        inventoryId: data.inventoryId,
        receivedAt: data.receivedAt,
        quantityReceived: data.quantityReceived,
        quantityRemaining: data.quantityRemaining,
        unitCost: String(data.unitCost),
        ...(data.referenceType !== undefined && { referenceType: data.referenceType }),
        ...(data.referenceId !== undefined && { referenceId: data.referenceId }),
        ...(data.expiryDate !== undefined && { expiryDate: String(data.expiryDate) }),
      })
      .returning();

    await recomputeInventoryValueFromLayers(tx, {
      organizationId,
      inventoryId: data.inventoryId,
      userId,
    });

    return { layer };
  });
}
