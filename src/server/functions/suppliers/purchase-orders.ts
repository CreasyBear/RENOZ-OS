/**
 * Purchase Orders Server Functions
 *
 * Complete purchase order lifecycle management.
 * Includes CRUD operations, approval workflow, and receiving.
 *
 * @see drizzle/schema/suppliers/purchase-orders.ts
 * @see drizzle/schema/suppliers/purchase-order-items.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, ilike, desc, asc, sql, gte, lte, count, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { currencySchema, percentageSchema } from '@/lib/schemas/_shared/patterns';
import { purchaseOrders, purchaseOrderItems, suppliers } from 'drizzle/schema/suppliers';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// Excluded fields for activity logging (system-managed fields)
const PO_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
  'version',
];

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPurchaseOrdersSchema = z.object({
  supplierId: z.string().uuid().optional(),
  status: z
    .enum([
      'draft',
      'pending_approval',
      'approved',
      'ordered',
      'partial_received',
      'received',
      'closed',
      'cancelled',
    ])
    .optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z
    .enum(['poNumber', 'orderDate', 'requiredDate', 'totalAmount', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const getPurchaseOrderSchema = z.object({
  id: z.string().uuid(),
});

const addressSchema = z.object({
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
});

const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string(),
  productSku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().min(1),
  unitOfMeasure: z.string().default('each'),
  unitPrice: currencySchema,
  discountPercent: percentageSchema.default(0),
  taxRate: percentageSchema.default(10), // GST default 10%
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  notes: z.string().optional(),
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  requiredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  shipToAddress: addressSchema.optional(),
  billToAddress: addressSchema.optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().default('AUD'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  internalReference: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1),
});

const updatePurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  requiredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  shipToAddress: addressSchema.optional(),
  billToAddress: addressSchema.optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  internalReference: z.string().optional(),
});

// ============================================================================
// PURCHASE ORDER CRUD
// ============================================================================

/**
 * List purchase orders with filtering and pagination
 */
