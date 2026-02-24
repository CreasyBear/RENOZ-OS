/**
 * RMA (Return Merchandise Authorization) Server Functions
 *
 * Server functions for managing return authorizations including
 * creation, status updates, and workflow transitions.
 *
 * @see drizzle/schema/support/return-authorizations.ts
 * @see src/lib/schemas/support/rma.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003a
 */

import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, desc, asc, sql, ilike, count, isNull, inArray, isNotNull } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import { z } from 'zod';
import { db, type TransactionExecutor } from '@/lib/db';
import {
  returnAuthorizations,
  rmaLineItems,
  generateRmaNumber,
  isValidRmaTransition,
} from 'drizzle/schema/support/return-authorizations';
import { customers } from 'drizzle/schema/customers';
import { issues } from 'drizzle/schema/support/issues';
import { orderLineItems, orders } from 'drizzle/schema/orders';
import { shipmentItems, orderShipments } from 'drizzle/schema/orders/order-shipments';
import { shipmentItemSerials, serializedItems } from 'drizzle/schema';
import {
  inventory,
  inventoryMovements,
} from 'drizzle/schema/inventory/inventory';
import { warehouseLocations } from 'drizzle/schema/inventory/warehouse-locations';
import { products } from 'drizzle/schema/products/products';
import { activities } from 'drizzle/schema/activities';
import { withAuth } from '@/lib/server/protected';
import type { SerializedMutationEnvelope } from '@/lib/server/serialized-mutation-contract';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
} from '@/lib/server/serialized-mutation-contract';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { normalizeSerial } from '@/lib/serials';
import {
  addSerializedItemEvent,
  findSerializedItemBySerial,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  createRmaSchema,
  updateRmaSchema,
  getRmaSchema,
  listRmasSchema,
  listRmasCursorSchema,
  approveRmaSchema,
  rejectRmaSchema,
  receiveRmaSchema,
  processRmaSchema,
  bulkApproveRmaSchema,
  bulkReceiveRmaSchema,
  type RmaResponse,
  type RmaLineItemResponse,
  type ListRmasResponse,
  type BulkRmaResult,
} from '@/lib/schemas/support/rma';

// ============================================================================
// HELPERS
// ============================================================================

/** Explicit column projection for rma_line_items (Drizzle best practice) */
const rmaLineItemsProjection = {
  id: rmaLineItems.id,
  rmaId: rmaLineItems.rmaId,
  orderLineItemId: rmaLineItems.orderLineItemId,
  quantityReturned: rmaLineItems.quantityReturned,
  itemReason: rmaLineItems.itemReason,
  itemCondition: rmaLineItems.itemCondition,
  serialNumber: rmaLineItems.serialNumber,
  createdAt: rmaLineItems.createdAt,
  updatedAt: rmaLineItems.updatedAt,
};

/**
 * Get next sequence number for RMA generation.
 * Must be called inside a transaction to prevent duplicate sequences.
 * Accepts TransactionExecutor so it can run inside db.transaction(tx => ...).
 */
async function getNextRmaSequence(
  organizationId: string,
  executor: TransactionExecutor = db
): Promise<number> {
  const [result] = await executor
    .select({
      maxSequence: sql<number>`COALESCE(MAX(${returnAuthorizations.sequenceNumber}), 0)`,
    })
    .from(returnAuthorizations)
    .where(eq(returnAuthorizations.organizationId, organizationId));

  return (result?.maxSequence ?? 0) + 1;
}

// ============================================================================
// CREATE RMA
// ============================================================================

/**
 * Create a new RMA
 */
