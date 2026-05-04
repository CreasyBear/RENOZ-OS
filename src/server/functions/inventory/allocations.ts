/**
 * Inventory allocation server functions.
 *
 * Owns reservation and release of inventory quantities for orders and other
 * fulfillment workflows.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { normalizeSerial } from '@/lib/serials';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryLogger } from '@/lib/logger';
import { inventory, inventoryMovements } from 'drizzle/schema';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  checkActivityExists,
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

/** PHASE12-001: Retry config for critical inventory operations. Max 3 attempts, exponential backoff, jitter. */
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 100;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { label?: string }
): Promise<T> {
  const label = options?.label ?? 'operation';
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const baseDelay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay;
        inventoryLogger.warn(
          `[${label}] Retry attempt ${attempt}/${RETRY_MAX_ATTEMPTS} after error`,
          { error: e }
        );
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
      }
    }
  }
  inventoryLogger.error(`[${label}] All ${RETRY_MAX_ATTEMPTS} attempts failed`);
  throw lastError;
}

const allocateInventorySchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceId: z.string().uuid(),
  referenceType: z.string(),
  reservedUntil: z.coerce.date().optional(),
});

const deallocateInventorySchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

/**
 * Allocate inventory for an order or reservation.
 *
 * PHASE12-001: Uses retry with exponential backoff for transient DB failures (e.g. deadlock).
 */
export const allocateInventory = createServerFn({ method: 'POST' })
  .inputValidator(allocateInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.allocate });

    return await retryWithBackoff(
      () =>
        db.transaction(async (tx) => {
          await tx.execute(
            sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
          );
          // Read WITH lock inside transaction to prevent race conditions
          const [item] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.id, data.inventoryId),
                eq(inventory.organizationId, ctx.organizationId)
              )
            )
            .for('update')
            .limit(1);

          if (!item) {
            throw new NotFoundError('Inventory item not found', 'inventory');
          }

          const normalizedSerialNumber = item.serialNumber
            ? normalizeSerial(item.serialNumber)
            : null;
          if (normalizedSerialNumber && data.quantity !== 1) {
            throw new ValidationError('Serialized allocation must be exactly one unit', {
              quantity: ['Serialized inventory rows can only allocate one unit per operation'],
            });
          }

          // Validate with fresh locked data
          if ((item.quantityAvailable ?? 0) < data.quantity) {
            throw new ValidationError('Insufficient available quantity', {
              quantity: [`Only ${item.quantityAvailable} available for allocation`],
            });
          }

          // Use fresh data from locked row
          const newAllocated = (item.quantityAllocated ?? 0) + data.quantity;
          const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

          // Update inventory
          const [updatedItem] = await tx
            .update(inventory)
            .set({
              quantityAllocated: newAllocated,
              status: newAvailable <= 0 ? 'allocated' : 'available',
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(eq(inventory.id, data.inventoryId))
            .returning();

          // Create movement
          const [movement] = await tx
            .insert(inventoryMovements)
            .values({
              organizationId: ctx.organizationId,
              inventoryId: data.inventoryId,
              productId: item.productId,
              locationId: item.locationId,
              movementType: 'allocate',
              quantity: -data.quantity, // Negative for allocation
              previousQuantity: item.quantityAvailable ?? 0,
              newQuantity: newAvailable,
              referenceType: data.referenceType,
              referenceId: data.referenceId,
              metadata: {
                reservedUntil: data.reservedUntil?.toISOString(),
              },
              createdBy: ctx.user.id,
            })
            .returning();

          if (normalizedSerialNumber) {
            const serializedItemId = await upsertSerializedItemForInventory(tx, {
              organizationId: ctx.organizationId,
              productId: item.productId,
              serialNumber: normalizedSerialNumber,
              inventoryId: data.inventoryId,
              status: 'allocated',
              userId: ctx.user.id,
            });
            if (serializedItemId) {
              await addSerializedItemEvent(tx, {
                organizationId: ctx.organizationId,
                serializedItemId,
                eventType: 'allocated',
                entityType: 'inventory_movement',
                entityId: movement.id,
                notes: `Allocated via ${data.referenceType}`,
                userId: ctx.user.id,
              });
            }
          }

          // Log activity for allocation - inside transaction for atomicity
          const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
          if (!activityExists) {
            await logActivityInTransaction(tx, ctx, {
              entityType: 'inventory',
              entityId: data.inventoryId,
              action: 'updated',
              description: `Inventory allocated (${data.quantity} units)`,
              metadata: {
                movementId: movement.id,
                movementType: 'allocate',
                productId: item.productId,
                quantity: data.quantity,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
              },
            });
          }

          return {
            item: updatedItem,
            movement,
          };
        }),
      { label: 'allocateInventory' }
    );
  });

/**
 * Deallocate inventory (release reservation).
 */
export const deallocateInventory = createServerFn({ method: 'POST' })
  .inputValidator(deallocateInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.allocate });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Read WITH lock inside transaction to prevent race conditions
      const [item] = await tx
        .select()
        .from(inventory)
        .where(
          and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
        )
        .for('update')
        .limit(1);

      if (!item) {
        throw new NotFoundError('Inventory item not found', 'inventory');
      }

      const normalizedSerialNumber = item.serialNumber
        ? normalizeSerial(item.serialNumber)
        : null;
      if (normalizedSerialNumber && data.quantity !== 1) {
        throw new ValidationError('Serialized deallocation must be exactly one unit', {
          quantity: ['Serialized inventory rows can only deallocate one unit per operation'],
        });
      }

      // Validate with fresh locked data
      if ((item.quantityAllocated ?? 0) < data.quantity) {
        throw new ValidationError('Cannot deallocate more than allocated', {
          quantity: [`Only ${item.quantityAllocated} currently allocated`],
        });
      }

      // Use fresh data from locked row
      const newAllocated = (item.quantityAllocated ?? 0) - data.quantity;
      const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

      // Update inventory
      const [updatedItem] = await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          status: newAllocated > 0 ? 'allocated' : 'available',
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(inventory.id, data.inventoryId))
        .returning();

      // Create movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: data.inventoryId,
          productId: item.productId,
          locationId: item.locationId,
          movementType: 'deallocate',
          quantity: data.quantity, // Positive for deallocation
          previousQuantity: item.quantityAvailable ?? 0,
          newQuantity: newAvailable,
          referenceId: data.referenceId,
          metadata: {
            reason: data.reason,
          },
          createdBy: ctx.user.id,
        })
        .returning();

      if (normalizedSerialNumber) {
        const serializedItemId = await upsertSerializedItemForInventory(tx, {
          organizationId: ctx.organizationId,
          productId: item.productId,
          serialNumber: normalizedSerialNumber,
          inventoryId: data.inventoryId,
          status: newAllocated > 0 ? 'allocated' : 'available',
          userId: ctx.user.id,
        });
        if (serializedItemId) {
          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId,
            eventType: 'deallocated',
            entityType: 'inventory_movement',
            entityId: movement.id,
            notes: data.reason ?? 'Deallocated inventory reservation',
            userId: ctx.user.id,
          });
        }
      }

      // Log activity for deallocation - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'inventory',
          entityId: data.inventoryId,
          action: 'updated',
          description: `Inventory deallocated (${data.quantity} units)`,
          metadata: {
            movementId: movement.id,
            movementType: 'deallocate',
            productId: item.productId,
            quantity: data.quantity,
            referenceId: data.referenceId,
            reason: data.reason,
          },
        });
      }

      return {
        item: updatedItem,
        movement,
      };
    });
  });