export const listPurchaseOrders = createServerFn({ method: 'GET' })
  .inputValidator(listPurchaseOrdersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const {
      supplierId,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions
    const conditions = [
      eq(purchaseOrders.organizationId, ctx.organizationId),
      isNull(purchaseOrders.deletedAt),
    ];

    if (supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, supplierId));
    }

    if (status) {
      conditions.push(eq(purchaseOrders.status, status));
    }

    if (search) {
      conditions.push(ilike(purchaseOrders.poNumber, containsPattern(search)));
    }

    if (startDate) {
      conditions.push(gte(purchaseOrders.orderDate, startDate));
    }

    if (endDate) {
      conditions.push(lte(purchaseOrders.orderDate, endDate));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db.select({ count: count() }).from(purchaseOrders).where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results with supplier name
    const offset = (page - 1) * pageSize;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    let orderColumn;
    switch (sortBy) {
      case 'poNumber':
        orderColumn = purchaseOrders.poNumber;
        break;
      case 'orderDate':
        orderColumn = purchaseOrders.orderDate;
        break;
      case 'requiredDate':
        orderColumn = purchaseOrders.requiredDate;
        break;
      case 'totalAmount':
        orderColumn = purchaseOrders.totalAmount;
        break;
      case 'status':
        orderColumn = purchaseOrders.status;
        break;
      case 'createdAt':
      default:
        orderColumn = purchaseOrders.createdAt;
    }

    const items = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        requiredDate: purchaseOrders.requiredDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single purchase order with items
 */
export const getPurchaseOrder = createServerFn({ method: 'GET' })
  .inputValidator(getPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    // Get the purchase order with supplier info
    const poResult = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!poResult[0]) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    // Get the line items
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        lineNumber: purchaseOrderItems.lineNumber,
        productId: purchaseOrderItems.productId,
        productName: purchaseOrderItems.productName,
        productSku: purchaseOrderItems.productSku,
        description: purchaseOrderItems.description,
        quantity: purchaseOrderItems.quantity,
        unitOfMeasure: purchaseOrderItems.unitOfMeasure,
        unitPrice: purchaseOrderItems.unitPrice,
        discountPercent: purchaseOrderItems.discountPercent,
        taxRate: purchaseOrderItems.taxRate,
        lineTotal: purchaseOrderItems.lineTotal,
        quantityReceived: purchaseOrderItems.quantityReceived,
        quantityRejected: purchaseOrderItems.quantityRejected,
        quantityPending: purchaseOrderItems.quantityPending,
        expectedDeliveryDate: purchaseOrderItems.expectedDeliveryDate,
        actualDeliveryDate: purchaseOrderItems.actualDeliveryDate,
        notes: purchaseOrderItems.notes,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, data.id))
      .orderBy(asc(purchaseOrderItems.lineNumber));

    return {
      ...poResult[0].po,
      supplierName: poResult[0].supplierName,
      supplierEmail: poResult[0].supplierEmail,
      supplierPhone: poResult[0].supplierPhone,
      items,
    };
  });

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(createPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.create });

    // Get supplier name for logging
    const [supplier] = await db
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, data.supplierId))
      .limit(1);

    // Calculate totals from items
    let subtotal = 0;
    let taxAmount = 0;

    const itemsWithTotals = data.items.map((item, index) => {
      const discountMultiplier = 1 - item.discountPercent / 100;
      const lineSubtotal = item.quantity * item.unitPrice * discountMultiplier;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        ...item,
        lineNumber: index + 1,
        lineTotal,
      };
    });

    const totalAmount = subtotal + taxAmount;

    // Create the purchase order
    const [po] = await db
      .insert(purchaseOrders)
      .values({
        organizationId: ctx.organizationId,
        supplierId: data.supplierId,
        status: 'draft',
        orderDate: sql`CURRENT_DATE`,
        requiredDate: data.requiredDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        shipToAddress: data.shipToAddress,
        billToAddress: data.billToAddress,
        subtotal,
        taxAmount,
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount,
        currency: data.currency,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        internalNotes: data.internalNotes,
        internalReference: data.internalReference,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    // Create the line items
    await db.insert(purchaseOrderItems).values(
      itemsWithTotals.map((item) => ({
        organizationId: ctx.organizationId,
        purchaseOrderId: po.id,
        lineNumber: item.lineNumber,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
        quantityPending: item.quantity,
        expectedDeliveryDate: item.expectedDeliveryDate,
        notes: item.notes,
      }))
    );

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: po.id,
      action: 'created',
      description: `Created purchase order: ${po.poNumber}`,
      changes: computeChanges({
        before: null,
        after: po,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: po.poNumber ?? undefined,
        supplierId: po.supplierId,
        supplierName: supplier?.name,
        total: Number(po.totalAmount),
        lineItemCount: data.items.length,
        status: po.status,
      },
    });

    return po;
  });

/**
 * Update a purchase order (draft only)
 */
export const updatePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(updatePurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const { id, ...updateData } = data;

    // Check if PO is in draft status and get full record for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    if (existing.po.status !== 'draft') {
      throw new ValidationError('Can only update draft purchase orders');
    }

    const updates: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    if (updateData.requiredDate !== undefined) updates.requiredDate = updateData.requiredDate;
    if (updateData.expectedDeliveryDate !== undefined)
      updates.expectedDeliveryDate = updateData.expectedDeliveryDate;
    if (updateData.shipToAddress !== undefined) updates.shipToAddress = updateData.shipToAddress;
    if (updateData.billToAddress !== undefined) updates.billToAddress = updateData.billToAddress;
    if (updateData.paymentTerms !== undefined) updates.paymentTerms = updateData.paymentTerms;
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    if (updateData.internalNotes !== undefined) updates.internalNotes = updateData.internalNotes;
    if (updateData.internalReference !== undefined)
      updates.internalReference = updateData.internalReference;

    const result = await db
      .update(purchaseOrders)
      .set(updates)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, ctx.organizationId)))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Updated purchase order: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        changedFields: Object.keys(updateData),
      },
    });

    return updatedPo;
  });