export const createRma = createServerFn({ method: 'POST' })
  .inputValidator(createRmaSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<RmaResponse>> => {
    const ctx = await withAuth();

    // Verify order exists and belongs to organization
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, data.orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt)
      ))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Verify issue exists if provided
    if (data.issueId) {
      const [issue] = await db
        .select()
        .from(issues)
        .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
        .limit(1);

      if (!issue) {
        throw new NotFoundError('Issue not found', 'issue');
      }
    }

    // Use customer from order if not explicitly provided
    const customerId = data.customerId ?? order.customerId;

    // Create RMA in transaction (sequence generation inside to prevent duplicates)
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get next sequence number inside transaction to prevent duplicate sequences
      const sequenceNumber = await getNextRmaSequence(ctx.organizationId, tx as unknown as TransactionExecutor);
      const rmaNumber = generateRmaNumber(sequenceNumber);

      // Insert RMA
      const [rma] = await tx
        .insert(returnAuthorizations)
        .values({
          organizationId: ctx.organizationId,
          rmaNumber,
          sequenceNumber,
          orderId: data.orderId,
          issueId: data.issueId ?? null,
          customerId: customerId ?? null,
          reason: data.reason,
          reasonDetails: data.reasonDetails ?? null,
          customerNotes: data.customerNotes ?? null,
          internalNotes: data.internalNotes ?? null,
          status: 'requested',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Insert line items
      if (data.lineItems.length > 0) {
        // Verify all line items belong to the order and get product isSerialized
        const lineItemIds = data.lineItems.map((li) => li.orderLineItemId);
        const lineItemsWithProduct = await tx
          .select({
            orderLineItemId: orderLineItems.id,
            isSerialized: products.isSerialized,
          })
          .from(orderLineItems)
          .innerJoin(products, and(
            eq(orderLineItems.productId, products.id),
            eq(products.organizationId, ctx.organizationId)
          ))
          .where(
            and(
              eq(orderLineItems.orderId, data.orderId),
              eq(orderLineItems.organizationId, ctx.organizationId),
              inArray(orderLineItems.id, lineItemIds)
            )
          );

        const lineItemProductMap = new Map(
          lineItemsWithProduct.map((r) => [r.orderLineItemId, r.isSerialized ?? false])
        );
        const existingIds = new Set(lineItemsWithProduct.map((r) => r.orderLineItemId));
        const invalidIds = lineItemIds.filter((id) => !existingIds.has(id));

        if (invalidIds.length > 0) {
          throw new ValidationError(
            `Invalid line item IDs: ${invalidIds.join(', ')}. Items must belong to the specified order.`
          );
        }

        // Validate serialized products have serialNumber
        for (const item of data.lineItems) {
          const isSerialized = lineItemProductMap.get(item.orderLineItemId) ?? false;
          if (isSerialized && (!item.serialNumber || !String(item.serialNumber).trim())) {
            throw new ValidationError(
              `Serial number is required for serialized products. Please provide a serial number for each serialized item.`
            );
          }
          if (isSerialized && item.serialNumber) {
            const normalizedSerial = normalizeSerial(item.serialNumber);
            const shippedMatch = await tx
              .select({ id: shipmentItemSerials.id })
              .from(shipmentItemSerials)
              .innerJoin(
                shipmentItems,
                eq(shipmentItemSerials.shipmentItemId, shipmentItems.id)
              )
              .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
              .innerJoin(
                serializedItems,
                eq(shipmentItemSerials.serializedItemId, serializedItems.id)
              )
              .where(
                and(
                  eq(orderShipments.organizationId, ctx.organizationId),
                  eq(orderShipments.orderId, data.orderId),
                  eq(shipmentItems.orderLineItemId, item.orderLineItemId),
                  eq(serializedItems.serialNumberNormalized, normalizedSerial)
                )
              )
              .limit(1);

            if (shippedMatch.length === 0) {
              throw createSerializedMutationError(
                `Serial "${normalizedSerial}" is not found in shipped serials for the selected order line item.`,
                'invalid_serial_state'
              );
            }
          }
        }

        const insertedLineItems = await tx.insert(rmaLineItems).values(
          data.lineItems.map((item) => ({
            rmaId: rma.id,
            orderLineItemId: item.orderLineItemId,
            quantityReturned: item.quantityReturned,
            itemReason: item.itemReason ?? null,
            serialNumber: item.serialNumber ? normalizeSerial(item.serialNumber) : null,
          }))
        ).returning({ id: rmaLineItems.id, serialNumber: rmaLineItems.serialNumber });

        for (const li of insertedLineItems) {
          if (!li.serialNumber) continue;
          const serializedItem = await findSerializedItemBySerial(
            tx,
            ctx.organizationId,
            li.serialNumber,
            {
              userId: ctx.user.id,
              source: 'rma_create',
            }
          );
          if (serializedItem) {
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId: serializedItem.id,
              eventType: 'rma_requested',
              entityType: 'rma_line_item',
              entityId: li.id,
              notes: `RMA requested: ${rma.rmaNumber}`,
              userId: ctx.user.id,
            });
          }
        }
      }

      // Fetch complete RMA with line items
      const lineItems = await tx
        .select(rmaLineItemsProjection)
        .from(rmaLineItems)
        .where(eq(rmaLineItems.rmaId, rma.id));

      return { rma, lineItems };
    });

    const response = {
      ...result.rma,
      lineItems: result.lineItems.map((li) => ({
        ...li,
        itemCondition: li.itemCondition,
      })),
    } as RmaResponse;

    return serializedMutationSuccess(response, `RMA ${response.rmaNumber} created.`, {
      affectedIds: [response.id],
    });
  });

