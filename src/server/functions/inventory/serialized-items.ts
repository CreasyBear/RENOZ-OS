/**
 * Serialized Item Server Functions
 *
 * Canonical serialized lineage CRUD + event timeline.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeSerial } from '@/lib/serials';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  inventory,
  orderLineItems,
  orderLineSerialAllocations,
  orderShipments,
  orders,
  purchaseOrderReceiptItems,
  purchaseOrderReceipts,
  returnAuthorizations,
  rmaLineItems,
  products,
  serializedItemEvents,
  serializedItems,
  shipmentItems,
  shipmentItemSerials,
  warranties,
  warehouseLocations,
} from 'drizzle/schema';
import {
  createSerializedItemSchema,
  deleteSerializedItemSchema,
  serializedItemListQuerySchema,
  serializedMutationResultSchema,
  serializedItemParamsSchema,
  updateSerializedItemSchema,
  type SerializedItemDetailResult,
  type SerializedItemListResult,
  type SerializedMutationErrorCode,
  type SerializedMutationResult,
} from '@/lib/schemas/inventory';
import {
  addSerializedItemEvent,
  isMissingSerializedInfraError,
  releaseSerializedItemAllocation,
} from '@/server/functions/_shared/serialized-lineage';

function toSerializedInfraError(): ValidationError {
  return new ValidationError(
    'Serialized lineage infrastructure is not available yet. Apply database migrations before using serialized item CRUD.'
  );
}

function createSerializedStateError(
  message: string,
  code: SerializedMutationErrorCode
): ValidationError {
  return new ValidationError(message, { code: [code] });
}

function okMutationResult(
  message: string,
  payload: Omit<SerializedMutationResult, 'success' | 'message'> = {}
): SerializedMutationResult {
  return serializedMutationResultSchema.parse({
    success: true,
    message,
    ...payload,
  });
}

export const listSerializedItems = createServerFn({ method: 'GET' })
  .inputValidator(serializedItemListQuerySchema)
  .handler(async ({ data }): Promise<SerializedItemListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    const { page = 1, pageSize = 25, search, productId, status } = data;
    const offset = (page - 1) * pageSize;
    const statusFilters = Array.isArray(status) ? status : status ? [status] : [];

    const where = and(
      eq(serializedItems.organizationId, ctx.organizationId),
      productId ? eq(serializedItems.productId, productId) : undefined,
      statusFilters.length > 0 ? inArray(serializedItems.status, statusFilters) : undefined,
      search
        ? or(
            ilike(serializedItems.serialNumberRaw, `%${search}%`),
            ilike(serializedItems.serialNumberNormalized, `%${search}%`),
            ilike(products.name, `%${search}%`),
            ilike(products.sku, `%${search}%`)
          )
        : undefined
    );

    try {
      const [totals] = await db
        .select({ value: count() })
        .from(serializedItems)
        .leftJoin(products, eq(products.id, serializedItems.productId))
        .where(where);

      const rows = await db
        .select({
          id: serializedItems.id,
          organizationId: serializedItems.organizationId,
          productId: serializedItems.productId,
          productName: products.name,
          productSku: products.sku,
          serialNumberRaw: serializedItems.serialNumberRaw,
          serialNumberNormalized: serializedItems.serialNumberNormalized,
          status: serializedItems.status,
          currentInventoryId: serializedItems.currentInventoryId,
          inventoryLocationName: warehouseLocations.name,
          sourceReceiptItemId: serializedItems.sourceReceiptItemId,
          sourceReceiptId: purchaseOrderReceiptItems.receiptId,
          sourceReceiptNumber: purchaseOrderReceipts.receiptNumber,
          activeOrderLineItemId: sql<string | null>`(
            SELECT ${orderLineSerialAllocations.orderLineItemId}
            FROM ${orderLineSerialAllocations}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          activeOrderId: sql<string | null>`(
            SELECT ${orderLineItems.orderId}
            FROM ${orderLineSerialAllocations}
            INNER JOIN ${orderLineItems}
              ON ${orderLineSerialAllocations.orderLineItemId} = ${orderLineItems.id}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          activeOrderNumber: sql<string | null>`(
            SELECT ${orders.orderNumber}
            FROM ${orderLineSerialAllocations}
            INNER JOIN ${orderLineItems}
              ON ${orderLineSerialAllocations.orderLineItemId} = ${orderLineItems.id}
            INNER JOIN ${orders}
              ON ${orderLineItems.orderId} = ${orders.id}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          latestShipmentItemId: sql<string | null>`(
            SELECT ${shipmentItemSerials.shipmentItemId}
            FROM ${shipmentItemSerials}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestShipmentId: sql<string | null>`(
            SELECT ${shipmentItems.shipmentId}
            FROM ${shipmentItemSerials}
            INNER JOIN ${shipmentItems}
              ON ${shipmentItemSerials.shipmentItemId} = ${shipmentItems.id}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestShipmentNumber: sql<string | null>`(
            SELECT ${orderShipments.shipmentNumber}
            FROM ${shipmentItemSerials}
            INNER JOIN ${shipmentItems}
              ON ${shipmentItemSerials.shipmentItemId} = ${shipmentItems.id}
            INNER JOIN ${orderShipments}
              ON ${shipmentItems.shipmentId} = ${orderShipments.id}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestWarrantyId: sql<string | null>`(
            SELECT ${warranties.id}
            FROM ${warranties}
            WHERE ${warranties.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${warranties.productSerial})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${warranties.registrationDate} DESC
            LIMIT 1
          )`,
          latestWarrantyNumber: sql<string | null>`(
            SELECT ${warranties.warrantyNumber}
            FROM ${warranties}
            WHERE ${warranties.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${warranties.productSerial})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${warranties.registrationDate} DESC
            LIMIT 1
          )`,
          latestRmaId: sql<string | null>`(
            SELECT ${returnAuthorizations.id}
            FROM ${rmaLineItems}
            INNER JOIN ${returnAuthorizations}
              ON ${rmaLineItems.rmaId} = ${returnAuthorizations.id}
            WHERE ${returnAuthorizations.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${rmaLineItems.serialNumber})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${rmaLineItems.createdAt} DESC
            LIMIT 1
          )`,
          latestRmaNumber: sql<string | null>`(
            SELECT ${returnAuthorizations.rmaNumber}
            FROM ${rmaLineItems}
            INNER JOIN ${returnAuthorizations}
              ON ${rmaLineItems.rmaId} = ${returnAuthorizations.id}
            WHERE ${returnAuthorizations.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${rmaLineItems.serialNumber})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${rmaLineItems.createdAt} DESC
            LIMIT 1
          )`,
          createdAt: serializedItems.createdAt,
          updatedAt: serializedItems.updatedAt,
          createdBy: serializedItems.createdBy,
          updatedBy: serializedItems.updatedBy,
        })
        .from(serializedItems)
        .leftJoin(products, eq(products.id, serializedItems.productId))
        .leftJoin(inventory, eq(inventory.id, serializedItems.currentInventoryId))
        .leftJoin(warehouseLocations, eq(warehouseLocations.id, inventory.locationId))
        .leftJoin(
          purchaseOrderReceiptItems,
          eq(purchaseOrderReceiptItems.id, serializedItems.sourceReceiptItemId)
        )
        .leftJoin(
          purchaseOrderReceipts,
          eq(purchaseOrderReceipts.id, purchaseOrderReceiptItems.receiptId)
        )
        .where(where)
        .orderBy(desc(serializedItems.createdAt), asc(serializedItems.serialNumberNormalized))
        .limit(pageSize)
        .offset(offset);

      return {
        items: rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
        total: Number(totals?.value ?? 0),
        page,
        pageSize,
      };
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });

export const getSerializedItem = createServerFn({ method: 'GET' })
  .inputValidator(serializedItemParamsSchema)
  .handler(async ({ data }): Promise<SerializedItemDetailResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    try {
      const [item] = await db
        .select({
          id: serializedItems.id,
          organizationId: serializedItems.organizationId,
          productId: serializedItems.productId,
          productName: products.name,
          productSku: products.sku,
          serialNumberRaw: serializedItems.serialNumberRaw,
          serialNumberNormalized: serializedItems.serialNumberNormalized,
          status: serializedItems.status,
          currentInventoryId: serializedItems.currentInventoryId,
          inventoryLocationName: warehouseLocations.name,
          sourceReceiptItemId: serializedItems.sourceReceiptItemId,
          sourceReceiptId: purchaseOrderReceiptItems.receiptId,
          sourceReceiptNumber: purchaseOrderReceipts.receiptNumber,
          activeOrderLineItemId: sql<string | null>`(
            SELECT ${orderLineSerialAllocations.orderLineItemId}
            FROM ${orderLineSerialAllocations}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          activeOrderId: sql<string | null>`(
            SELECT ${orderLineItems.orderId}
            FROM ${orderLineSerialAllocations}
            INNER JOIN ${orderLineItems}
              ON ${orderLineSerialAllocations.orderLineItemId} = ${orderLineItems.id}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          activeOrderNumber: sql<string | null>`(
            SELECT ${orders.orderNumber}
            FROM ${orderLineSerialAllocations}
            INNER JOIN ${orderLineItems}
              ON ${orderLineSerialAllocations.orderLineItemId} = ${orderLineItems.id}
            INNER JOIN ${orders}
              ON ${orderLineItems.orderId} = ${orders.id}
            WHERE ${orderLineSerialAllocations.organizationId} = ${serializedItems.organizationId}
              AND ${orderLineSerialAllocations.serializedItemId} = ${serializedItems.id}
              AND ${orderLineSerialAllocations.isActive} = true
            ORDER BY ${orderLineSerialAllocations.allocatedAt} DESC
            LIMIT 1
          )`,
          latestShipmentItemId: sql<string | null>`(
            SELECT ${shipmentItemSerials.shipmentItemId}
            FROM ${shipmentItemSerials}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestShipmentId: sql<string | null>`(
            SELECT ${shipmentItems.shipmentId}
            FROM ${shipmentItemSerials}
            INNER JOIN ${shipmentItems}
              ON ${shipmentItemSerials.shipmentItemId} = ${shipmentItems.id}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestShipmentNumber: sql<string | null>`(
            SELECT ${orderShipments.shipmentNumber}
            FROM ${shipmentItemSerials}
            INNER JOIN ${shipmentItems}
              ON ${shipmentItemSerials.shipmentItemId} = ${shipmentItems.id}
            INNER JOIN ${orderShipments}
              ON ${shipmentItems.shipmentId} = ${orderShipments.id}
            WHERE ${shipmentItemSerials.organizationId} = ${serializedItems.organizationId}
              AND ${shipmentItemSerials.serializedItemId} = ${serializedItems.id}
            ORDER BY ${shipmentItemSerials.shippedAt} DESC
            LIMIT 1
          )`,
          latestWarrantyId: sql<string | null>`(
            SELECT ${warranties.id}
            FROM ${warranties}
            WHERE ${warranties.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${warranties.productSerial})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${warranties.registrationDate} DESC
            LIMIT 1
          )`,
          latestWarrantyNumber: sql<string | null>`(
            SELECT ${warranties.warrantyNumber}
            FROM ${warranties}
            WHERE ${warranties.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${warranties.productSerial})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${warranties.registrationDate} DESC
            LIMIT 1
          )`,
          latestRmaId: sql<string | null>`(
            SELECT ${returnAuthorizations.id}
            FROM ${rmaLineItems}
            INNER JOIN ${returnAuthorizations}
              ON ${rmaLineItems.rmaId} = ${returnAuthorizations.id}
            WHERE ${returnAuthorizations.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${rmaLineItems.serialNumber})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${rmaLineItems.createdAt} DESC
            LIMIT 1
          )`,
          latestRmaNumber: sql<string | null>`(
            SELECT ${returnAuthorizations.rmaNumber}
            FROM ${rmaLineItems}
            INNER JOIN ${returnAuthorizations}
              ON ${rmaLineItems.rmaId} = ${returnAuthorizations.id}
            WHERE ${returnAuthorizations.organizationId} = ${serializedItems.organizationId}
              AND UPPER(TRIM(${rmaLineItems.serialNumber})) = ${serializedItems.serialNumberNormalized}
            ORDER BY ${rmaLineItems.createdAt} DESC
            LIMIT 1
          )`,
          createdAt: serializedItems.createdAt,
          updatedAt: serializedItems.updatedAt,
          createdBy: serializedItems.createdBy,
          updatedBy: serializedItems.updatedBy,
        })
        .from(serializedItems)
        .leftJoin(products, eq(products.id, serializedItems.productId))
        .leftJoin(inventory, eq(inventory.id, serializedItems.currentInventoryId))
        .leftJoin(warehouseLocations, eq(warehouseLocations.id, inventory.locationId))
        .leftJoin(
          purchaseOrderReceiptItems,
          eq(purchaseOrderReceiptItems.id, serializedItems.sourceReceiptItemId)
        )
        .leftJoin(
          purchaseOrderReceipts,
          eq(purchaseOrderReceipts.id, purchaseOrderReceiptItems.receiptId)
        )
        .where(
          and(
            eq(serializedItems.id, data.id),
            eq(serializedItems.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!item) throw new NotFoundError('Serialized item not found', 'serialized_item');

      const events = await db
        .select({
          id: serializedItemEvents.id,
          serializedItemId: serializedItemEvents.serializedItemId,
          eventType: serializedItemEvents.eventType,
          entityType: serializedItemEvents.entityType,
          entityId: serializedItemEvents.entityId,
          notes: serializedItemEvents.notes,
          occurredAt: serializedItemEvents.occurredAt,
          createdAt: serializedItemEvents.createdAt,
        })
        .from(serializedItemEvents)
        .where(
          and(
            eq(serializedItemEvents.organizationId, ctx.organizationId),
            eq(serializedItemEvents.serializedItemId, item.id)
          )
        )
        .orderBy(desc(serializedItemEvents.occurredAt), desc(serializedItemEvents.createdAt))
        .limit(100);

      return {
        item: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) },
        events: events.map((event) => ({
          ...event,
          occurredAt: new Date(event.occurredAt),
          createdAt: new Date(event.createdAt),
        })),
      };
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });

export const createSerializedItem = createServerFn({ method: 'POST' })
  .inputValidator(createSerializedItemSchema)
  .handler(async ({ data }): Promise<SerializedMutationResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });
    const normalizedSerial = normalizeSerial(data.serialNumber);

    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        const [existing] = await tx
          .select({ id: serializedItems.id })
          .from(serializedItems)
          .where(
            and(
              eq(serializedItems.organizationId, ctx.organizationId),
              eq(serializedItems.serialNumberNormalized, normalizedSerial)
            )
          )
          .limit(1);

        if (existing) {
          throw createSerializedStateError(
            `Serial ${normalizedSerial} already exists`,
            'allocation_conflict'
          );
        }

        if (data.currentInventoryId) {
          const [inventoryRow] = await tx
            .select({ id: inventory.id, productId: inventory.productId })
            .from(inventory)
            .where(
              and(
                eq(inventory.id, data.currentInventoryId),
                eq(inventory.organizationId, ctx.organizationId)
              )
            )
            .limit(1);

          if (!inventoryRow) {
            throw createSerializedStateError(
              'Selected inventory item does not exist',
              'invalid_serial_state'
            );
          }
          if (inventoryRow.productId !== data.productId) {
            throw createSerializedStateError(
              'Inventory item product does not match selected product',
              'invalid_serial_state'
            );
          }
        }

        const [created] = await tx
          .insert(serializedItems)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            serialNumberRaw: data.serialNumber,
            serialNumberNormalized: normalizedSerial,
            status: data.status,
            currentInventoryId: data.currentInventoryId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning({ id: serializedItems.id });

        await addSerializedItemEvent(tx, {
          organizationId: ctx.organizationId,
          serializedItemId: created.id,
          eventType: 'status_changed',
          notes: data.notes ?? `Manually created with status ${data.status}`,
          userId: ctx.user.id,
        });

        return okMutationResult('Serialized item created.', {
          affectedIds: [created.id],
        });
      });
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });

export const updateSerializedItem = createServerFn({ method: 'POST' })
  .inputValidator(updateSerializedItemSchema)
  .handler(async ({ data }): Promise<SerializedMutationResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        const [existing] = await tx
          .select({
            id: serializedItems.id,
            serialNumberNormalized: serializedItems.serialNumberNormalized,
            status: serializedItems.status,
          })
          .from(serializedItems)
          .where(
            and(
              eq(serializedItems.id, data.id),
              eq(serializedItems.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new NotFoundError('Serialized item not found', 'serialized_item');
        }

        const nextNormalized = data.serialNumber
          ? normalizeSerial(data.serialNumber)
          : existing.serialNumberNormalized;

        if (data.serialNumber && nextNormalized !== existing.serialNumberNormalized) {
          const [duplicate] = await tx
            .select({ id: serializedItems.id })
            .from(serializedItems)
            .where(
              and(
                eq(serializedItems.organizationId, ctx.organizationId),
                eq(serializedItems.serialNumberNormalized, nextNormalized),
                ne(serializedItems.id, data.id)
              )
            )
            .limit(1);

          if (duplicate) {
            throw createSerializedStateError(
              `Serial ${nextNormalized} already exists`,
              'allocation_conflict'
            );
          }
        }

        if (data.currentInventoryId) {
          const [inventoryRow] = await tx
            .select({ id: inventory.id, productId: inventory.productId })
            .from(inventory)
            .where(
              and(
                eq(inventory.id, data.currentInventoryId),
                eq(inventory.organizationId, ctx.organizationId)
              )
            )
            .limit(1);

          if (!inventoryRow) {
            throw createSerializedStateError(
              'Selected inventory item does not exist',
              'invalid_serial_state'
            );
          }
          if (data.productId && inventoryRow.productId !== data.productId) {
            throw createSerializedStateError(
              'Inventory item product does not match selected product',
              'invalid_serial_state'
            );
          }
        }

        await tx
          .update(serializedItems)
          .set({
            productId: data.productId,
            serialNumberRaw: data.serialNumber,
            serialNumberNormalized: data.serialNumber ? nextNormalized : undefined,
            status: data.status,
            currentInventoryId: data.currentInventoryId,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(serializedItems.id, data.id));

        if (data.status === 'available') {
          await releaseSerializedItemAllocation(tx, {
            organizationId: ctx.organizationId,
            serializedItemId: data.id,
            userId: ctx.user.id,
          });
        }

        if (data.status && data.status !== existing.status) {
          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId: data.id,
            eventType: 'status_changed',
            notes: data.notes ?? `Status changed from ${existing.status} to ${data.status}`,
            userId: ctx.user.id,
          });
        } else if (data.notes) {
          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId: data.id,
            eventType: 'status_changed',
            notes: data.notes,
            userId: ctx.user.id,
          });
        }

        return okMutationResult('Serialized item updated.', {
          affectedIds: [data.id],
        });
      });
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });

export const deleteSerializedItem = createServerFn({ method: 'POST' })
  .inputValidator(deleteSerializedItemSchema)
  .handler(async ({ data }): Promise<SerializedMutationResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    try {
      return await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        const [existing] = await tx
          .select({ id: serializedItems.id, serial: serializedItems.serialNumberNormalized })
          .from(serializedItems)
          .where(
            and(
              eq(serializedItems.id, data.id),
              eq(serializedItems.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new NotFoundError('Serialized item not found', 'serialized_item');
        }

        const [activeAllocation] = await tx
          .select({ id: orderLineSerialAllocations.id })
          .from(orderLineSerialAllocations)
          .where(
            and(
              eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
              eq(orderLineSerialAllocations.serializedItemId, data.id),
              eq(orderLineSerialAllocations.isActive, true)
            )
          )
          .limit(1);

        if (activeAllocation) {
          throw createSerializedStateError(
            'Cannot delete a serialized item that is actively allocated',
            'transition_blocked'
          );
        }

        const [shipmentLink] = await tx
          .select({ id: shipmentItemSerials.id })
          .from(shipmentItemSerials)
          .where(
            and(
              eq(shipmentItemSerials.organizationId, ctx.organizationId),
              eq(shipmentItemSerials.serializedItemId, data.id)
            )
          )
          .limit(1);

        if (shipmentLink) {
          throw createSerializedStateError(
            'Cannot delete a serialized item that has been shipped',
            'shipped_status_conflict'
          );
        }

        await tx.delete(serializedItemEvents).where(eq(serializedItemEvents.serializedItemId, data.id));
        await tx.delete(serializedItems).where(eq(serializedItems.id, data.id));

        return okMutationResult(`Serialized item ${existing.serial} deleted.`, {
          affectedIds: [data.id],
        });
      });
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });

export const addSerializedItemNote = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(500) }))
  .handler(async ({ data }): Promise<SerializedMutationResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    try {
      const [existing] = await db
        .select({ id: serializedItems.id })
        .from(serializedItems)
        .where(
          and(
            eq(serializedItems.id, data.id),
            eq(serializedItems.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Serialized item not found', 'serialized_item');
      }

      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        await addSerializedItemEvent(tx, {
          organizationId: ctx.organizationId,
          serializedItemId: data.id,
          eventType: 'status_changed',
          notes: data.note,
          userId: ctx.user.id,
        });
      });

      return okMutationResult('Serialized item note added.', {
        affectedIds: [data.id],
      });
    } catch (error) {
      if (isMissingSerializedInfraError(error)) {
        throw toSerializedInfraError();
      }
      throw error;
    }
  });
