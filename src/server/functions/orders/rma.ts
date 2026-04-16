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
import { eq, and, desc, asc, sql, ilike, count, isNull, inArray, isNotNull, type SQL } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { z } from 'zod';
import { db, type TransactionExecutor } from '@/lib/db';
import {
  returnAuthorizations,
  rmaLineItems,
  generateRmaNumber,
  isValidRmaTransition,
} from 'drizzle/schema/support/return-authorizations';
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
import { resolveIssueAnchors } from '@/server/functions/support/_shared/issue-anchor-resolution';
import {
  ACTIVE_RMA_STATUSES,
  getIssueRemedyContext,
  SHIPPED_RMA_ELIGIBLE_SHIPMENT_STATUSES,
} from '@/server/functions/support/_shared/issue-remedy-context';
import {
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  createRmaSchema,
  updateRmaSchema,
  getRmaSchema,
  getRmaLookupSchema,
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
  type RmaProcessResult,
} from '@/lib/schemas/support/rma';
import {
  executeRmaRemedy,
} from './_shared/rma-remedy-execution';
import {
  buildBlockedRmaExecutionState,
  buildCompletedRmaExecutionState,
  buildPendingRmaExecutionState,
} from './_shared/rma-execution-state';
import {
  createRmaReadModel,
  rmaLineItemsProjection,
  type RmaRow,
} from './_shared/rma-read-model';

// ============================================================================
// HELPERS
// ============================================================================

const rmaReadModel = createRmaReadModel();

type RmaListFilterInput = Pick<
  z.infer<typeof listRmasSchema>,
  'status' | 'reason' | 'customerId' | 'orderId' | 'issueId' | 'resolution' | 'executionStatus' | 'search'
> &
  Pick<z.infer<typeof listRmasCursorSchema>, 'linkedIssueOpenState'>;

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

function buildLinkedIssueStateCondition(
  organizationId: string,
  linkedIssueOpenState?: 'any' | 'open' | 'closed'
): SQL<unknown> | null {
  if (linkedIssueOpenState === 'open') {
    return sql`EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = ${returnAuthorizations.issueId}
        AND i.organization_id = ${organizationId}
        AND i.status NOT IN ('resolved', 'closed')
    )`;
  }

  if (linkedIssueOpenState === 'closed') {
    return sql`EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = ${returnAuthorizations.issueId}
        AND i.organization_id = ${organizationId}
        AND i.status IN ('resolved', 'closed')
    )`;
  }

  return null;
}