// ============================================================================
// GET RMA
// ============================================================================

/**
 * Get a single RMA by ID
 */
export const getRma = createServerFn({ method: 'GET' })
  .inputValidator(getRmaSchema)
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();

    // Get RMA with related data
    const [rma] = await db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.id, data.rmaId),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!rma) {
      throw new NotFoundError('RMA not found', 'rma');
    }

    // Get line items with product name (join order_line_items + products)
    const lineItemsRaw = await db
      .select({
        ...rmaLineItemsProjection,
        productId: orderLineItems.productId,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        productName: products.name,
      })
      .from(rmaLineItems)
      .innerJoin(orderLineItems, eq(rmaLineItems.orderLineItemId, orderLineItems.id))
      .leftJoin(products, and(
        eq(orderLineItems.productId, products.id),
        eq(products.organizationId, ctx.organizationId)
      ))
      .where(eq(rmaLineItems.rmaId, rma.id));

    const lineItems: RmaLineItemResponse[] = lineItemsRaw.map((row) => ({
      id: row.id,
      rmaId: row.rmaId,
      orderLineItemId: row.orderLineItemId,
      quantityReturned: row.quantityReturned,
      itemReason: row.itemReason,
      itemCondition: row.itemCondition,
      serialNumber: row.serialNumber,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      orderLineItem: {
        id: row.orderLineItemId,
        productId: row.productId ?? '',
        productName: row.productName ?? 'Unknown Product',
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unitPrice ?? 0),
      },
    }));

    // Get customer if exists — include orgId for multi-tenant isolation
    let customer = null;
    if (rma.customerId) {
      const [c] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(and(
          eq(customers.id, rma.customerId),
          eq(customers.organizationId, ctx.organizationId)
        ))
        .limit(1);
      customer = c ?? null;
    }

    // Get issue if exists — include orgId for multi-tenant isolation
    let issue = null;
    if (rma.issueId) {
      const [i] = await db
        .select({ id: issues.id, title: issues.title })
        .from(issues)
        .where(and(
          eq(issues.id, rma.issueId),
          eq(issues.organizationId, ctx.organizationId)
        ))
        .limit(1);
      issue = i ?? null;
    }

    return {
      ...rma,
      lineItems,
      customer,
      issue,
    } as RmaResponse;
  });

// ============================================================================
// LIST RMAS
// ============================================================================

/**
 * List RMAs with filters and pagination
 */
