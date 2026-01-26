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
import { eq, and, desc, asc, sql, like, count } from 'drizzle-orm';
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
import {
  createRmaSchema,
  updateRmaSchema,
  getRmaSchema,
  listRmasSchema,
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

/**
 * Get next sequence number for RMA generation
 */
async function getNextRmaSequence(organizationId: string): Promise<number> {
  const [result] = await db
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

    // Get next sequence number and generate RMA number
    const sequenceNumber = await getNextRmaSequence(ctx.organizationId);
    const rmaNumber = generateRmaNumber(sequenceNumber);

    // Verify order exists and belongs to organization
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, data.orderId), eq(orders.organizationId, ctx.organizationId)))
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

    // Create RMA in transaction
    const result = await db.transaction(async (tx) => {
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
              sql`${orderLineItems.id} = ANY(${lineItemIds})`
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
      const lineItems = await tx.select().from(rmaLineItems).where(eq(rmaLineItems.rmaId, rma.id));

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
  .handler(async ({ data }): Promise<RmaResponse | null> => {
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
      return null;
    }

    // Get line items
    const lineItems = await db.select().from(rmaLineItems).where(eq(rmaLineItems.rmaId, rma.id));

    // Get customer if exists
    let customer = null;
    if (rma.customerId) {
      const [c] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, rma.customerId))
        .limit(1);
      customer = c ?? null;
    }

    // Get issue if exists
    let issue = null;
    if (rma.issueId) {
      const [i] = await db
        .select({ id: issues.id, title: issues.title })
        .from(issues)
        .where(eq(issues.id, rma.issueId))
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
      conditions.push(like(returnAuthorizations.rmaNumber, `%${data.search}%`));
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

    // Fetch line items for all RMAs
    const rmaIds = rmas.map((r) => r.id);
    const allLineItems =
      rmaIds.length > 0
        ? await db
            .select()
            .from(rmaLineItems)
            .where(sql`${rmaLineItems.rmaId} = ANY(${rmaIds})`)
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
    const lineItems = await db.select().from(rmaLineItems).where(eq(rmaLineItems.rmaId, rmaId));

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
  .handler(async ({ data }): Promise<RmaResponse | null> => {
    const ctx = await withAuth();

    // Build query based on provided identifier
    const condition = data.rmaId
      ? eq(returnAuthorizations.id, data.rmaId)
      : like(returnAuthorizations.rmaNumber, `%${data.rmaNumber}%`);

    const [rma] = await db
      .select()
      .from(returnAuthorizations)
      .where(and(condition, eq(returnAuthorizations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!rma) {
      return null;
    }

    // Get line items
    const lineItems = await db.select().from(rmaLineItems).where(eq(rmaLineItems.rmaId, rma.id));

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
      .orderBy(desc(returnAuthorizations.createdAt));

    // Fetch line items for all RMAs
    const rmaIds = rmas.map((r) => r.id);
    const allLineItems =
      rmaIds.length > 0
        ? await db
            .select()
            .from(rmaLineItems)
            .where(sql`${rmaLineItems.rmaId} = ANY(${rmaIds})`)
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
      .select()
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
      .select()
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
      .select()
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
      .select()
      .from(rmaLineItems)
      .where(eq(rmaLineItems.rmaId, data.rmaId));

    return {
      ...updated,
      lineItems: lineItems as RmaLineItemResponse[],
    } as RmaResponse;
  });
