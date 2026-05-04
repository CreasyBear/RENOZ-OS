/**
 * Inventory serial availability server functions.
 *
 * Owns serial selectors used by picking and allocation workflows. Prefers the
 * canonical serialized-lineage tables and falls back to legacy inventory serial
 * rows while migrations are still rolling through environments.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { normalizeSerial } from '@/lib/serials';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { withAuth } from '@/lib/server/protected';
import {
  inventory,
  orderLineSerialAllocations,
  serializedItems,
  warehouseLocations as locations,
} from 'drizzle/schema';

export interface GetAvailableSerialsResult {
  productId: string;
  availableSerials: {
    id: string;
    serialNumber: string;
    locationId: string | null;
    locationName: string | null;
    receivedAt?: string;
  }[];
  totalAvailable: number;
}

/**
 * Get available serial numbers for a product.
 *
 * Returns serial numbers from inventory that:
 * - Are not already allocated to another order
 * - Are in 'available' status
 * - Optionally filtered by location
 *
 * Used by the picking workflow to populate serial number selectors.
 */
export const getAvailableSerials = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid().optional(),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    // Prefer canonical serialized lineage when migration exists.
    try {
      const canonicalRows = await db
        .select({
          id: serializedItems.id,
          serialNumber: serializedItems.serialNumberNormalized,
          locationId: inventory.locationId,
          locationName: locations.name,
          createdAt: serializedItems.createdAt,
          activeAllocationId: orderLineSerialAllocations.id,
        })
        .from(serializedItems)
        .leftJoin(
          inventory,
          and(
            eq(serializedItems.currentInventoryId, inventory.id),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .leftJoin(locations, eq(inventory.locationId, locations.id))
        .leftJoin(
          orderLineSerialAllocations,
          and(
            eq(orderLineSerialAllocations.serializedItemId, serializedItems.id),
            eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
            eq(orderLineSerialAllocations.isActive, true)
          )
        )
        .where(
          and(
            eq(serializedItems.organizationId, ctx.organizationId),
            eq(serializedItems.productId, data.productId),
            eq(serializedItems.status, 'available'),
            isNull(orderLineSerialAllocations.id),
            ...(data.locationId ? [eq(inventory.locationId, data.locationId)] : [])
          )
        )
        .orderBy(asc(serializedItems.createdAt))
        .limit(500);

      const availableSerials = canonicalRows.map((row) => ({
        id: row.id,
        serialNumber: row.serialNumber,
        locationId: row.locationId,
        locationName: row.locationName,
        receivedAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
      }));

      return {
        productId: data.productId,
        availableSerials,
        totalAvailable: availableSerials.length,
      } satisfies GetAvailableSerialsResult;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = (error as { message?: string })?.message ?? '';
      const missingCanonicalTables =
        code === '42P01' || code === '42703' || message.includes('does not exist');
      if (!missingCanonicalTables) {
        throw error;
      }
    }

    // Build conditions
    const conditions = [
      eq(inventory.organizationId, ctx.organizationId),
      eq(inventory.productId, data.productId),
      sql`${inventory.serialNumber} IS NOT NULL`,
      sql`${inventory.serialNumber} != ''`,
      // Only available inventory (not allocated, not reserved)
      eq(inventory.status, 'available'),
      // Must have positive quantity
      sql`${inventory.quantityOnHand} > 0`,
    ];

    if (data.locationId) {
      conditions.push(eq(inventory.locationId, data.locationId));
    }

    // OPTIMIZED: Use SQL NOT EXISTS instead of fetching all allocated serials and filtering in memory
    // This eliminates the need to load all allocated serials into memory
    const { orderLineItems } = await import('drizzle/schema');

    const results = await db
      .select({
        id: inventory.id,
        serialNumber: inventory.serialNumber,
        locationId: inventory.locationId,
        locationName: locations.name,
        quantityOnHand: inventory.quantityOnHand,
        quantityAvailable: inventory.quantityAvailable,
        createdAt: inventory.createdAt,
      })
      .from(inventory)
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          ...conditions,
          // Filter out serials already allocated using SQL NOT EXISTS
          sql`NOT EXISTS (
            SELECT 1
            FROM ${orderLineItems}
            WHERE ${orderLineItems.organizationId} = ${ctx.organizationId}
              AND ${orderLineItems.productId} = ${data.productId}
              AND ${orderLineItems.allocatedSerialNumbers} IS NOT NULL
              AND ${orderLineItems.allocatedSerialNumbers} @> to_jsonb(${inventory.serialNumber}::text)
          )`
        )
      )
      .orderBy(asc(inventory.createdAt), asc(inventory.serialNumber))
      .limit(500); // Add pagination limit to prevent large result sets

    // Map to result format (FIFO order; receivedAt = createdAt as proxy for age display)
    // Trim serial numbers to handle DB whitespace; reject empty after trim
    const availableSerials = results
      .filter((item) => item.serialNumber?.trim()) // Filter out null/empty serials
      .map((item) => ({
        id: item.id,
        serialNumber: normalizeSerial(item.serialNumber!),
        locationId: item.locationId,
        locationName: item.locationName,
        receivedAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      }));

    const result: GetAvailableSerialsResult = {
      productId: data.productId,
      availableSerials,
      totalAvailable: availableSerials.length,
    };
    return result;
  });