function buildRmaListConditions(
  organizationId: string,
  filters: RmaListFilterInput
): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [
    eq(returnAuthorizations.organizationId, organizationId),
  ];

  if (filters.status) {
    conditions.push(eq(returnAuthorizations.status, filters.status));
  }
  if (filters.reason) {
    conditions.push(eq(returnAuthorizations.reason, filters.reason));
  }
  if (filters.customerId) {
    conditions.push(eq(returnAuthorizations.customerId, filters.customerId));
  }
  if (filters.orderId) {
    conditions.push(eq(returnAuthorizations.orderId, filters.orderId));
  }
  if (filters.issueId) {
    conditions.push(eq(returnAuthorizations.issueId, filters.issueId));
  }
  if (filters.resolution) {
    conditions.push(eq(returnAuthorizations.resolution, filters.resolution));
  }
  if (filters.executionStatus) {
    conditions.push(eq(returnAuthorizations.executionStatus, filters.executionStatus));
  }

  const linkedIssueStateCondition = buildLinkedIssueStateCondition(
    organizationId,
    filters.linkedIssueOpenState
  );
  if (linkedIssueStateCondition) {
    conditions.push(linkedIssueStateCondition);
  }

  if (filters.search) {
    conditions.push(ilike(returnAuthorizations.rmaNumber, containsPattern(filters.search)));
  }

  return conditions;
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
    const ctx = await withAuth({ permission: PERMISSIONS.support.create });

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

      const anchorResolution = await resolveIssueAnchors(ctx.organizationId, {
        warrantyId: issue.warrantyId,
        warrantyEntitlementId: issue.warrantyEntitlementId,
        orderId: issue.orderId,
        shipmentId: issue.shipmentId,
        productId: issue.productId,
        serializedItemId: issue.serializedItemId,
        serviceSystemId: issue.serviceSystemId,
        serialNumber: issue.serialNumber,
      });
      const remedyContext = await getIssueRemedyContext({
        organizationId: ctx.organizationId,
        issue: {
          id: issue.id,
          status: issue.status,
          orderId: anchorResolution.anchors.orderId,
          serializedItemId: anchorResolution.anchors.serializedItemId,
          serialNumber: anchorResolution.anchors.serialNumber,
          resolutionCategory: issue.resolutionCategory,
          resolutionNotes: issue.resolutionNotes,
          diagnosisNotes: issue.diagnosisNotes,
          nextActionType: issue.nextActionType,
          resolvedAt: issue.resolvedAt,
          resolvedByUserId: issue.resolvedByUserId,
        },
        supportContext: anchorResolution.supportContext,
      });

      if (!remedyContext.rmaReadiness.sourceOrder?.id) {
        throw new ValidationError(
          remedyContext.rmaReadiness.blockedReason ??
            'Source order could not be resolved from the issue context.'
        );
      }

      if (remedyContext.rmaReadiness.sourceOrder.id !== data.orderId) {
        throw new ValidationError(
          'The selected order does not match the source order resolved from the issue.'
        );
      }

      if (remedyContext.rmaReadiness.state !== 'ready') {
        throw new ValidationError(
          remedyContext.rmaReadiness.blockedReason ??
            'This issue is not currently ready for RMA creation.'
        );
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

        const requestedQuantityByLine = new Map<string, number>();
        const requestedSerials = new Set<string>();

        for (const item of data.lineItems) {
          const isSerialized = lineItemProductMap.get(item.orderLineItemId) ?? false;
          requestedQuantityByLine.set(
            item.orderLineItemId,
            (requestedQuantityByLine.get(item.orderLineItemId) ?? 0) + item.quantityReturned
          );

          if (isSerialized && item.quantityReturned !== 1) {
            throw new ValidationError(
              'Serialized RMA lines must return exactly one unit per serial number.'
            );
          }

          if (item.serialNumber) {
            const normalizedSerial = normalizeSerial(item.serialNumber);
            if (requestedSerials.has(normalizedSerial)) {
              throw new ValidationError(
                `Serial "${normalizedSerial}" is listed more than once in this RMA request.`
              );
            }
            requestedSerials.add(normalizedSerial);
          }
        }

        const shippedQuantities = await tx
          .select({
            orderLineItemId: shipmentItems.orderLineItemId,
            shippedQuantity: sql<number>`COALESCE(SUM(${shipmentItems.quantity}), 0)`,
          })
          .from(shipmentItems)
          .innerJoin(orderShipments, eq(shipmentItems.shipmentId, orderShipments.id))
          .where(
            and(
              eq(orderShipments.organizationId, ctx.organizationId),
              eq(orderShipments.orderId, data.orderId),
              inArray(shipmentItems.orderLineItemId, lineItemIds),
              inArray(orderShipments.status, [...SHIPPED_RMA_ELIGIBLE_SHIPMENT_STATUSES])
            )
          )
          .groupBy(shipmentItems.orderLineItemId);

        const shippedQuantityByLine = new Map(
          shippedQuantities.map((row) => [row.orderLineItemId, Number(row.shippedQuantity ?? 0)])
        );

        const activeClaimedQuantities = await tx
          .select({
            orderLineItemId: rmaLineItems.orderLineItemId,
            activeQuantity: sql<number>`COALESCE(SUM(${rmaLineItems.quantityReturned}), 0)`,
          })
          .from(rmaLineItems)
          .innerJoin(returnAuthorizations, eq(rmaLineItems.rmaId, returnAuthorizations.id))
          .where(
            and(
              eq(returnAuthorizations.organizationId, ctx.organizationId),
              eq(returnAuthorizations.orderId, data.orderId),
              inArray(returnAuthorizations.status, [...ACTIVE_RMA_STATUSES]),
              inArray(rmaLineItems.orderLineItemId, lineItemIds)
            )
          )
          .groupBy(rmaLineItems.orderLineItemId);

        const activeClaimedQuantityByLine = new Map(
          activeClaimedQuantities.map((row) => [row.orderLineItemId, Number(row.activeQuantity ?? 0)])
        );

        for (const [orderLineItemId, requestedQuantity] of requestedQuantityByLine) {
          const shippedQuantity = shippedQuantityByLine.get(orderLineItemId) ?? 0;
          const activeClaimedQuantity = activeClaimedQuantityByLine.get(orderLineItemId) ?? 0;
          const remainingReturnable = Math.max(shippedQuantity - activeClaimedQuantity, 0);

          if (requestedQuantity > remainingReturnable) {
            throw new ValidationError(
              `Requested return quantity exceeds shipped quantity available for line ${orderLineItemId}. ${remainingReturnable} unit(s) remain returnable.`
            );
          }
        }

        if (requestedSerials.size > 0) {
          const activeSerialClaims = await tx
            .select({ serialNumber: rmaLineItems.serialNumber })
            .from(rmaLineItems)
            .innerJoin(returnAuthorizations, eq(rmaLineItems.rmaId, returnAuthorizations.id))
            .where(
              and(
                eq(returnAuthorizations.organizationId, ctx.organizationId),
                eq(returnAuthorizations.orderId, data.orderId),
                inArray(returnAuthorizations.status, [...ACTIVE_RMA_STATUSES]),
                inArray(
                  rmaLineItems.serialNumber,
                  Array.from(requestedSerials)
                )
              )
            );

          const alreadyClaimedSerial = activeSerialClaims
            .map((row) => row.serialNumber)
            .find((serial): serial is string => Boolean(serial));

          if (alreadyClaimedSerial) {
            throw createSerializedMutationError(
              `Serial "${alreadyClaimedSerial}" is already attached to an active RMA.`,
              'invalid_serial_state'
            );
          }
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

      const lineItems = await tx
        .select(rmaLineItemsProjection)
        .from(rmaLineItems)
        .where(eq(rmaLineItems.rmaId, rma.id));

      return { rma, lineItems: lineItems as RmaLineItemResponse[] };
    });

    const response = await rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: result.rma,
      profile: 'summary',
      preloadedLineItems: result.lineItems,
    });

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
  .inputValidator(normalizeObjectInput(getRmaSchema))
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

    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma,
      profile: 'detail',
      preloadedLineItems: lineItems,
    });
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

    const conditions = buildRmaListConditions(ctx.organizationId, data);

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

    return {
      data: await rmaReadModel.loadMany({
        organizationId: ctx.organizationId,
        rmas,
        profile: 'summary',
      }),
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
    const {
      cursor,
      pageSize = 20,
      sortOrder = 'desc',
      status,
      reason,
      customerId,
      orderId,
      issueId,
      resolution,
      executionStatus,
      linkedIssueOpenState,
      search,
    } = data;

    const conditions = buildRmaListConditions(ctx.organizationId, {
      status,
      reason,
      customerId,
      orderId,
      issueId,
      resolution,
      executionStatus,
      linkedIssueOpenState,
      search,
    });

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

    const items = await rmaReadModel.loadMany({
      organizationId: ctx.organizationId,
      rmas: rmaRows,
      profile: 'summary',
    });

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
    const ctx = await withAuth({ permission: PERMISSIONS.support.update });

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
    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: updated as RmaRow,
      profile: 'summary',
    });
  });

