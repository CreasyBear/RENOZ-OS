import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { db, type TransactionExecutor } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import {
  createSerializedMutationError,
} from '@/lib/server/serialized-mutation-contract';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { normalizeSerial } from '@/lib/serials';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  returnAuthorizations,
  rmaLineItems,
  isValidRmaTransition,
} from 'drizzle/schema/support/return-authorizations';
import { issues } from 'drizzle/schema/support/issues';
import { orderLineItems, orders } from 'drizzle/schema/orders';
import {
  inventory,
  inventoryMovements,
} from 'drizzle/schema/inventory/inventory';
import { warehouseLocations } from 'drizzle/schema/inventory/warehouse-locations';
import { products } from 'drizzle/schema/products/products';
import { activities } from 'drizzle/schema/activities';
import type {
  ProcessRmaInput,
  ReceiveRmaInput,
  RmaProcessResult,
  RmaResponse,
} from '@/lib/schemas/support/rma';
import { executeRmaRemedy } from './rma-remedy-execution';
import {
  buildBlockedRmaExecutionState,
  buildCompletedRmaExecutionState,
  buildPendingRmaExecutionState,
} from './rma-execution-state';
import {
  rmaReadModel,
  type RmaRow,
} from './rma-read-model';
import { getRmaReceiveLineSerializationRequirement } from '../order-rma-serialization';
import { formatRmaRemedyBlockedReason } from '../rma-result-messages';

export interface ExecuteReceiveRmaResult {
  response: RmaResponse;
  affectedInventoryIds: string[];
  affectedProductIds: string[];
  touchesSerializedInventory: boolean;
}

async function getIssueExecutionLink(
  organizationId: string,
  issueId: string | null
): Promise<{ id: string; status: string } | null> {
  if (!issueId) return null;

  const [issue] = await db
    .select({ id: issues.id, status: issues.status })
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.organizationId, organizationId)))
    .limit(1);

  return issue ?? null;
}