export const listRmas = createServerFn({ method: 'GET' })
  .inputValidator(listRmasSchema)
  .handler(async ({ data }): Promise<ListRmasResponse> => {
    const ctx = await withAuth();

    // Build where conditions
    const conditions = [eq(returnAuthorizations.organizationId, ctx.organizationId)];

    if (data.status) {
      conditions.push(eq(returnAuthorizations.status, data.status));
    }
    if (data.reason) {
      conditions.push(eq(returnAuthorizations.reason, data.reason));
    }
    if (data.customerId) {
      conditions.push(eq(returnAuthorizations.customerId, data.customerId));
    }
    if (data.orderId) {
      conditions.push(eq(returnAuthorizations.orderId, data.orderId));
    }
    if (data.issueId) {
      conditions.push(eq(returnAuthorizations.issueId, data.issueId));
    }
    if (data.search) {
      conditions.push(ilike(returnAuthorizations.rmaNumber, containsPattern(data.search)));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(returnAuthorizations)
      .where(and(...conditions));

    const totalCount = countResult?.count ?? 0;

    // Get paginated results
    const offset = (data.page - 1) * data.pageSize;

    const orderByColumn =
      data.sortBy === 'rmaNumber'
        ? returnAuthorizations.rmaNumber
        : data.sortBy === 'status'
          ? returnAuthorizations.status
          : returnAuthorizations.createdAt;

    const orderByFn = data.sortOrder === 'asc' ? asc : desc;

    const rmas = await db
      .select()
      .from(returnAuthorizations)
      .where(and(...conditions))
      .orderBy(orderByFn(orderByColumn))
      .limit(data.pageSize)
      .offset(offset);

    // Fetch line items for all RMAs using inArray instead of raw SQL ANY()
    const rmaIds = rmas.map((r) => r.id);
    const allLineItems =
      rmaIds.length > 0
        ? await db
            .select(rmaLineItemsProjection)
            .from(rmaLineItems)
            .where(inArray(rmaLineItems.rmaId, rmaIds))
        : [];

    // Group line items by RMA
    const lineItemsByRma = new Map<string, typeof allLineItems>();
    for (const li of allLineItems) {
      const existing = lineItemsByRma.get(li.rmaId) ?? [];
      existing.push(li);
      lineItemsByRma.set(li.rmaId, existing);
    }

    return {
      data: rmas.map((rma) => ({
        ...rma,
        lineItems: (lineItemsByRma.get(rma.id) ?? []) as RmaLineItemResponse[],
      })) as RmaResponse[],
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / data.pageSize),
      },
    };
  });

/**
 * List RMAs with cursor pagination (recommended for large datasets).
 */
export const listRmasCursor = createServerFn({ method: 'GET' })
  .inputValidator(listRmasCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', status, reason, customerId, orderId, issueId, search } = data;

    const conditions = [eq(returnAuthorizations.organizationId, ctx.organizationId)];
    if (status) conditions.push(eq(returnAuthorizations.status, status));
    if (reason) conditions.push(eq(returnAuthorizations.reason, reason));
    if (customerId) conditions.push(eq(returnAuthorizations.customerId, customerId));
    if (orderId) conditions.push(eq(returnAuthorizations.orderId, orderId));
    if (issueId) conditions.push(eq(returnAuthorizations.issueId, issueId));
    if (search) conditions.push(ilike(returnAuthorizations.rmaNumber, containsPattern(search)));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(returnAuthorizations.createdAt, returnAuthorizations.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const rmas = await db
      .select()
      .from(returnAuthorizations)
      .where(and(...conditions))
      .orderBy(orderDir(returnAuthorizations.createdAt), orderDir(returnAuthorizations.id))
      .limit(pageSize + 1);

    const { items: rmaRows, nextCursor, hasNextPage } = buildStandardCursorResponse(rmas, pageSize);

    const rmaIds = rmaRows.map((r) => r.id);
    const allLineItems =
      rmaIds.length > 0
        ? await db
            .select(rmaLineItemsProjection)
            .from(rmaLineItems)
            .where(inArray(rmaLineItems.rmaId, rmaIds))
        : [];

    const lineItemsByRma = new Map<string, typeof allLineItems>();
    for (const li of allLineItems) {
      const existing = lineItemsByRma.get(li.rmaId) ?? [];
      existing.push(li);
      lineItemsByRma.set(li.rmaId, existing);
    }

    const items = rmaRows.map((rma) => ({
      ...rma,
      lineItems: (lineItemsByRma.get(rma.id) ?? []) as RmaLineItemResponse[],
    })) as RmaResponse[];

    return { items, nextCursor, hasNextPage };
  });

// ============================================================================
// UPDATE RMA
// ============================================================================

/**
 * Update RMA fields (not status transitions)
 */
export const updateRma = createServerFn({ method: 'POST' })
  .inputValidator(
    updateRmaSchema.extend({
      rmaId: getRmaSchema.shape.rmaId,
    })
  )
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();

    const { rmaId, ...updateData } = data;

    // Get existing RMA
    const [existing] = await db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.id, rmaId),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('RMA not found', 'rma');
    }

    // Update RMA
    const [updated] = await db
      .update(returnAuthorizations)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, rmaId))
      .returning();

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, rmaId));

    return {
      ...updated,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });

// ============================================================================
// RMA BY RMA NUMBER
// ============================================================================

/**
 * Get RMA by RMA number (for lookups)
 */