// ============================================================================
// RMA BY RMA NUMBER
// ============================================================================

/**
 * Get RMA by RMA number (for lookups)
 */
export const getRmaByNumber = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(getRmaLookupSchema)
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
    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma,
      profile: 'summary',
    });
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
    normalizeObjectInput(
      getRmaSchema.extend({
        rmaId: getRmaSchema.shape.rmaId.optional(),
        issueId: getRmaSchema.shape.rmaId,
      })
    )
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

    return rmaReadModel.loadMany({
      organizationId: ctx.organizationId,
      rmas,
      profile: 'summary',
    });
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
    const ctx = await withAuth({ permission: PERMISSIONS.support.update });
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
    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: updated as RmaRow,
      profile: 'summary',
    });
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
    const ctx = await withAuth({ permission: PERMISSIONS.support.update });
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
    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: updated as RmaRow,
      profile: 'summary',
    });
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
          ...buildPendingRmaExecutionState(),
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

      // Resolve explicit receiving location so returns never silently land in an arbitrary bin
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

      const response = await rmaReadModel.loadOne({
        executor: tx as unknown as TransactionExecutor,
        organizationId: ctx.organizationId,
        rma: updated as RmaRow,
        profile: 'summary',
      });
      response.unitsRestored = unitsRestored;
      return response;
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
            locationId: data.locationId,
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
 * Execute the selected remedy for an RMA (received → processed).
 */
export const processRma = createServerFn({ method: 'POST' })
  .inputValidator(processRmaSchema)
  .handler(async ({ data }): Promise<RmaProcessResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.update });

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

    // Validate transition
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
      const result = await db.transaction(async (tx) => {
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

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute the selected remedy.';
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
  .handler(async ({ data }): Promise<RmaResponse> => {
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

    return rmaReadModel.loadOne({
      organizationId: ctx.organizationId,
      rma: updated as RmaRow,
      profile: 'summary',
    });
  });