/**
 * Delete a purchase order (draft only)
 */
export const deletePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(getPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.delete });

    // Check if PO is in draft status and get full record for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    if (existing.po.status !== 'draft') {
      throw new ValidationError('Can only delete draft purchase orders');
    }

    // Soft delete the PO (items will remain for audit)
    const result = await db
      .update(purchaseOrders)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning({ id: purchaseOrders.id });

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: existing.po.id,
      action: 'deleted',
      description: `Deleted purchase order: ${existing.po.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: null,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: existing.po.poNumber ?? undefined,
        supplierId: existing.po.supplierId,
        supplierName: existing.supplierName ?? undefined,
      },
    });

    return { success: true, id: result[0].id };
  });

// ============================================================================
// WORKFLOW OPERATIONS
// ============================================================================

/**
 * Submit purchase order for approval
 */
export const submitForApproval = createServerFn({ method: 'POST' })
  .inputValidator(getPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'draft'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found or not in draft status', 'purchaseOrder');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'pending_approval',
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Submitted purchase order for approval: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        total: Number(updatedPo.totalAmount),
      },
    });

    return updatedPo;
  });

/**
 * Approve a purchase order
 */
export const approvePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'pending_approval'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found or not pending approval', 'purchaseOrder');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'approved',
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
        approvalNotes: data.notes,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Approved purchase order: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        total: Number(updatedPo.totalAmount),
      },
    });

    return updatedPo;
  });

/**
 * Reject a purchase order
 */
export const rejectPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      reason: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'pending_approval'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found or not pending approval', 'purchaseOrder');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'draft', // Return to draft for revision
        approvalNotes: `Rejected: ${data.reason}`,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Rejected purchase order: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        reason: data.reason,
      },
    });

    return updatedPo;
  });

/**
 * Mark purchase order as ordered (sent to supplier)
 */
export const markAsOrdered = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      supplierReference: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'approved'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order not found or not approved', 'purchaseOrder');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'ordered',
        orderedBy: ctx.user.id,
        orderedAt: new Date(),
        supplierReference: data.supplierReference,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Marked purchase order as ordered: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        supplierReference: data.supplierReference,
      },
    });

    return updatedPo;
  });

/**
 * Cancel a purchase order
 */
export const cancelPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      reason: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          sql`${purchaseOrders.status} NOT IN ('received', 'closed', 'cancelled')`,
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new ValidationError('Purchase order not found or cannot be cancelled');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'cancelled',
        closedBy: ctx.user.id,
        closedAt: new Date(),
        closedReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Cancelled purchase order: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        reason: data.reason,
      },
    });

    return updatedPo;
  });

/**
 * Close a purchase order
 */
export const closePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get existing PO for logging
    const [existing] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          sql`${purchaseOrders.status} IN ('received', 'partial_received', 'ordered')`,
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new ValidationError('Purchase order not found or cannot be closed');
    }

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'closed',
        closedBy: ctx.user.id,
        closedAt: new Date(),
        closedReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(eq(purchaseOrders.id, data.id))
      .returning();

    const updatedPo = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: updatedPo.id,
      action: 'updated',
      description: `Closed purchase order: ${updatedPo.poNumber}`,
      changes: computeChanges({
        before: existing.po,
        after: updatedPo,
        excludeFields: PO_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        poNumber: updatedPo.poNumber ?? undefined,
        supplierId: updatedPo.supplierId,
        supplierName: existing.supplierName ?? undefined,
        previousStatus: existing.po.status,
        newStatus: updatedPo.status,
        reason: data.reason,
      },
    });

    return updatedPo;
  });

// ============================================================================
// LINE ITEM OPERATIONS
// ============================================================================

/**
 * Add item to a draft purchase order
 */
export const addPurchaseOrderItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      purchaseOrderId: z.string().uuid(),
      item: purchaseOrderItemSchema,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Check if PO is in draft status and get full record for logging
    const [poResult] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!poResult) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    if (poResult.po.status !== 'draft') {
      throw new ValidationError('Can only add items to draft purchase orders');
    }

    // Get the next line number
    const lastItem = await db
      .select({ lineNumber: purchaseOrderItems.lineNumber })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId))
      .orderBy(desc(purchaseOrderItems.lineNumber))
      .limit(1);

    const lineNumber = (lastItem[0]?.lineNumber ?? 0) + 1;

    // Calculate line total
    const discountMultiplier = 1 - data.item.discountPercent / 100;
    const lineSubtotal = data.item.quantity * data.item.unitPrice * discountMultiplier;
    const lineTax = lineSubtotal * (data.item.taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    // Insert the item
    const [newItem] = await db
      .insert(purchaseOrderItems)
      .values({
        organizationId: ctx.organizationId,
        purchaseOrderId: data.purchaseOrderId,
        lineNumber,
        productId: data.item.productId,
        productName: data.item.productName,
        productSku: data.item.productSku,
        description: data.item.description,
        quantity: data.item.quantity,
        unitOfMeasure: data.item.unitOfMeasure,
        unitPrice: data.item.unitPrice,
        discountPercent: data.item.discountPercent,
        taxRate: data.item.taxRate,
        lineTotal,
        quantityPending: data.item.quantity,
        expectedDeliveryDate: data.item.expectedDeliveryDate,
        notes: data.item.notes,
      })
      .returning();

    // Update PO totals
    await recalculatePurchaseOrderTotals(data.purchaseOrderId, ctx.user.id);

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: data.purchaseOrderId,
      action: 'updated',
      description: `Added item to purchase order: ${poResult.po.poNumber}`,
      metadata: {
        poNumber: poResult.po.poNumber ?? undefined,
        supplierId: poResult.po.supplierId,
        supplierName: poResult.supplierName ?? undefined,
        productId: data.item.productId,
        productName: data.item.productName,
        quantity: data.item.quantity,
        lineTotal: Number(lineTotal),
      },
    });

    return newItem;
  });

/**
 * Remove item from a draft purchase order
 */
export const removePurchaseOrderItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      itemId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get the item with full details for logging
    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, data.itemId))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Item not found', 'purchaseOrderItem');
    }

    // Check if PO is in draft status and get full record for logging
    const [poResult] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq(purchaseOrders.id, item.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!poResult || poResult.po.status !== 'draft') {
      throw new ValidationError('Can only remove items from draft purchase orders');
    }

    // Delete the item
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, data.itemId));

    // Update PO totals
    await recalculatePurchaseOrderTotals(item.purchaseOrderId, ctx.user.id);

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'purchase_order',
      entityId: item.purchaseOrderId,
      action: 'updated',
      description: `Removed item from purchase order: ${poResult.po.poNumber}`,
      metadata: {
        poNumber: poResult.po.poNumber ?? undefined,
        supplierId: poResult.po.supplierId,
        supplierName: poResult.supplierName ?? undefined,
        productId: item.productId ?? undefined,
        productName: item.productName,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
      },
    });

    return { success: true };
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recalculate purchase order totals from line items
 */
async function recalculatePurchaseOrderTotals(
  purchaseOrderId: string,
  userId: string
): Promise<void> {
  const totals = await db
    .select({
      subtotal: sql<number>`SUM(${purchaseOrderItems.lineTotal} / (1 + ${purchaseOrderItems.taxRate}::numeric / 100))`,
      taxAmount: sql<number>`SUM(${purchaseOrderItems.lineTotal} - (${purchaseOrderItems.lineTotal} / (1 + ${purchaseOrderItems.taxRate}::numeric / 100)))`,
      totalAmount: sql<number>`SUM(${purchaseOrderItems.lineTotal})`,
    })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

  await db
    .update(purchaseOrders)
    .set({
      subtotal: totals[0]?.subtotal ?? 0,
      taxAmount: totals[0]?.taxAmount ?? 0,
      totalAmount: totals[0]?.totalAmount ?? 0,
      updatedBy: userId,
    })
    .where(eq(purchaseOrders.id, purchaseOrderId));
}