export const getRmaByNumber = createServerFn({ method: 'GET' })
  .inputValidator(
    getRmaSchema
      .extend({
        rmaId: getRmaSchema.shape.rmaId.optional(),
        rmaNumber: createRmaSchema.shape.orderId.optional(), // Just reusing UUID pattern
      })
      .refine((data) => data.rmaId || data.rmaNumber, 'Either rmaId or rmaNumber is required')
  )
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();

    // Build query based on provided identifier (refine ensures one of rmaId or rmaNumber is present)
    const condition = data.rmaId
      ? eq(returnAuthorizations.id, data.rmaId)
      : ilike(returnAuthorizations.rmaNumber, containsPattern(data.rmaNumber!));

    const [rma] = await db
      .select()
      .from(returnAuthorizations)
      .where(and(condition, eq(returnAuthorizations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!rma) {
      setResponseStatus(404);
      throw new NotFoundError('RMA not found', 'returnAuthorization');
    }

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, rma.id));

    return {
      ...rma,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });

// ============================================================================
// LIST RMAS FOR ISSUE
// ============================================================================

/** Max RMAs returned per issue. Issues rarely have >100 RMAs; add cursor pagination if needed. */
const GET_RMAS_FOR_ISSUE_LIMIT = 100;

/**
 * Get all RMAs linked to an issue.
 * Returns up to GET_RMAS_FOR_ISSUE_LIMIT RMAs (most recent first).
 */
export const getRmasForIssue = createServerFn({ method: 'GET' })
  .inputValidator(
    getRmaSchema.extend({
      rmaId: getRmaSchema.shape.rmaId.optional(),
      issueId: getRmaSchema.shape.rmaId,
    })
  )
  .handler(async ({ data }): Promise<RmaResponse[]> => {
    const ctx = await withAuth();

    const rmas = await db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.issueId, data.issueId),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(returnAuthorizations.createdAt))
      .limit(GET_RMAS_FOR_ISSUE_LIMIT);

    // Fetch line items for all RMAs using inArray instead of raw SQL ANY()
    const rmaIds = rmas.map((r) => r.id);
    const allLineItems =
      rmaIds.length > 0
        ? await db
            .select(rmaLineItemsProjection)
            .from(rmaLineItems)
            .where(inArray(rmaLineItems.rmaId, rmaIds))
        : [];

    // Group line items by RMA
    const lineItemsByRma = new Map<string, typeof allLineItems>();
    for (const li of allLineItems) {
      const existing = lineItemsByRma.get(li.rmaId) ?? [];
      existing.push(li);
      lineItemsByRma.set(li.rmaId, existing);
    }

    return rmas.map((rma) => ({
      ...rma,
      lineItems: (lineItemsByRma.get(rma.id) ?? []) as RmaLineItemResponse[],
    })) as RmaResponse[];
  });

// ============================================================================
// WORKFLOW: APPROVE RMA
// ============================================================================

/**
 * Approve an RMA (requested → approved)
 */
export const approveRma = createServerFn({ method: 'POST' })
  .inputValidator(approveRmaSchema)
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();
    const now = new Date().toISOString();

    // Get existing RMA
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

    // Validate transition
    if (!isValidRmaTransition(existing.status, 'approved')) {
      throw new ValidationError(
        `Cannot approve RMA in ${existing.status} status. Must be in 'requested' status.`
      );
    }

    // Update RMA
    const [updated] = await db
      .update(returnAuthorizations)
      .set({
        status: 'approved',
        approvedAt: now,
        approvedBy: ctx.user.id,
        internalNotes: data.notes
          ? `${existing.internalNotes ?? ''}\n[Approval] ${data.notes}`.trim()
          : existing.internalNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, data.rmaId))
      .returning();

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, data.rmaId));

    return {
      ...updated,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });

// ============================================================================
// WORKFLOW: REJECT RMA
// ============================================================================

/**
 * Reject an RMA (requested/approved → rejected)
 */
export const rejectRma = createServerFn({ method: 'POST' })
  .inputValidator(rejectRmaSchema)
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();
    const now = new Date().toISOString();

    // Get existing RMA
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

    // Validate transition
    if (!isValidRmaTransition(existing.status, 'rejected')) {
      throw new ValidationError(
        `Cannot reject RMA in ${existing.status} status. Must be in 'requested' or 'approved' status.`
      );
    }

    // Update RMA
    const [updated] = await db
      .update(returnAuthorizations)
      .set({
        status: 'rejected',
        rejectedAt: now,
        rejectedBy: ctx.user.id,
        rejectionReason: data.rejectionReason,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, data.rmaId))
      .returning();

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, data.rmaId));

    return {
      ...updated,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });

