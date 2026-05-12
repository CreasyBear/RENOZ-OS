/**
 * Bulk Receive Goods Server Function
 *
 * Batch processing for receiving goods against multiple purchase orders.
 * Processes each PO individually using the existing receiveGoods logic.
 *
 * Business Rules:
 * - Serialized products require serial numbers before receiving
 * - Receives all pending items with default values (condition: 'new', no rejections)
 * - Returns summary of received/skipped/failed counts and row details
 *
 * @see src/server/functions/suppliers/receive-goods.ts (single PO receiving)
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { receiveGoods } from './receive-goods';
import { products } from 'drizzle/schema/products/products';
import { getPurchaseOrder } from './purchase-orders';
import { normalizeSerial } from '@/lib/serials';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
  type SerializedMutationEnvelope,
} from '@/lib/server/serialized-mutation-contract';
import {
  findBulkReceiveDuplicateSerialFailures,
  type BulkReceiveSerialPreflightLine,
} from './bulk-receive-serial-preflight';
import { toBulkReceiveFailure, type BulkReceiveFailure } from './bulk-receive-failure';
import {
  buildProductSerializationRequirementMap,
  getUniqueReceiptProductIds,
} from './receive-goods-serialization';

interface BulkReceiveSkippedDetail {
  poId: string;
  reason: string;
}

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
 * - Returns summary of received/skipped/failed counts and row details
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
      skipped: number;
      failed: number;
      skippedDetails: BulkReceiveSkippedDetail[];
      errors: BulkReceiveFailure[];
    }>
  > => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      skippedDetails: [] as BulkReceiveSkippedDetail[],
      errors: [] as BulkReceiveFailure[],
    };
    const affectedInventoryIds = new Set<string>();
    const affectedProductIds = new Set<string>();
    let touchesSerializedInventory = false;
    const preparedReceipts: Array<{
      poId: string;
      items: Array<{
        poItemId: string;
        quantityReceived: number;
        quantityRejected: number;
        condition: 'new';
        lotNumber: undefined;
        serialNumbers: string[] | undefined;
        notes: undefined;
      }>;
    }> = [];
    const serialPreflightLines: BulkReceiveSerialPreflightLine[] = [];

    // Prepare each PO first so batch-level serial conflicts cannot partially receipt.
    for (const poId of data.purchaseOrderIds) {
      try {
        // Fetch PO details
        const poDetails = await getPurchaseOrder({ data: { id: poId } });

        if (!poDetails) {
          throw new NotFoundError('Purchase order not found', 'purchaseOrder');
        }

        if (!poDetails.items) {
          throw new ValidationError(
            'Purchase order receiving details are unavailable. Refresh and try again.'
          );
        }

        // Get pending items
        const pendingItems = poDetails.items.filter(
          (item) => (item.quantityPending ?? 0) > 0
        );

        if (pendingItems.length === 0) {
          // No pending items - skip this PO
          results.skipped++;
          results.skippedDetails.push({
            poId,
            reason: 'No pending items to receive.',
          });
          continue;
        }

        // Check for serialized products and validate serial numbers
        const productIds = getUniqueReceiptProductIds(
          pendingItems.map((item) => item.productId)
        );

        let productSerializationMap = new Map<string, boolean>();
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
                eq(products.status, 'active'),
                eq(products.isActive, true),
                eq(products.isPurchasable, true),
                isNull(products.deletedAt)
              )
            );

          productSerializationMap = buildProductSerializationRequirementMap(
            productIds,
            productData
          );
        }

        // Get serial numbers for this PO (if provided)
        const poSerialNumbers = data.serialNumbers?.[poId];

        // Create receipt items with serial numbers for serialized products
        const receiptItems = pendingItems.map((item) => {
          const isSerialized = item.productId
            ? productSerializationMap.get(item.productId)!
            : false;

          const itemSerials = isSerialized ? poSerialNumbers?.[item.id] : undefined;

          // Validate serial numbers for serialized products
          if (isSerialized) {
            const quantity = item.quantityPending ?? 0;
            if (!itemSerials || itemSerials.length !== quantity) {
              throw createSerializedMutationError(
                `Serialized product "${item.productName}" requires ${quantity} serial number${quantity !== 1 ? 's' : ''}, found ${itemSerials?.length ?? 0}`,
                'invalid_serial_state'
              );
            }
            // Validate no duplicates
            const normalizedSerials = itemSerials.map((s) => normalizeSerial(s));
            if (normalizedSerials.some((s) => s.length === 0)) {
              throw createSerializedMutationError(
                `Serialized product "${item.productName}" has an empty serial number`,
                'invalid_serial_state'
              );
            }
            const uniqueSerials = new Set(normalizedSerials);
            if (uniqueSerials.size !== itemSerials.length) {
              throw createSerializedMutationError(
                `Duplicate serial numbers found for "${item.productName}"`,
                'invalid_serial_state'
              );
            }

            serialPreflightLines.push({
              poId,
              poItemId: item.id,
              productId: item.productId,
              productName: item.productName,
              serialNumbers: normalizedSerials,
            });
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

        preparedReceipts.push({
          poId,
          items: receiptItems,
        });
      } catch (error) {
        results.failed++;
        results.errors.push(toBulkReceiveFailure(poId, error));
      }
    }

    const duplicateSerialFailures =
      findBulkReceiveDuplicateSerialFailures(serialPreflightLines);
    const preflightBlockedPOIds = new Set(duplicateSerialFailures.map((failure) => failure.poId));
    results.failed += preflightBlockedPOIds.size;
    duplicateSerialFailures.forEach((failure) => {
      results.errors.push({
        poId: failure.poId,
        error: failure.error,
        code: failure.code,
      });
    });

    // Process prepared POs sequentially after batch-level serial preflight passes.
    for (const preparedReceipt of preparedReceipts) {
      if (preflightBlockedPOIds.has(preparedReceipt.poId)) continue;

      try {
        const receiveResult = await receiveGoods({
          data: {
            purchaseOrderId: preparedReceipt.poId,
            items: preparedReceipt.items,
          },
        });
        (receiveResult.affectedInventoryIds ?? []).forEach((id) => affectedInventoryIds.add(id));
        (receiveResult.affectedProductIds ?? []).forEach((id) => affectedProductIds.add(id));
        touchesSerializedInventory =
          touchesSerializedInventory || Boolean(receiveResult.touchesSerializedInventory);

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(toBulkReceiveFailure(preparedReceipt.poId, error));
      }
    }

    const errorsById = results.errors.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.poId] = entry.error;
      return acc;
    }, {});

    return serializedMutationSuccess(
      results,
      formatBulkReceiveResultMessage(results),
      {
        affectedIds: data.purchaseOrderIds,
        affectedInventoryIds: Array.from(affectedInventoryIds),
        affectedProductIds: Array.from(affectedProductIds),
        touchesSerializedInventory,
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

function formatBulkReceiveResultMessage(results: {
  processed: number;
  skipped: number;
  failed: number;
}): string {
  const receivedLabel = `${results.processed} purchase order${results.processed === 1 ? '' : 's'}`;
  const skippedLabel = `${results.skipped} purchase order${results.skipped === 1 ? '' : 's'}`;
  const failedLabel = `${results.failed} failure${results.failed === 1 ? '' : 's'}`;

  if (results.failed === 0 && results.skipped === 0) {
    return `Received goods for ${receivedLabel}.`;
  }

  if (results.failed === 0 && results.processed === 0) {
    return `No purchase orders needed receiving. Skipped ${skippedLabel} with no pending items.`;
  }

  if (results.failed === 0) {
    return `Received goods for ${receivedLabel}. Skipped ${skippedLabel} with no pending items.`;
  }

  if (results.skipped > 0) {
    return `Received goods for ${receivedLabel}, skipped ${skippedLabel} with no pending items, with ${failedLabel}.`;
  }

  return `Received goods for ${receivedLabel} with ${failedLabel}.`;
}
