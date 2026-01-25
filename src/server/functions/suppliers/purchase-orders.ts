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
import { PERMISSIONS } from '@/lib/constants';

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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

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
      throw new Error('Purchase order not found');
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.CREATE });

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

    return po;
  });

/**
 * Update a purchase order (draft only)
 */
export const updatePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(updatePurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const { id, ...updateData } = data;

    // Check if PO is in draft status
    const existing = await db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error('Purchase order not found');
    }

    if (existing[0].status !== 'draft') {
      throw new Error('Can only update draft purchase orders');
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

    return result[0];
  });

/**
 * Delete a purchase order (draft only)
 */
export const deletePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(getPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.DELETE });

    // Check if PO is in draft status
    const existing = await db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error('Purchase order not found');
    }

    if (existing[0].status !== 'draft') {
      throw new Error('Can only delete draft purchase orders');
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'pending_approval',
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'draft'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or not in draft status');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'approved',
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
        approvalNotes: data.notes,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'pending_approval'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or not pending approval');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.APPROVE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'draft', // Return to draft for revision
        approvalNotes: `Rejected: ${data.reason}`,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'pending_approval'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or not pending approval');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'ordered',
        orderedBy: ctx.user.id,
        orderedAt: new Date(),
        supplierReference: data.supplierReference,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          eq(purchaseOrders.status, 'approved'),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or not approved');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'cancelled',
        closedBy: ctx.user.id,
        closedAt: new Date(),
        closedReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          sql`${purchaseOrders.status} NOT IN ('received', 'closed', 'cancelled')`,
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or cannot be cancelled');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const result = await db
      .update(purchaseOrders)
      .set({
        status: 'closed',
        closedBy: ctx.user.id,
        closedAt: new Date(),
        closedReason: data.reason,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(purchaseOrders.id, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          sql`${purchaseOrders.status} IN ('received', 'partial_received', 'ordered')`,
          isNull(purchaseOrders.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Purchase order not found or cannot be closed');
    }

    return result[0];
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    // Check if PO is in draft status
    const po = await db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!po[0]) {
      throw new Error('Purchase order not found');
    }

    if (po[0].status !== 'draft') {
      throw new Error('Can only add items to draft purchase orders');
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
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    // Get the item and PO
    const item = await db
      .select({
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, data.itemId))
      .limit(1);

    if (!item[0]) {
      throw new Error('Item not found');
    }

    // Check if PO is in draft status
    const po = await db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, item[0].purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!po[0] || po[0].status !== 'draft') {
      throw new Error('Can only remove items from draft purchase orders');
    }

    // Delete the item
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, data.itemId));

    // Update PO totals
    await recalculatePurchaseOrderTotals(item[0].purchaseOrderId, ctx.user.id);

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