// ============================================================================
// WORKFLOW: BULK APPROVE RMA
// ============================================================================

/**
 * Bulk approve RMAs (requested → approved).
 * Processes only RMAs in 'requested' status; others are reported as failed.
 */
export const bulkApproveRma = createServerFn({ method: 'POST' })
  .inputValidator(bulkApproveRmaSchema)
  .handler(async ({ data }): Promise<BulkRmaResult> => {
    const ctx = await withAuth();
    const now = new Date().toISOString();

    const updated: string[] = [];
    const failed: { rmaId: string; error: string }[] = [];

    // Batch fetch all RMAs
    const existingRmas = await db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          inArray(returnAuthorizations.id, data.rmaIds),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      );

    const rmaMap = new Map(existingRmas.map((r) => [r.id, r]));

    const validApproves: typeof existingRmas = [];
    for (const rmaId of data.rmaIds) {
      const rma = rmaMap.get(rmaId);
      if (!rma) {
        failed.push({ rmaId, error: 'RMA not found' });
        continue;
      }
      if (!isValidRmaTransition(rma.status, 'approved')) {
        failed.push({ rmaId, error: `Cannot approve: RMA is in '${rma.status}' status` });
        continue;
      }
      validApproves.push(rma);
    }

    if (validApproves.length > 0) {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        for (const rma of validApproves) {
          await tx
            .update(returnAuthorizations)
            .set({
              status: 'approved',
              approvedAt: now,
              approvedBy: ctx.user.id,
              internalNotes: data.notes
                ? `${rma.internalNotes ?? ''}\n[Approval] ${data.notes}`.trim()
                : rma.internalNotes,
              updatedBy: ctx.user.id,
            })
            .where(eq(returnAuthorizations.id, rma.id));
          updated.push(rma.id);
        }
      });
    }

    return { updated: updated.length, failed };
  });

// ============================================================================
// WORKFLOW: RECEIVE RMA
// ============================================================================

/**
 * Mark RMA items as received (approved → received).
 * Restores inventory: creates return movements, cost layers, and activity log.
 */
export const receiveRma = createServerFn({ method: 'POST' })
  .inputValidator(receiveRmaSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<RmaResponse>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });
    const now = new Date().toISOString();

    const response = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get existing RMA
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

      // Validate transition
      if (!isValidRmaTransition(existing.status, 'received')) {
        throw createSerializedMutationError(
          `Cannot receive RMA in ${existing.status} status. Must be in 'approved' status.`,
          'transition_blocked'
        );
      }

      // Build inspection notes
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

      // Update RMA
      const [updated] = await tx
        .update(returnAuthorizations)
        .set({
          status: 'received',
          receivedAt: now,
          receivedBy: ctx.user.id,
          inspectionNotes,
          updatedBy: ctx.user.id,
        })
        .where(eq(returnAuthorizations.id, data.rmaId))
        .returning();

      // Get line items with order line and product info
      const lineItemsWithProduct = await tx
        .select({
          rmaLineItem: rmaLineItems,
          productId: orderLineItems.productId,
          isSerialized: products.isSerialized,
          costPrice: products.costPrice,
        })
        .from(rmaLineItems)
        .innerJoin(orderLineItems, eq(rmaLineItems.orderLineItemId, orderLineItems.id))
        .innerJoin(products, eq(orderLineItems.productId, products.id))
        .where(
          and(
            eq(rmaLineItems.rmaId, data.rmaId),
            eq(orderLineItems.organizationId, ctx.organizationId),
            eq(products.organizationId, ctx.organizationId)
          )
        );

      // Resolve default location (first org warehouse)
      const [firstLocation] = await tx
        .select({ id: warehouseLocations.id })
        .from(warehouseLocations)
        .where(eq(warehouseLocations.organizationId, ctx.organizationId))
        .limit(1);

      if (!firstLocation?.id && lineItemsWithProduct.length > 0) {
        throw new ValidationError(
          'No warehouse location found. Create a warehouse location before receiving returns.'
        );
      }

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

        if (!productId) continue;

        unitsRestored += qty;

        if (isSerialized) {
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
          const locationId = firstLocation!.id;
          const [existingInv] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.organizationId, ctx.organizationId),
                eq(inventory.productId, productId),
                eq(inventory.locationId, locationId),
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
                status: 'available',
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

      const lineItems = await tx
        .select(rmaLineItemsProjection)
        .from(rmaLineItems)
        .where(eq(rmaLineItems.rmaId, data.rmaId));

      return {
        ...updated,
        lineItems: lineItems as RmaLineItemResponse[],
        unitsRestored,
      } as RmaResponse;
    });

    return serializedMutationSuccess(response, `RMA ${response.rmaNumber} received.`, {
      affectedIds: [response.id],
    });
  });

