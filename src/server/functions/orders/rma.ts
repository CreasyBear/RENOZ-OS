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
import { eq, and, desc, asc, sql, ilike, count, isNull, inArray } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  returnAuthorizations,
  rmaLineItems,
  generateRmaNumber,
  isValidRmaTransition,
} from 'drizzle/schema/support/return-authorizations';
import { customers } from 'drizzle/schema/customers';
import { issues } from 'drizzle/schema/support/issues';
import { orderLineItems, orders } from 'drizzle/schema/orders';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
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
  type RmaResponse,
  type RmaLineItemResponse,
  type ListRmasResponse,
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
 */
async function getNextRmaSequence(
  organizationId: string,
  executor: typeof db = db
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
  .handler(async ({ data }): Promise<RmaResponse> => {
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
      // Get next sequence number inside transaction to prevent duplicate sequences
      const sequenceNumber = await getNextRmaSequence(ctx.organizationId, tx as unknown as typeof db);
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
        // Verify all line items belong to the order
        const lineItemIds = data.lineItems.map((li) => li.orderLineItemId);
        const existingLineItems = await tx
          .select({ id: orderLineItems.id })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.orderId, data.orderId),
              eq(orderLineItems.organizationId, ctx.organizationId),
              inArray(orderLineItems.id, lineItemIds)
            )
          );

        const existingIds = new Set(existingLineItems.map((li) => li.id));
        const invalidIds = lineItemIds.filter((id) => !existingIds.has(id));

        if (invalidIds.length > 0) {
          throw new ValidationError(
            `Invalid line item IDs: ${invalidIds.join(', ')}. Items must belong to the specified order.`
          );
        }

        await tx.insert(rmaLineItems).values(
          data.lineItems.map((item) => ({
            rmaId: rma.id,
            orderLineItemId: item.orderLineItemId,
            quantityReturned: item.quantityReturned,
            itemReason: item.itemReason ?? null,
            serialNumber: item.serialNumber ?? null,
          }))
        );
      }

      // Fetch complete RMA with line items
      const lineItems = await tx
        .select(rmaLineItemsProjection)
        .from(rmaLineItems)
        .where(eq(rmaLineItems.rmaId, rma.id));

      return { rma, lineItems };
    });

    return {
      ...result.rma,
      lineItems: result.lineItems.map((li) => ({
        ...li,
        itemCondition: li.itemCondition,
      })),
    } as RmaResponse;
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

    // Get line items
    const lineItems = await db
      .select(rmaLineItemsProjection)
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, rma.id));

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
      lineItems: lineItems as RmaLineItemResponse[],
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

/**
 * Get all RMAs linked to an issue
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
      .limit(100);

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
// WORKFLOW: RECEIVE RMA
// ============================================================================

/**
 * Mark RMA items as received (approved → received)
 */
export const receiveRma = createServerFn({ method: 'POST' })
  .inputValidator(receiveRmaSchema)
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
    if (!isValidRmaTransition(existing.status, 'received')) {
      throw new ValidationError(
        `Cannot receive RMA in ${existing.status} status. Must be in 'approved' status.`
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
    const [updated] = await db
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

    const existing = await db.query.returnAuthorizations.findFirst({
      where: and(
        eq(returnAuthorizations.id, id),
        eq(returnAuthorizations.organizationId, ctx.organizationId)
      ),
    });

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
