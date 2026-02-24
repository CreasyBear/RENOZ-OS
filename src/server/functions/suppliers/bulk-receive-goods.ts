/**
 * Bulk Receive Goods Server Function
 *
 * Batch processing for receiving goods against multiple purchase orders.
 * Processes each PO individually using the existing receiveGoods logic.
 *
 * Business Rules:
 * - Cannot bulk receive serialized products (they require individual serial number entry)
 * - Receives all pending items with default values (condition: 'new', no rejections)
 * - Returns summary of processed/failed counts
 *
 * @see src/server/functions/suppliers/receive-goods.ts (single PO receiving)
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { receiveGoods } from './receive-goods';
import { products } from 'drizzle/schema/products/products';
import { getPurchaseOrder } from './purchase-orders';
import { ValidationError } from '@/lib/server/errors';
import { normalizeSerial } from '@/lib/serials';
import { serializedMutationSuccess, type SerializedMutationEnvelope } from '@/lib/server/serialized-mutation-contract';

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const bulkReceiveGoodsItemSerialNumbersSchema = z.record(
  z.string().uuid(), // poItemId
  z.array(z.string()) // serialNumbers
);

const bulkReceiveGoodsSchema = z.object({
  purchaseOrderIds: z.array(z.string().uuid()).min(1).max(100), // Max 100 POs per batch
  serialNumbers: z
    .record(
      z.string().uuid(), // poId
      bulkReceiveGoodsItemSerialNumbersSchema
    )
    .optional(), // poId -> poItemId -> serialNumbers[]
});

// ============================================================================
// BULK RECEIVE GOODS
// ============================================================================

/**
 * Receive goods for multiple purchase orders.
 *
 * Processes each PO individually. For each PO:
 * - Validates PO exists and has pending items
 * - Validates serial numbers for serialized products (if provided)
 * - Receives all pending items with provided serial numbers or default values
 * - Returns summary of processed/failed counts
 *
 * Business Rules:
 * - Serialized products REQUIRE serial numbers (must match quantity)
 * - Serial numbers provided via serialNumbers map: poId -> poItemId -> serialNumbers[]
 * - Non-serialized products receive with default values (condition: 'new', no rejections)
 */
export const bulkReceiveGoods = createServerFn({ method: 'POST' })
  .inputValidator(bulkReceiveGoodsSchema)
  .handler(async ({ data }): Promise<
    SerializedMutationEnvelope<{
      processed: number;
      failed: number;
      errors: Array<{ poId: string; error: string }>;
    }>
  > => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as Array<{ poId: string; error: string }>,
    };

    // Process each PO sequentially
    for (const poId of data.purchaseOrderIds) {
      try {
        // Fetch PO details
        const poDetails = await getPurchaseOrder({ data: { id: poId } });

        if (!poDetails || !poDetails.items) {
          throw new Error('Purchase order not found or has no items');
        }

        // Get pending items
        const pendingItems = poDetails.items.filter(
          (item) => (item.quantityPending ?? 0) > 0
        );

        if (pendingItems.length === 0) {
          // No pending items - skip this PO
          results.processed++;
          continue;
        }

        // Check for serialized products and validate serial numbers
        const productIds = pendingItems
          .map((item) => item.productId)
          .filter((id): id is string => id !== null);

        const productSerializationMap = new Map<string, boolean>();
        if (productIds.length > 0) {
          const productData = await db
            .select({
              id: products.id,
              isSerialized: products.isSerialized,
            })
            .from(products)
            .where(
              and(
                inArray(products.id, productIds),
                eq(products.organizationId, ctx.organizationId),
                isNull(products.deletedAt)
              )
            );

          productData.forEach((p) => {
            productSerializationMap.set(p.id, p.isSerialized);
          });
        }

        // Get serial numbers for this PO (if provided)
        const poSerialNumbers = data.serialNumbers?.[poId];

        // Create receipt items with serial numbers for serialized products
        const receiptItems = pendingItems.map((item) => {
          const isSerialized = item.productId
            ? productSerializationMap.get(item.productId) ?? false
            : false;

          const itemSerials = isSerialized ? poSerialNumbers?.[item.id] : undefined;

          // Validate serial numbers for serialized products
          if (isSerialized) {
            const quantity = item.quantityPending ?? 0;
            if (!itemSerials || itemSerials.length !== quantity) {
              throw new ValidationError(
                `Serialized product "${item.productName}" requires ${quantity} serial number${quantity !== 1 ? 's' : ''}, found ${itemSerials?.length ?? 0}`
              );
            }
            // Validate no duplicates
            const normalizedSerials = itemSerials.map((s) => normalizeSerial(s));
            if (normalizedSerials.some((s) => s.length === 0)) {
              throw new ValidationError(
                `Serialized product "${item.productName}" has an empty serial number`
              );
            }
            const uniqueSerials = new Set(normalizedSerials);
            if (uniqueSerials.size !== itemSerials.length) {
              throw new ValidationError(
                `Duplicate serial numbers found for "${item.productName}"`
              );
            }
          }

          return {
            poItemId: item.id,
            quantityReceived: item.quantityPending ?? 0,
            quantityRejected: 0,
            condition: 'new' as const,
            lotNumber: undefined,
            serialNumbers: itemSerials?.map((s) => normalizeSerial(s)),
            notes: undefined,
          };
        });

        // Call receiveGoods for this PO
        await receiveGoods({
          data: {
            purchaseOrderId: poId,
            items: receiptItems,
          },
        });

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          poId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const errorsById = results.errors.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.poId] = entry.error;
      return acc;
    }, {});

    return serializedMutationSuccess(
      results,
      results.failed === 0
        ? `Received goods for ${results.processed} purchase order${results.processed === 1 ? '' : 's'}.`
        : `Processed ${results.processed} purchase order${results.processed === 1 ? '' : 's'} with ${results.failed} failure${results.failed === 1 ? '' : 's'}.`,
      {
        affectedIds: data.purchaseOrderIds,
        errorsById: Object.keys(errorsById).length > 0 ? errorsById : undefined,
        partialFailure:
          results.failed > 0
            ? {
                code: 'transition_blocked',
                message: 'Some purchase orders were not receipted. Review failed rows and retry.',
              }
            : undefined,
      }
    );
  });
