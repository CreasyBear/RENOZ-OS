import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import {
  inventory,
  inventoryCostLayerCapitalizations,
  inventoryCostLayers,
} from 'drizzle/schema/inventory/inventory';

type CostLayerReferenceType = 'transfer' | 'rma' | 'purchase_order' | 'adjustment';
import { createInventoryFinanceError } from '@/lib/server/inventory-finance-mutation-contract';

type DbTransaction = TransactionExecutor;

export interface ConsumedLayerDelta {
  layerId: string;
  inventoryId: string;
  quantity: number;
  unitCost: number;
  beforeRemaining: number;
  afterRemaining: number;
}

export interface LayerConsumptionResult {
  totalCost: number;
  quantityConsumed: number;
  quantityUnfulfilled: number;
  layerDeltas: ConsumedLayerDelta[];
}

export async function consumeLayersFIFO(
  tx: DbTransaction,
  params: {
    organizationId: string;
    inventoryId: string;
    quantity: number;
  }
): Promise<LayerConsumptionResult> {
  const layers = await tx
    .select()
    .from(inventoryCostLayers)
    .where(
      and(
        eq(inventoryCostLayers.organizationId, params.organizationId),
        eq(inventoryCostLayers.inventoryId, params.inventoryId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    )
    .orderBy(asc(inventoryCostLayers.receivedAt), asc(inventoryCostLayers.id))
    .for('update');

  let remaining = params.quantity;
  let totalCost = 0;
  const layerDeltas: ConsumedLayerDelta[] = [];

  for (const layer of layers) {
    if (remaining <= 0) break;
    const consumeQty = Math.min(remaining, Number(layer.quantityRemaining));
    const before = Number(layer.quantityRemaining);
    const after = before - consumeQty;
    const unitCost = Number(layer.unitCost);

    await tx
      .update(inventoryCostLayers)
      .set({ quantityRemaining: after })
      .where(eq(inventoryCostLayers.id, layer.id));

    layerDeltas.push({
      layerId: layer.id,
      inventoryId: params.inventoryId,
      quantity: consumeQty,
      unitCost,
      beforeRemaining: before,
      afterRemaining: after,
    });

    totalCost += consumeQty * unitCost;
    remaining -= consumeQty;
  }

  return {
    totalCost,
    quantityConsumed: params.quantity - remaining,
    quantityUnfulfilled: remaining,
    layerDeltas,
  };
}

export async function moveLayersBetweenInventory(
  tx: DbTransaction,
  params: {
    organizationId: string;
    sourceInventoryId: string;
    destinationInventoryId: string;
    quantity: number;
    referenceType: string;
    referenceId?: string;
    receivedAt?: Date;
  }
): Promise<LayerConsumptionResult & { createdLayerIds: string[] }> {
  const consumed = await consumeLayersFIFO(tx, {
    organizationId: params.organizationId,
    inventoryId: params.sourceInventoryId,
    quantity: params.quantity,
  });

  if (consumed.quantityUnfulfilled > 0) {
    throw createInventoryFinanceError(
      `Unable to move ${params.quantity} units. Missing ${consumed.quantityUnfulfilled} cost-layer units.`,
      'insufficient_cost_layers'
    );
  }

  const createdLayerIds: string[] = [];
  for (const delta of consumed.layerDeltas) {
    const [newLayer] = await tx
      .insert(inventoryCostLayers)
      .values({
        organizationId: params.organizationId,
        inventoryId: params.destinationInventoryId,
        receivedAt: params.receivedAt ?? new Date(),
        quantityReceived: delta.quantity,
        quantityRemaining: delta.quantity,
        unitCost: String(delta.unitCost),
        referenceType: params.referenceType as CostLayerReferenceType,
        referenceId: params.referenceId,
      })
      .returning({ id: inventoryCostLayers.id });
    createdLayerIds.push(newLayer.id);
  }

  return {
    ...consumed,
    createdLayerIds,
  };
}

export async function recomputeInventoryValueFromLayers(
  tx: DbTransaction,
  params: {
    organizationId: string;
    inventoryId: string;
    userId?: string;
    updateUnitCost?: boolean;
  }
): Promise<{ totalValue: number; weightedAverageCost: number; totalRemaining: number }> {
  const [layerTotals] = await tx
    .select({
      totalRemaining: sql<number>`COALESCE(SUM(${inventoryCostLayers.quantityRemaining}), 0)::int`,
      totalValue:
        sql<number>`COALESCE(SUM(${inventoryCostLayers.quantityRemaining} * ${inventoryCostLayers.unitCost}), 0)::numeric`,
    })
    .from(inventoryCostLayers)
    .where(
      and(
        eq(inventoryCostLayers.organizationId, params.organizationId),
        eq(inventoryCostLayers.inventoryId, params.inventoryId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    );

  const totalRemaining = Number(layerTotals?.totalRemaining ?? 0);
  const totalValue = Number(layerTotals?.totalValue ?? 0);
  const weightedAverageCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

  await tx
    .update(inventory)
    .set({
      totalValue,
      ...(params.updateUnitCost !== false && { unitCost: weightedAverageCost }),
      ...(params.userId && { updatedBy: params.userId, updatedAt: new Date() }),
    })
    .where(eq(inventory.id, params.inventoryId));

  return { totalValue, weightedAverageCost, totalRemaining };
}

export async function createReceiptLayersWithCostComponents(
  tx: DbTransaction,
  params: {
    organizationId: string;
    inventoryId: string;
    quantity: number;
    receivedAt: Date;
    unitCost: number;
    referenceType: string;
    referenceId?: string;
    purchaseOrderReceiptItemId?: string;
    currency: string;
    exchangeRate?: number | null;
    createdBy?: string;
    costComponents: Array<{
      componentType: 'base_unit_cost' | 'allocated_additional_cost';
      costType: string | null;
      amountTotal: number;
      amountPerUnit: number;
      quantityBasis: number;
      metadata?: Record<string, unknown>;
      purchaseOrderCostId?: string;
    }>;
  }
): Promise<string> {
  const [layer] = await tx
    .insert(inventoryCostLayers)
    .values({
      organizationId: params.organizationId,
      inventoryId: params.inventoryId,
      receivedAt: params.receivedAt,
      quantityReceived: params.quantity,
      quantityRemaining: params.quantity,
      unitCost: String(params.unitCost),
    referenceType: params.referenceType as CostLayerReferenceType,
    referenceId: params.referenceId,
  })
  .returning({ id: inventoryCostLayers.id });

  // Compatibility guard during migration rollout: skip insert if table not yet present.
  try {
    for (const component of params.costComponents) {
      await tx.insert(inventoryCostLayerCapitalizations).values({
        organizationId: params.organizationId,
        inventoryCostLayerId: layer.id,
        purchaseOrderReceiptItemId: params.purchaseOrderReceiptItemId,
        purchaseOrderCostId: component.purchaseOrderCostId,
        componentType: component.componentType,
        costType: component.costType,
        quantityBasis: component.quantityBasis,
        amountTotal: String(component.amountTotal),
        amountPerUnit: String(component.amountPerUnit),
        currency: params.currency,
        exchangeRate: params.exchangeRate != null ? String(params.exchangeRate) : null,
        metadata: component.metadata ?? {},
        createdBy: params.createdBy,
      });
    }
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = (error as { message?: string })?.message ?? '';
    const isMissing = code === '42P01' || code === '42703' || message.includes('does not exist');
    if (!isMissing) {
      throw error;
    }
  }

  return layer.id;
}

export async function assertSerializedInventoryCostIntegrity(
  tx: DbTransaction,
  params: {
    organizationId: string;
    inventoryId: string;
    serialNumber: string;
    expectedQuantityOnHand?: 0 | 1;
  }
): Promise<{
  quantityOnHand: number;
  activeLayerQuantity: number;
  activeLayerValue: number;
}> {
  const [inv] = await tx
    .select({
      quantityOnHand: inventory.quantityOnHand,
      serialNumber: inventory.serialNumber,
    })
    .from(inventory)
    .where(
      and(
        eq(inventory.organizationId, params.organizationId),
        eq(inventory.id, params.inventoryId)
      )
    )
    .limit(1);

  if (!inv) {
    throw createInventoryFinanceError(
      `Serialized inventory row ${params.inventoryId} was not found`,
      'serialized_unit_violation'
    );
  }

  const normalizedRowSerial = (inv.serialNumber ?? '').trim().toUpperCase();
  const normalizedExpectedSerial = params.serialNumber.trim().toUpperCase();
  if (!inv.serialNumber || normalizedRowSerial !== normalizedExpectedSerial) {
    throw createInventoryFinanceError(
      `Serialized row ${params.inventoryId} is not bound to serial ${normalizedExpectedSerial}`,
      'serialized_unit_violation'
    );
  }

  const quantityOnHand = Number(inv.quantityOnHand ?? 0);
  if (quantityOnHand < 0 || quantityOnHand > 1) {
    throw createInventoryFinanceError(
      `Serialized serial ${normalizedExpectedSerial} has invalid on-hand quantity ${quantityOnHand}`,
      'serialized_unit_violation'
    );
  }
  if (
    params.expectedQuantityOnHand !== undefined &&
    quantityOnHand !== params.expectedQuantityOnHand
  ) {
    throw createInventoryFinanceError(
      `Serialized serial ${normalizedExpectedSerial} expected on-hand ${params.expectedQuantityOnHand} but found ${quantityOnHand}`,
      'serialized_unit_violation'
    );
  }

  const [layerTotals] = await tx
    .select({
      activeLayerQuantity:
        sql<number>`COALESCE(SUM(${inventoryCostLayers.quantityRemaining}), 0)::int`,
      activeLayerValue:
        sql<number>`COALESCE(SUM(${inventoryCostLayers.quantityRemaining} * ${inventoryCostLayers.unitCost}), 0)::numeric`,
    })
    .from(inventoryCostLayers)
    .where(
      and(
        eq(inventoryCostLayers.organizationId, params.organizationId),
        eq(inventoryCostLayers.inventoryId, params.inventoryId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    );

  const activeLayerQuantity = Number(layerTotals?.activeLayerQuantity ?? 0);
  const activeLayerValue = Number(layerTotals?.activeLayerValue ?? 0);
  if (activeLayerQuantity < 0 || activeLayerQuantity > 1) {
    throw createInventoryFinanceError(
      `Serialized serial ${normalizedExpectedSerial} has invalid active layer quantity ${activeLayerQuantity}`,
      'serialized_unit_violation'
    );
  }

  if (quantityOnHand === 1 && activeLayerQuantity !== 1) {
    throw createInventoryFinanceError(
      `Serialized serial ${normalizedExpectedSerial} is in stock without exactly one active cost layer`,
      'insufficient_cost_layers'
    );
  }
  if (quantityOnHand === 0 && activeLayerQuantity !== 0) {
    throw createInventoryFinanceError(
      `Serialized serial ${normalizedExpectedSerial} has residual cost layer quantity after depletion`,
      'layer_transfer_mismatch'
    );
  }

  return {
    quantityOnHand,
    activeLayerQuantity,
    activeLayerValue,
  };
}