export async function executeReceiveRma({
  ctx,
  data,
}: {
  ctx: SessionContext;
  data: ReceiveRmaInput;
}): Promise<ExecuteReceiveRmaResult> {
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    const affectedInventoryIds = new Set<string>();
    const affectedProductIds = new Set<string>();
    let touchesSerializedInventory = false;

    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );
    const [existing] = await tx
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.id, data.rmaId),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('RMA not found', 'rma');
    }

    if (!isValidRmaTransition(existing.status, 'received')) {
      throw createSerializedMutationError(
        `Cannot receive RMA in ${existing.status} status. Must be in 'approved' status.`,
        'transition_blocked'
      );
    }

    const inspectionNotes = data.inspectionNotes
      ? {
          ...data.inspectionNotes,
          inspectedAt: now,
          inspectedBy: ctx.user.id,
        }
      : {
          inspectedAt: now,
          inspectedBy: ctx.user.id,
        };

    const [updated] = await tx
      .update(returnAuthorizations)
      .set({
        status: 'received',
        receivedAt: now,
        receivedBy: ctx.user.id,
        ...buildPendingRmaExecutionState(),
        inspectionNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, data.rmaId))
      .returning();

    const lineItemsWithProduct = await tx
      .select({
        rmaLineItem: rmaLineItems,
        productId: orderLineItems.productId,
        description: orderLineItems.description,
        isSerialized: products.isSerialized,
        costPrice: products.costPrice,
      })
      .from(rmaLineItems)
      .leftJoin(
        orderLineItems,
        and(
          eq(rmaLineItems.orderLineItemId, orderLineItems.id),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      )
      .leftJoin(
        products,
        and(
          eq(orderLineItems.productId, products.id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .where(eq(rmaLineItems.rmaId, data.rmaId))
      .then((rows) =>
        rows.map((r) => {
          const productSerialization =
            typeof r.isSerialized === 'boolean' ? { isSerialized: r.isSerialized } : null;

          return {
            ...r,
            isSerialized: getRmaReceiveLineSerializationRequirement(
              {
                id: r.rmaLineItem.id,
                productId: r.productId,
                description: r.description ?? r.rmaLineItem.id,
              },
              productSerialization
            ),
          };
        })
      );

    const requestedLocationRows = await tx
      .select({ id: warehouseLocations.id, name: warehouseLocations.name })
      .from(warehouseLocations)
      .where(
        data.locationId
          ? and(
              eq(warehouseLocations.organizationId, ctx.organizationId),
              eq(warehouseLocations.id, data.locationId)
            )
          : and(
              eq(warehouseLocations.organizationId, ctx.organizationId),
              eq(warehouseLocations.isActive, true)
            )
      )
      .limit(data.locationId ? 1 : 2);

    const receivingLocation =
      data.locationId
        ? requestedLocationRows[0]
        : requestedLocationRows.length === 1
          ? requestedLocationRows[0]
          : null;

    if (!receivingLocation?.id && lineItemsWithProduct.length > 0) {
      throw new ValidationError(
        data.locationId
          ? 'Selected receiving location was not found. Choose a valid warehouse location before receiving returns.'
          : 'Receiving location is required when more than one active warehouse location exists.'
      );
    }

    const receivingLocationId = receivingLocation?.id ?? null;

    const inspectionCondition = data.inspectionNotes?.condition;
    const targetStatus =
      inspectionCondition === 'damaged' ||
      inspectionCondition === 'defective' ||
      inspectionCondition === 'missing_parts'
        ? 'quarantined'
        : 'available';

    let unitsRestored = 0;

    for (const row of lineItemsWithProduct) {
      const { rmaLineItem, productId, isSerialized, costPrice } = row;
      const qty = Number(rmaLineItem.quantityReturned ?? 1);
      const unitCost = Number(costPrice ?? 0);

      if (!productId) {
        throw new ValidationError('RMA line item must be linked to a product', {
          [rmaLineItem.id]: [
            'RMA line item is not linked to a product. Repair the source order line before receiving this RMA.',
          ],
        });
      }
      affectedProductIds.add(productId);

      unitsRestored += qty;

      if (isSerialized) {
        touchesSerializedInventory = true;
        const serialNumber = rmaLineItem.serialNumber ? normalizeSerial(rmaLineItem.serialNumber) : null;
        if (!serialNumber?.trim()) {
          throw new ValidationError(
            `Serial number required for serialized product. RMA line item ${rmaLineItem.id}.`
          );
        }

        const [invRow] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.productId, productId),
              eq(inventory.serialNumber, serialNumber)
            )
          )
          .for('update')
          .limit(1);

        if (!invRow) {
          throw new ValidationError(
            `Serial "${serialNumber}" not found in inventory for this product. Cannot restore.`
          );
        }

        const prevQty = Number(invRow.quantityOnHand ?? 0);
        const newQty = prevQty + qty;
        if (newQty > 1) {
          throw createSerializedMutationError(
            `Serialized serial ${serialNumber} would exceed single-unit bounds on return.`,
            'invalid_serial_state'
          );
        }

        await tx
          .update(inventory)
          .set({
            quantityOnHand: newQty,
            status: targetStatus,
            unitCost,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, invRow.id));
        affectedInventoryIds.add(invRow.id);

        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            organizationId: ctx.organizationId,
            inventoryId: invRow.id,
            productId,
            locationId: invRow.locationId,
            movementType: 'return',
            quantity: qty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            unitCost: unitCost,
            totalCost: unitCost * qty,
            referenceType: 'rma',
            referenceId: data.rmaId,
            metadata: { rmaId: data.rmaId },
            notes: `Returned via RMA ${existing.rmaNumber}`,
            createdBy: ctx.user.id,
          })
          .returning();

        await createReceiptLayersWithCostComponents(tx, {
          organizationId: ctx.organizationId,
          inventoryId: invRow.id,
          quantity: qty,
          receivedAt: new Date(),
          unitCost,
          referenceType: 'rma',
          referenceId: data.rmaId,
          currency: 'AUD',
          createdBy: ctx.user.id,
          costComponents: [
            {
              componentType: 'base_unit_cost',
              costType: 'rma_return',
              amountTotal: unitCost * qty,
              amountPerUnit: unitCost,
              quantityBasis: qty,
              metadata: { source: 'rma_receive' },
            },
          ],
        });
        await recomputeInventoryValueFromLayers(tx, {
          organizationId: ctx.organizationId,
          inventoryId: invRow.id,
          userId: ctx.user.id,
        });

        const serializedStatus = targetStatus === 'quarantined' ? 'quarantined' : 'available';
        const serializedItemId = await upsertSerializedItemForInventory(tx, {
          organizationId: ctx.organizationId,
          productId,
          serialNumber,
          inventoryId: invRow.id,
          status: serializedStatus,
          userId: ctx.user.id,
        });

        if (serializedItemId) {
          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId,
            eventType: 'rma_received',
            entityType: 'rma_line_item',
            entityId: rmaLineItem.id,
            notes: `Returned via RMA ${existing.rmaNumber}`,
            userId: ctx.user.id,
          });
        }

        const [activityExists] = await tx
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              eq(activities.organizationId, ctx.organizationId),
              isNotNull(activities.metadata),
              sql`${activities.metadata}->>'movementId' = ${movement.id}`
            )
          )
          .limit(1);

        if (!activityExists) {
          await tx.insert(activities).values({
            organizationId: ctx.organizationId,
            userId: ctx.user.id,
            entityType: 'inventory',
            entityId: invRow.id,
            action: 'updated',
            description: `Inventory returned (${qty} units) via RMA ${existing.rmaNumber}`,
            metadata: {
              movementId: movement.id,
              movementType: 'return',
              productId,
              locationId: invRow.locationId,
              quantity: qty,
              unitCost: unitCost,
              referenceType: 'rma',
              referenceId: data.rmaId,
            },
            createdBy: ctx.user.id,
          });
        }
      } else {
        if (!receivingLocationId) {
          throw new ValidationError('Receiving location is required before restoring inventory.');
        }

        const locationId = receivingLocationId;
        const [existingInv] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.productId, productId),
              eq(inventory.locationId, locationId),
              eq(inventory.status, targetStatus),
              isNull(inventory.serialNumber)
            )
          )
          .for('update')
          .limit(1);

        let invId: string;
        let invLocationId: string;
        let prevQty: number;

        if (existingInv) {
          invId = existingInv.id;
          invLocationId = existingInv.locationId;
          prevQty = Number(existingInv.quantityOnHand ?? 0);
          const newQty = prevQty + qty;
          const newUnitCost = unitCost > 0 ? unitCost : Number(existingInv.unitCost ?? 0);

          await tx
            .update(inventory)
            .set({
              quantityOnHand: newQty,
              unitCost: newUnitCost,
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(eq(inventory.id, existingInv.id));
        } else {
          const [newInv] = await tx
            .insert(inventory)
            .values({
              organizationId: ctx.organizationId,
              productId,
              locationId,
              status: targetStatus,
              quantityOnHand: qty,
              quantityAllocated: 0,
              unitCost: unitCost,
              totalValue: 0,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            })
            .returning();
          invId = newInv.id;
          invLocationId = locationId;
          prevQty = 0;
        }
        affectedInventoryIds.add(invId);

        const newQty = prevQty + qty;

        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            organizationId: ctx.organizationId,
            inventoryId: invId,
            productId,
            locationId: invLocationId,
            movementType: 'return',
            quantity: qty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            unitCost: unitCost,
            totalCost: unitCost * qty,
            referenceType: 'rma',
            referenceId: data.rmaId,
            metadata: { rmaId: data.rmaId },
            notes: `Returned via RMA ${existing.rmaNumber}`,
            createdBy: ctx.user.id,
          })
          .returning();

        await createReceiptLayersWithCostComponents(tx, {
          organizationId: ctx.organizationId,
          inventoryId: invId,
          quantity: qty,
          receivedAt: new Date(),
          unitCost,
          referenceType: 'rma',
          referenceId: data.rmaId,
          currency: 'AUD',
          createdBy: ctx.user.id,
          costComponents: [
            {
              componentType: 'base_unit_cost',
              costType: 'rma_return',
              amountTotal: unitCost * qty,
              amountPerUnit: unitCost,
              quantityBasis: qty,
              metadata: { source: 'rma_receive' },
            },
          ],
        });
        await recomputeInventoryValueFromLayers(tx, {
          organizationId: ctx.organizationId,
          inventoryId: invId,
          userId: ctx.user.id,
        });

        const [activityExists] = await tx
          .select({ id: activities.id })
          .from(activities)
          .where(
            and(
              eq(activities.organizationId, ctx.organizationId),
              isNotNull(activities.metadata),
              sql`${activities.metadata}->>'movementId' = ${movement.id}`
            )
          )
          .limit(1);

        if (!activityExists) {
          await tx.insert(activities).values({
            organizationId: ctx.organizationId,
            userId: ctx.user.id,
            entityType: 'inventory',
            entityId: invId,
            action: prevQty === 0 ? 'created' : 'updated',
            description: `Inventory returned (${qty} units) via RMA ${existing.rmaNumber}`,
            metadata: {
              movementId: movement.id,
              movementType: 'return',
              productId,
              locationId: invLocationId,
              quantity: qty,
              unitCost: unitCost,
              referenceType: 'rma',
              referenceId: data.rmaId,
            },
            createdBy: ctx.user.id,
          });
        }
      }
    }

    const response = await rmaReadModel.loadOne({
      executor: tx as unknown as TransactionExecutor,
      organizationId: ctx.organizationId,
      rma: updated as RmaRow,
      profile: 'summary',
    });
    response.unitsRestored = unitsRestored;
    return {
      response,
      affectedInventoryIds: Array.from(affectedInventoryIds),
      affectedProductIds: Array.from(affectedProductIds),
      touchesSerializedInventory,
    };
  });
}