// ============================================================================
// WORKFLOW: BULK RECEIVE RMA
// ============================================================================

/**
 * Bulk receive RMAs (approved → received).
 * Each RMA is processed in its own transaction; failures are collected.
 * Requires inventory.receive permission.
 */
export const bulkReceiveRma = createServerFn({ method: 'POST' })
  .inputValidator(bulkReceiveRmaSchema)
  .handler(async ({ data }): Promise<BulkRmaResult> => {
    await withAuth({ permission: PERMISSIONS.inventory.receive });
    const updated: string[] = [];
    const failed: { rmaId: string; error: string }[] = [];

    for (const rmaId of data.rmaIds) {
      try {
        await receiveRma({
          data: {
            rmaId,
            inspectionNotes: data.inspectionNotes,
          },
        });
        updated.push(rmaId);
      } catch (err) {
        failed.push({
          rmaId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { updated: updated.length, failed };
  });

// ============================================================================
// WORKFLOW: PROCESS RMA
// ============================================================================

/**
 * Process/complete an RMA (received → processed)
 */
export const processRma = createServerFn({ method: 'POST' })
  .inputValidator(processRmaSchema)
  .handler(async ({ data }): Promise<RmaResponse> => {
    const ctx = await withAuth();
    const now = new Date().toISOString();

    // Get existing RMA
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

    // Validate transition
    if (!isValidRmaTransition(existing.status, 'processed')) {
      throw new ValidationError(
        `Cannot process RMA in ${existing.status} status. Must be in 'received' status.`
      );
    }

    // Build resolution details
    const resolutionDetails = data.resolutionDetails
      ? {
          ...data.resolutionDetails,
          resolvedAt: now,
          resolvedBy: ctx.user.id,
        }
      : {
          resolvedAt: now,
          resolvedBy: ctx.user.id,
        };

    // Update RMA
    const [updated] = await db
      .update(returnAuthorizations)
      .set({
        status: 'processed',
        processedAt: now,
        processedBy: ctx.user.id,
        resolution: data.resolution,
        resolutionDetails,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, data.rmaId))
      .returning();

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, data.rmaId));

    return {
      ...updated,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });

// ============================================================================
// WORKFLOW: CANCEL RMA
// ============================================================================

/**
 * Cancel an RMA (status-based cancellation)
 */
export const cancelRma = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id: z.string().uuid(),
    reason: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.support?.delete ?? 'support:delete' });
    const logger = createActivityLoggerWithContext(ctx);
    const { id, reason } = data;

    const [existing] = await db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.id, id),
          eq(returnAuthorizations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('RMA not found', 'rma');
    }

    // Guard: Only allow cancellation from requested or approved status
    if (!['requested', 'approved'].includes(existing.status)) {
      throw new ValidationError(`Cannot cancel RMA in '${existing.status}' status. Only requested or approved RMAs can be cancelled.`);
    }

    const [updated] = await db
      .update(returnAuthorizations)
      .set({
        status: 'cancelled',
        internalNotes: reason
          ? `${existing.internalNotes ? existing.internalNotes + '\n' : ''}Cancellation reason: ${reason}`
          : existing.internalNotes,
        updatedBy: ctx.user.id,
      })
      .where(eq(returnAuthorizations.id, id))
      .returning();

    logger.logAsync({
      entityType: 'rma',
      entityId: id,
      action: 'updated',
      description: `Cancelled RMA: ${existing.rmaNumber}${reason ? ` - ${reason}` : ''}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: 'cancelled',
        reason,
      },
    });

    return updated;
  });
