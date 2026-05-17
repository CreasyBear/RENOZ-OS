import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inventory, inventoryCostLayers } from 'drizzle/schema';
import { inventoryCostLayerCapitalizations } from 'drizzle/schema/inventory/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';
import type {
  InventoryCostLayerCostComponent,
  InventoryCostLayerRow,
} from '@/lib/schemas/inventory';
import { NotFoundError } from '@/lib/server/errors';

interface ListInventoryCostLayersInput {
  organizationId: string;
  page: number;
  pageSize: number;
  inventoryId?: string;
  hasRemaining?: boolean;
}

interface ReadInventoryCostLayersInput {
  organizationId: string;
  inventoryId: string;
}

function toInventoryCostLayerRow(
  layer: typeof inventoryCostLayers.$inferSelect,
  costComponents: InventoryCostLayerCostComponent[]
): InventoryCostLayerRow {
  const expiryDate = layer.expiryDate
    ? typeof layer.expiryDate === 'string'
      ? new Date(layer.expiryDate)
      : layer.expiryDate
    : null;
  return {
    id: layer.id,
    receivedAt: layer.receivedAt,
    quantityReceived: layer.quantityReceived,
    quantityRemaining: layer.quantityRemaining,
    unitCost: layer.unitCost,
    referenceType: layer.referenceType,
    referenceId: layer.referenceId,
    expiryDate,
    costComponents,
  };
}

async function attachCostLayerCapitalizations(
  organizationId: string,
  layers: Array<typeof inventoryCostLayers.$inferSelect>
): Promise<InventoryCostLayerRow[]> {
  if (layers.length === 0) return [];
  const layerIds = layers.map((layer) => layer.id);
  const components = await db
    .select()
    .from(inventoryCostLayerCapitalizations)
    .where(
      and(
        eq(inventoryCostLayerCapitalizations.organizationId, organizationId),
        inArray(inventoryCostLayerCapitalizations.inventoryCostLayerId, layerIds)
      )
    );
  const byLayerId = new Map<string, typeof components>();
  for (const component of components) {
    const existing = byLayerId.get(component.inventoryCostLayerId) ?? [];
    existing.push(component);
    byLayerId.set(component.inventoryCostLayerId, existing);
  }

  return layers.map((layer) => {
    const rawComponents = byLayerId.get(layer.id) ?? [];
    const costComponents: InventoryCostLayerCostComponent[] = rawComponents.map((component) => ({
      id: component.id,
      componentType:
        component.componentType === 'allocated_additional_cost'
          ? 'allocated_additional_cost'
          : 'base_unit_cost',
      costType: component.costType,
      quantityBasis: component.quantityBasis,
      amountTotal: Number(component.amountTotal),
      amountPerUnit: Number(component.amountPerUnit),
      currency: component.currency,
      exchangeRate: component.exchangeRate == null ? null : Number(component.exchangeRate),
      metadata: (component.metadata ?? null) as FlexibleJson | null,
    }));
    return toInventoryCostLayerRow(layer, costComponents);
  });
}

export async function listInventoryCostLayers({
  organizationId,
  page,
  pageSize,
  inventoryId,
  hasRemaining,
}: ListInventoryCostLayersInput) {
  const conditions = [eq(inventoryCostLayers.organizationId, organizationId)];

  if (inventoryId) {
    conditions.push(eq(inventoryCostLayers.inventoryId, inventoryId));
  }
  if (hasRemaining) {
    conditions.push(gt(inventoryCostLayers.quantityRemaining, 0));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryCostLayers)
    .where(and(...conditions));

  const total = countResult?.count ?? 0;
  const offset = (page - 1) * pageSize;
  const layers = await db
    .select()
    .from(inventoryCostLayers)
    .where(and(...conditions))
    .orderBy(asc(inventoryCostLayers.receivedAt))
    .limit(pageSize)
    .offset(offset);
  const layersWithComponents = await attachCostLayerCapitalizations(organizationId, layers);

  return {
    layers: layersWithComponents,
    total,
    page,
    limit: pageSize,
    hasMore: offset + layersWithComponents.length < total,
  };
}

export async function readInventoryCostLayers({
  organizationId,
  inventoryId,
}: ReadInventoryCostLayersInput) {
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
        eq(inventoryCostLayers.inventoryId, inventoryId)
      )
    )
    .orderBy(asc(inventoryCostLayers.receivedAt));
  const layersWithComponents = await attachCostLayerCapitalizations(organizationId, layers);

  const activeLayers = layersWithComponents.filter((layer) => layer.quantityRemaining > 0);
  const totalRemaining = activeLayers.reduce((sum, layer) => sum + layer.quantityRemaining, 0);
  const totalValue = activeLayers.reduce(
    (sum, layer) => sum + layer.quantityRemaining * Number(layer.unitCost),
    0
  );
  const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

  return {
    layers: layersWithComponents,
    summary: {
      totalLayers: layersWithComponents.length,
      activeLayers: activeLayers.length,
      depletedLayers: layersWithComponents.length - activeLayers.length,
      totalRemaining,
      totalValue,
      weightedAverageCost: weightedAvgCost,
      oldestLayerDate: layersWithComponents[0]?.receivedAt ?? null,
      newestLayerDate: layersWithComponents[layersWithComponents.length - 1]?.receivedAt ?? null,
    },
  };
}