export async function executeProcessRma({
  ctx,
  data,
}: {
  ctx: SessionContext;
  data: ProcessRmaInput;
}): Promise<RmaProcessResult> {
  const [existing] = await db
    .select()
    .from(returnAuthorizations)
    .where(
      and(
        eq(returnAuthorizations.id, data.rmaId),
        eq(returnAuthorizations.organizationId, ctx.organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('RMA not found', 'rma');
  }

  if (existing.status === 'processed') {
    if (existing.resolution && existing.resolution !== data.resolution) {
      throw new ValidationError(
        `This RMA was already completed as ${existing.resolution}.`
      );
    }

    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: existing,
      profile: 'summary',
    });
  }

  if (!isValidRmaTransition(existing.status, 'processed')) {
    throw new ValidationError(
      `Cannot execute remedy for an RMA in ${existing.status} status. Must be in 'received' status.`
    );
  }

  if (!existing.orderId) {
    throw new ValidationError('Source order is missing from this RMA.');
  }

  const [sourceOrder, issue] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, existing.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getIssueExecutionLink(ctx.organizationId, existing.issueId),
  ]);

  if (!sourceOrder) {
    throw new ValidationError('Source order could not be loaded for remedy execution.');
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const execution = await executeRmaRemedy({
        tx: tx as unknown as TransactionExecutor,
        ctx,
        rma: existing,
        sourceOrder,
        sourceCustomerId: existing.customerId ?? sourceOrder.customerId,
        issue: issue ? { id: issue.id, status: issue.status } : null,
        input: data,
      });

      const [updated] = await tx
        .update(returnAuthorizations)
        .set({
          ...buildCompletedRmaExecutionState({
            resolution: data.resolution,
            execution,
          }),
          updatedBy: ctx.user.id,
        })
        .where(eq(returnAuthorizations.id, data.rmaId))
        .returning();

      return rmaReadModel.loadOne({
        executor: tx as unknown as TransactionExecutor,
        organizationId: ctx.organizationId,
        rma: updated as RmaRow,
        profile: 'summary',
      });
    });
  } catch (error) {
    const message = formatRmaRemedyBlockedReason(error);
    const [blocked] = await db
      .update(returnAuthorizations)
      .set({
        ...buildBlockedRmaExecutionState({
          resolution: data.resolution,
          input: data,
          userId: ctx.user.id,
          message,
        }),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(returnAuthorizations.id, data.rmaId),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!blocked) {
      throw error;
    }

    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: blocked as RmaRow,
      profile: 'summary',
    });
  }
}

export function formatRmaProcessMutationMessage(result: RmaProcessResult): string {
  if (result.executionStatus === 'blocked') {
    return `RMA ${result.rmaNumber} remedy blocked.`;
  }

  return `RMA ${result.rmaNumber} remedy executed.`;
}
