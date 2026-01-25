/**
 * Order Server Functions
 *
 * Comprehensive CRUD operations for orders and order line items.
 * Implements the ORD-CORE-API story acceptance criteria.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/orders.ts for validation schemas
 * @see drizzle/schema/orders.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, isNull, ilike } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import {
  orders,
  orderLineItems,
  customers,
  products,
  type OrderAddress,
  type OrderMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import {
  createOrderSchema,
  updateOrderSchema,
  orderListQuerySchema,
  orderCursorQuerySchema,
  orderParamsSchema,
  createOrderLineItemSchema,
  updateOrderStatusSchema,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/schemas/orders';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';

// ============================================================================
// TYPES
// ============================================================================

type Order = typeof orders.$inferSelect;
type OrderLineItem = typeof orderLineItems.$inferSelect;

interface OrderWithLineItems extends Order {
  lineItems: OrderLineItem[];
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  orderDate: string | null;
  dueDate: string | null;
  total: number | null;
  metadata: Order['metadata'];
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
  itemCount: number;
}

interface ListOrdersResult {
  orders: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// ORDER NUMBER GENERATION
// ============================================================================

/**
 * Generate unique order number with prefix ORD-YYYYMMDD-XXXX
 * Uses retry loop to handle race conditions from concurrent order creation.
 */
async function generateOrderNumber(organizationId: string): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Retry loop to handle concurrent requests
  for (let attempt = 0; attempt < 5; attempt++) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, organizationId),
          sql`DATE(${orders.orderDate}) = CURRENT_DATE`
        )
      );

    const todayCount = (countResult?.count ?? 0) + 1 + attempt;
    const sequence = todayCount.toString().padStart(4, '0');
    const orderNumber = `ORD-${datePrefix}-${sequence}`;

    // Check if this number already exists
    const [existing] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, organizationId),
          eq(orders.orderNumber, orderNumber),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) return orderNumber;
  }

  // Fallback with timestamp for uniqueness
  return `ORD-${datePrefix}-${Date.now().toString(36).toUpperCase()}`;
}

// ============================================================================
// ORDER STATUS WORKFLOW
// ============================================================================

/**
 * Valid status transitions for order workflow.
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['picked', 'cancelled'],
  picked: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validate status transition is allowed.
 */
function validateStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
  return STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

// ============================================================================
// PRICING CALCULATIONS
// ============================================================================

const GST_RATE = 0.1; // Australian GST 10%

/**
 * Calculate line item totals including tax.
 */
function calculateLineItemTotals(lineItem: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxType?: string;
}): { taxAmount: number; lineTotal: number } {
  const subtotal = lineItem.quantity * lineItem.unitPrice;

  // Apply discount
  let discountedAmount = subtotal;
  if (lineItem.discountPercent) {
    discountedAmount -= subtotal * (lineItem.discountPercent / 100);
  }
  if (lineItem.discountAmount) {
    discountedAmount -= lineItem.discountAmount;
  }
  discountedAmount = Math.max(0, discountedAmount);

  // Calculate tax
  const taxAmount = lineItem.taxType === 'exempt' ? 0 : discountedAmount * GST_RATE;

  // Round to 2 decimal places
  const lineTotal = Math.round((discountedAmount + taxAmount) * 100) / 100;

  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    lineTotal,
  };
}

/**
 * Calculate order totals from line items.
 */
function calculateOrderTotals(
  lineItems: Array<{ lineTotal: number; taxAmount: number }>,
  discountPercent?: number | null,
  discountAmount?: number | null,
  shippingAmount: number = 0
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  // Sum line items (line totals include tax)
  const lineSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const lineTaxTotal = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);

  // The subtotal is line totals minus their tax
  const subtotal = lineSubtotal - lineTaxTotal;

  // Apply order-level discount
  let discountAmt = 0;
  if (discountPercent) {
    discountAmt = subtotal * (discountPercent / 100);
  }
  if (discountAmount) {
    discountAmt += discountAmount;
  }
  discountAmt = Math.min(discountAmt, subtotal);

  // Recalculate tax after discount
  const taxableAmount = subtotal - discountAmt + shippingAmount;
  const taxAmount = Math.round(taxableAmount * GST_RATE * 100) / 100;

  // Final total
  const total = Math.round((subtotal - discountAmt + taxAmount + shippingAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmt * 100) / 100,
    taxAmount,
    total,
  };
}

// ============================================================================
// LIST ORDERS (offset pagination)
// ============================================================================

/**
 * List orders with filtering, sorting, and offset pagination.
 */
export const listOrders = createServerFn({ method: 'GET' })
  .inputValidator(orderListQuerySchema)
  .handler(async ({ data }): Promise<ListOrdersResult> => {
    const ctx = await withAuth();
    const {
      page = 1,
      pageSize = 20,
      search,
      sortBy,
      sortOrder,
      status,
      paymentStatus,
      customerId,
      minTotal,
      maxTotal,
      dateFrom,
      dateTo,
    } = data;
    const limit = pageSize;

    // Build where conditions - ALWAYS include organizationId
    const conditions = [eq(orders.organizationId, ctx.organizationId), isNull(orders.deletedAt)];

    // Add filters
    if (search) {
      conditions.push(
        sql`(
          ${orders.orderNumber} ILIKE ${`%${search}%`} OR
          ${orders.internalNotes} ILIKE ${`%${search}%`}
        )`
      );
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus));
    }
    if (customerId) {
      conditions.push(eq(orders.customerId, customerId));
    }
    if (minTotal !== undefined) {
      conditions.push(sql`CAST(${orders.total} AS DECIMAL) >= ${minTotal}`);
    }
    if (maxTotal !== undefined) {
      conditions.push(sql`CAST(${orders.total} AS DECIMAL) <= ${maxTotal}`);
    }
    if (dateFrom) {
      conditions.push(sql`${orders.orderDate} >= ${dateFrom.toISOString().slice(0, 10)}`);
    }
    if (dateTo) {
      conditions.push(sql`${orders.orderDate} <= ${dateTo.toISOString().slice(0, 10)}`);
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Build order clause
    const orderColumn =
      sortBy === 'orderNumber'
        ? orders.orderNumber
        : sortBy === 'total'
          ? orders.total
          : sortBy === 'status'
            ? orders.status
            : orders.createdAt;
    const orderDir = sortOrder === 'asc' ? asc : desc;

    // Get orders with pagination and relations
    const offset = (page - 1) * limit;
    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        orderDate: orders.orderDate,
        dueDate: orders.dueDate,
        total: orders.total,
        metadata: orders.metadata,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Customer relation
        customer: {
          id: customers.id,
          name: customers.name,
        },
        // Count line items
        itemCount: sql<number>`count(${orderLineItems.id})::int`,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .where(and(...conditions))
      .groupBy(orders.id, customers.id, customers.name)
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      orders: orderList,
      total,
      page,
      limit,
      hasMore: offset + orderList.length < total,
    };
  });

// ============================================================================
// LIST ORDERS (cursor pagination)
// ============================================================================

/**
 * List orders with cursor pagination (recommended for large datasets).
 */
export const listOrdersCursor = createServerFn({ method: 'GET' })
  .inputValidator(orderCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const {
      cursor,
      pageSize = 20,
      sortOrder = 'desc',
      status,
      paymentStatus,
      customerId,
      search,
      minTotal,
      maxTotal,
    } = data;

    // Build where conditions
    const conditions = [eq(orders.organizationId, ctx.organizationId), isNull(orders.deletedAt)];

    if (search) {
      conditions.push(ilike(orders.orderNumber, containsPattern(search)));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus));
    }
    if (customerId) {
      conditions.push(eq(orders.customerId, customerId));
    }
    if (minTotal !== undefined) {
      conditions.push(sql`CAST(${orders.total} AS DECIMAL) >= ${minTotal}`);
    }
    if (maxTotal !== undefined) {
      conditions.push(sql`CAST(${orders.total} AS DECIMAL) <= ${maxTotal}`);
    }

    // Add cursor condition
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(orders.createdAt, orders.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(orderDir(orders.createdAt), orderDir(orders.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

// ============================================================================
// GET ORDER
// ============================================================================

/**
 * Get single order with full details including line items.
 */
export const getOrder = createServerFn({ method: 'GET' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();

    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Get line items
    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, data.id))
      .orderBy(asc(orderLineItems.lineNumber));

    return {
      ...order,
      lineItems,
    };
  });

// ============================================================================
// GET ORDER WITH CUSTOMER
// ============================================================================

/**
 * Get order with customer details for display.
 */
export const getOrderWithCustomer = createServerFn({ method: 'GET' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get order with customer join
    const result = await db
      .select({
        order: orders,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          taxId: customers.taxId,
        },
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Get line items with product info
    const lineItems = await db
      .select({
        lineItem: orderLineItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
      .from(orderLineItems)
      .leftJoin(products, eq(orderLineItems.productId, products.id))
      .where(eq(orderLineItems.orderId, data.id))
      .orderBy(asc(orderLineItems.lineNumber));

    return {
      ...result[0].order,
      customer: result[0].customer,
      lineItems: lineItems.map((li) => ({
        ...li.lineItem,
        product: li.product,
      })),
    };
  });

// ============================================================================
// CREATE ORDER
// ============================================================================

/**
 * Create new order with line items.
 */
export const createOrder = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();

    // Validate customer exists and belongs to org
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      throw new ValidationError('Customer not found', {
        customerId: ['Customer does not exist or is not accessible'],
      });
    }

    // Generate order number if not provided
    const orderNumber = data.orderNumber || (await generateOrderNumber(ctx.organizationId));

    // Check order number uniqueness
    const [existingOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          eq(orders.orderNumber, orderNumber),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (existingOrder) {
      throw new ConflictError('Order number already exists');
    }

    // Calculate line item totals
    const lineItemsWithTotals = data.lineItems.map((item, index) => {
      const totals = calculateLineItemTotals({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
        discountAmount: item.discountAmount ? Number(item.discountAmount) : null,
        taxType: item.taxType,
      });
      return {
        ...item,
        lineNumber: item.lineNumber || (index + 1).toString().padStart(3, '0'),
        ...totals,
      };
    });

    // Calculate order totals
    const orderTotals = calculateOrderTotals(
      lineItemsWithTotals,
      data.discountPercent ? Number(data.discountPercent) : null,
      data.discountAmount ? Number(data.discountAmount) : null,
      data.shippingAmount ? Number(data.shippingAmount) : 0
    );

    // Insert order and line items in transaction
    const result = await db.transaction(async (tx) => {
      // Insert order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          organizationId: ctx.organizationId,
          customerId: data.customerId,
          orderNumber,
          status: data.status ?? 'draft',
          paymentStatus: data.paymentStatus ?? 'pending',
          orderDate: data.orderDate ?? new Date().toISOString().slice(0, 10),
          dueDate: data.dueDate ?? undefined,
          billingAddress: data.billingAddress as OrderAddress | undefined,
          shippingAddress: data.shippingAddress as OrderAddress | undefined,
          subtotal: orderTotals.subtotal,
          discountAmount: orderTotals.discountAmount,
          discountPercent: data.discountPercent ? Number(data.discountPercent) : undefined,
          taxAmount: orderTotals.taxAmount,
          shippingAmount: data.shippingAmount ?? 0,
          total: orderTotals.total,
          paidAmount: 0,
          balanceDue: orderTotals.total,
          metadata: data.metadata as OrderMetadata | undefined,
          internalNotes: data.internalNotes,
          customerNotes: data.customerNotes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Insert line items
      const lineItemsToInsert = lineItemsWithTotals.map((item) => ({
        organizationId: ctx.organizationId,
        orderId: newOrder.id,
        productId: item.productId,
        lineNumber: item.lineNumber,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount ?? 0,
        taxType: item.taxType ?? 'gst',
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        qtyPicked: 0,
        qtyShipped: 0,
        qtyDelivered: 0,
        notes: item.notes,
      }));

      const newLineItems = await tx.insert(orderLineItems).values(lineItemsToInsert).returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: newOrder.id,
          action: 'upsert',
          payload: {
            title: newOrder.orderNumber,
            subtitle: newOrder.customerId,
          },
        },
        tx
      );

      return {
        order: newOrder,
        lineItems: newLineItems,
      };
    });

    return {
      ...result.order,
      lineItems: result.lineItems,
    };
  });

// ============================================================================
// UPDATE ORDER
// ============================================================================

/**
 * Update order header information.
 */
export const updateOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateOrderSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<Order> => {
    const ctx = await withAuth();

    // Get existing order
    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Validate customer if changing
    if (data.customerId && data.customerId !== existing.customerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, data.customerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        throw new ValidationError('Customer not found', {
          customerId: ['Customer does not exist'],
        });
      }
    }

    // Validate order number uniqueness if changing
    if (data.orderNumber && data.orderNumber !== existing.orderNumber) {
      const [duplicate] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.orderNumber, data.orderNumber),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictError('Order number already exists');
      }
    }

    // Update order
    const updateData: Record<string, unknown> = { ...data };
    if (data.billingAddress) updateData.billingAddress = data.billingAddress as OrderAddress;
    if (data.shippingAddress) updateData.shippingAddress = data.shippingAddress as OrderAddress;
    if (data.metadata) updateData.metadata = data.metadata as OrderMetadata;
    updateData.updatedAt = new Date();
    updateData.updatedBy = ctx.user.id;

    const updated = await db.transaction(async (tx) => {
      const [result] = await tx.update(orders).set(updateData).where(eq(orders.id, id)).returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: result.id,
          action: 'upsert',
          payload: {
            title: result.orderNumber,
            subtitle: result.customerId,
          },
        },
        tx
      );

      return result;
    });

    return updated;
  });

// ============================================================================
// UPDATE ORDER STATUS
// ============================================================================

/**
 * Update order status with workflow validation.
 */
export const updateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateOrderStatusSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<Order> => {
    const ctx = await withAuth();

    // Get existing order
    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Validate status transition
    const currentStatus = existing.status as OrderStatus;
    const newStatus = data.status as OrderStatus;

    if (!validateStatusTransition(currentStatus, newStatus)) {
      throw new ValidationError('Invalid status transition', {
        status: [`Cannot transition from '${currentStatus}' to '${newStatus}'`],
      });
    }

    // Update status-related dates
    const statusDates: Record<string, string> = {};
    if (newStatus === 'shipped') {
      statusDates.shippedDate = new Date().toISOString().slice(0, 10);
    }
    if (newStatus === 'delivered') {
      statusDates.deliveredDate = new Date().toISOString().slice(0, 10);
    }

    // Update order
    const updated = await db.transaction(async (tx) => {
      const [result] = await tx
        .update(orders)
        .set({
          status: newStatus,
          ...statusDates,
          internalNotes: data.notes
            ? `${existing.internalNotes ?? ''}\n[${new Date().toISOString()}] Status changed to ${newStatus}: ${data.notes}`.trim()
            : existing.internalNotes,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(orders.id, id))
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: result.id,
          action: 'upsert',
          payload: {
            title: result.orderNumber,
            subtitle: result.customerId,
          },
        },
        tx
      );

      return result;
    });

    return updated;
  });

// ============================================================================
// DELETE ORDER (soft delete)
// ============================================================================

/**
 * Soft delete order.
 */
export const deleteOrder = createServerFn({ method: 'POST' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Get existing order
    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Only allow deletion of draft orders
    if (existing.status !== 'draft') {
      throw new ValidationError('Cannot delete non-draft order', {
        status: ['Only draft orders can be deleted'],
      });
    }

    // Soft delete
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(orders.id, data.id));

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: data.id,
          action: 'delete',
        },
        tx
      );
    });

    return { success: true };
  });

// ============================================================================
// ADD LINE ITEM
// ============================================================================

/**
 * Add line item to existing order.
 */
export const addOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      item: createOrderLineItemSchema,
    })
  )
  .handler(async ({ data }): Promise<OrderLineItem> => {
    const ctx = await withAuth();

    // Verify order exists and is editable
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    // Calculate line item totals
    const totals = calculateLineItemTotals({
      quantity: Number(data.item.quantity),
      unitPrice: Number(data.item.unitPrice),
      discountPercent: data.item.discountPercent ? Number(data.item.discountPercent) : null,
      discountAmount: data.item.discountAmount ? Number(data.item.discountAmount) : null,
      taxType: data.item.taxType,
    });

    // Get next line number
    const [maxLine] = await db
      .select({ max: sql<string>`MAX(${orderLineItems.lineNumber})` })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, data.orderId));

    const nextLineNumber = ((parseInt(maxLine?.max ?? '0', 10) || 0) + 1)
      .toString()
      .padStart(3, '0');

    // Insert line item
    const [newItem] = await db
      .insert(orderLineItems)
      .values({
        organizationId: ctx.organizationId,
        orderId: data.orderId,
        productId: data.item.productId,
        lineNumber: data.item.lineNumber || nextLineNumber,
        sku: data.item.sku,
        description: data.item.description,
        quantity: data.item.quantity,
        unitPrice: data.item.unitPrice,
        discountPercent: data.item.discountPercent,
        discountAmount: data.item.discountAmount ?? 0,
        taxType: data.item.taxType ?? 'gst',
        taxAmount: totals.taxAmount,
        lineTotal: totals.lineTotal,
        qtyPicked: 0,
        qtyShipped: 0,
        qtyDelivered: 0,
        notes: data.item.notes,
      })
      .returning();

    // Recalculate order totals
    await recalculateOrderTotals(data.orderId, ctx.user.id);

    return newItem;
  });

// ============================================================================
// UPDATE LINE ITEM
// ============================================================================

/**
 * Update order line item.
 */
export const updateOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      itemId: z.string().uuid(),
      data: createOrderLineItemSchema.partial(),
    })
  )
  .handler(async ({ data: { orderId, itemId, data } }): Promise<OrderLineItem> => {
    const ctx = await withAuth();

    // Verify order exists and is editable
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    // Get existing line item
    const [existing] = await db
      .select()
      .from(orderLineItems)
      .where(and(eq(orderLineItems.id, itemId), eq(orderLineItems.orderId, orderId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Line item not found', 'orderLineItem');
    }

    // Calculate new totals if quantity/price changed
    const quantity = data.quantity ?? Number(existing.quantity);
    const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
    const discountPercent =
      data.discountPercent ?? (existing.discountPercent ? Number(existing.discountPercent) : null);
    const discountAmount = data.discountAmount ?? Number(existing.discountAmount);
    const taxType = data.taxType ?? existing.taxType;

    const totals = calculateLineItemTotals({
      quantity,
      unitPrice,
      discountPercent,
      discountAmount,
      taxType,
    });

    // Update line item
    const [updated] = await db
      .update(orderLineItems)
      .set({
        ...data,
        quantity,
        unitPrice,
        discountPercent,
        discountAmount,
        taxAmount: totals.taxAmount,
        lineTotal: totals.lineTotal,
        updatedAt: new Date(),
      })
      .where(eq(orderLineItems.id, itemId))
      .returning();

    // Recalculate order totals
    await recalculateOrderTotals(orderId, ctx.user.id);

    return updated;
  });

// ============================================================================
// DELETE LINE ITEM
// ============================================================================

/**
 * Delete order line item.
 */
export const deleteOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      itemId: z.string().uuid(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify order exists and is editable
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    // Get line item count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, data.orderId));

    if ((countResult?.count ?? 0) <= 1) {
      throw new ValidationError('Cannot delete last line item', {
        lineItem: ['Order must have at least one line item'],
      });
    }

    // Delete line item
    await db
      .delete(orderLineItems)
      .where(and(eq(orderLineItems.id, data.itemId), eq(orderLineItems.orderId, data.orderId)));

    // Recalculate order totals
    await recalculateOrderTotals(data.orderId, ctx.user.id);

    return { success: true };
  });

// ============================================================================
// DUPLICATE ORDER
// ============================================================================

/**
 * Duplicate an existing order as a new draft.
 */
export const duplicateOrder = createServerFn({ method: 'POST' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();

    // Get source order
    const [sourceOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!sourceOrder) {
      throw new NotFoundError('Order not found', 'order');
    }

    // Get source line items
    const sourceLineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, data.id))
      .orderBy(asc(orderLineItems.lineNumber));

    // Generate new order number
    const newOrderNumber = await generateOrderNumber(ctx.organizationId);

    // Create duplicate in transaction
    const result = await db.transaction(async (tx) => {
      // Insert new order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          organizationId: ctx.organizationId,
          customerId: sourceOrder.customerId,
          orderNumber: newOrderNumber,
          status: 'draft',
          paymentStatus: 'pending',
          orderDate: new Date().toISOString().slice(0, 10),
          dueDate: null,
          billingAddress: sourceOrder.billingAddress,
          shippingAddress: sourceOrder.shippingAddress,
          subtotal: Number(sourceOrder.subtotal),
          discountAmount: Number(sourceOrder.discountAmount),
          discountPercent: sourceOrder.discountPercent ? Number(sourceOrder.discountPercent) : null,
          taxAmount: Number(sourceOrder.taxAmount),
          shippingAmount: Number(sourceOrder.shippingAmount),
          total: Number(sourceOrder.total),
          paidAmount: 0,
          balanceDue: Number(sourceOrder.total),
          metadata: {
            ...((sourceOrder.metadata as object) ?? {}),
            duplicatedFrom: data.id,
          },
          internalNotes: `Duplicated from order ${sourceOrder.orderNumber}`,
          customerNotes: sourceOrder.customerNotes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Insert new line items
      const newLineItems = await tx
        .insert(orderLineItems)
        .values(
          sourceLineItems.map((item) => ({
            organizationId: ctx.organizationId,
            orderId: newOrder.id,
            productId: item.productId,
            lineNumber: item.lineNumber,
            sku: item.sku,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
            discountAmount: Number(item.discountAmount),
            taxType: item.taxType,
            taxAmount: Number(item.taxAmount),
            lineTotal: Number(item.lineTotal),
            qtyPicked: 0,
            qtyShipped: 0,
            qtyDelivered: 0,
            notes: item.notes,
          }))
        )
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: newOrder.id,
          action: 'upsert',
          payload: {
            title: newOrder.orderNumber,
            subtitle: newOrder.customerId,
          },
        },
        tx
      );

      return {
        order: newOrder,
        lineItems: newLineItems,
      };
    });

    return {
      ...result.order,
      lineItems: result.lineItems,
    };
  });

// ============================================================================
// HELPER: RECALCULATE ORDER TOTALS
// ============================================================================

/**
 * Recalculate and update order totals from line items.
 */
async function recalculateOrderTotals(orderId: string, userId: string): Promise<void> {
  // Get all line items
  const lineItems = await db
    .select({
      lineTotal: orderLineItems.lineTotal,
      taxAmount: orderLineItems.taxAmount,
    })
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId));

  // Get current order for discount and shipping
  const [order] = await db
    .select({
      discountPercent: orders.discountPercent,
      discountAmount: orders.discountAmount,
      shippingAmount: orders.shippingAmount,
      paidAmount: orders.paidAmount,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return;

  // Calculate totals
  const totals = calculateOrderTotals(
    lineItems.map((li) => ({
      lineTotal: Number(li.lineTotal),
      taxAmount: Number(li.taxAmount),
    })),
    order.discountPercent ? Number(order.discountPercent) : null,
    order.discountAmount ? Number(order.discountAmount) : null,
    Number(order.shippingAmount)
  );

  const balanceDue = totals.total - Number(order.paidAmount);

  // Update order
  await db
    .update(orders)
    .set({
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      balanceDue,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(orders.id, orderId));
}

// ============================================================================
// BULK UPDATE ORDER STATUS (Kanban operations)
// ============================================================================

export const bulkUpdateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderIds: z.array(z.string().uuid()),
      status: updateOrderStatusSchema.shape.status,
      notes: z.string().optional(),
    })
  )
  .handler(
    async ({
      data: { orderIds, status, notes },
    }): Promise<{ updated: number; failed: string[] }> => {
      const ctx = await withAuth();

      if (orderIds.length === 0) {
        throw new ValidationError('No order IDs provided', {
          orderIds: ['At least one order ID is required'],
        });
      }

      const updated: string[] = [];
      const failed: string[] = [];

      // Process each order
      for (const orderId of orderIds) {
        try {
          // Get existing order
          const [existing] = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.id, orderId),
                eq(orders.organizationId, ctx.organizationId),
                isNull(orders.deletedAt)
              )
            )
            .limit(1);

          if (!existing) {
            failed.push(`${orderId}: Order not found`);
            continue;
          }

          // Validate status transition
          const currentStatus = existing.status as OrderStatus;
          const newStatus = status as OrderStatus;

          if (!validateStatusTransition(currentStatus, newStatus)) {
            failed.push(
              `${orderId}: Invalid status transition from '${currentStatus}' to '${newStatus}'`
            );
            continue;
          }

          // Update status-related dates
          const statusDates: Record<string, string> = {};
          if (newStatus === 'shipped') {
            statusDates.shippedDate = new Date().toISOString().slice(0, 10);
          }
          if (newStatus === 'delivered') {
            statusDates.deliveredDate = new Date().toISOString().slice(0, 10);
          }

          // Update order
          await db
            .update(orders)
            .set({
              status: newStatus,
              ...statusDates,
              internalNotes: notes
                ? `${existing.internalNotes ?? ''}\n[${new Date().toISOString()}] Bulk status changed to ${newStatus}: ${notes}`.trim()
                : existing.internalNotes,
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(eq(orders.id, orderId));

          updated.push(orderId);
        } catch (error) {
          failed.push(`${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { updated: updated.length, failed };
    }
  );

// ============================================================================
// CREATE ORDER FOR KANBAN BOARD
// ============================================================================

export const createOrderForKanban = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      customerId: z.string().uuid(),
      targetStage: z.enum(['to_allocate', 'to_pick', 'picking', 'to_ship', 'shipped_today']),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data: { customerId, targetStage, notes } }): Promise<Order> => {
    const ctx = await withAuth();

    // Map kanban stage to order status
    const stageToStatus: Record<string, OrderStatus> = {
      to_allocate: 'confirmed',
      to_pick: 'confirmed',
      picking: 'picking',
      to_ship: 'picked',
      shipped_today: 'shipped',
    };

    const status = stageToStatus[targetStage];
    if (!status) {
      throw new ValidationError('Invalid target stage', {
        targetStage: [`Stage '${targetStage}' is not valid`],
      });
    }

    // Verify customer exists and belongs to organization
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    // Generate order number
    const orderNumber = await generateOrderNumber(ctx.organizationId);

    const created = await db.transaction(async (tx) => {
      const [result] = await tx
        .insert(orders)
        .values({
          orderNumber,
          organizationId: ctx.organizationId,
          customerId,
          status,
          paymentStatus: 'pending',
          orderDate: new Date().toISOString().slice(0, 10),
          total: 0, // Will be calculated from line items
          balanceDue: 0,
          metadata: notes ? { notes } : {},
          internalNotes: notes ? `Created via Kanban board: ${notes}` : 'Created via Kanban board',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: result.id,
          action: 'upsert',
          payload: {
            title: result.orderNumber,
            subtitle: result.customerId,
          },
        },
        tx
      );

      return result;
    });

    return created;
  });

// ============================================================================
// LIST FULFILLMENT KANBAN ORDERS
// ============================================================================

/**
 * Kanban-specific order query result grouped by fulfillment stages
 */
export interface FulfillmentKanbanOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderDate: Date;
  dueDate: Date | null;
  total: number;
  metadata: OrderMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  shippedDate: Date | null;
}

export interface FulfillmentKanbanResult {
  stages: {
    to_allocate: FulfillmentKanbanOrder[];
    to_pick: FulfillmentKanbanOrder[];
    picking: FulfillmentKanbanOrder[];
    to_ship: FulfillmentKanbanOrder[];
    shipped_today: FulfillmentKanbanOrder[];
  };
  total: number;
}

const fulfillmentKanbanQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

/**
 * List orders grouped by fulfillment workflow stages for kanban display.
 * Optimized for real-time kanban operations with efficient querying.
 */
export const listFulfillmentKanbanOrders = createServerFn({ method: 'GET' })
  .inputValidator(fulfillmentKanbanQuerySchema)
  .handler(
    cache(
      async ({
        data,
      }: {
        data: z.infer<typeof fulfillmentKanbanQuerySchema>;
      }): Promise<FulfillmentKanbanResult> => {
        const ctx = await withAuth();
        const { customerId, dateFrom, dateTo, search } = data;

        // Build base where conditions
        const conditions = [
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          // Only include orders that are in the fulfillment workflow (not draft or delivered)
          sql`${orders.status} IN ('confirmed', 'picking', 'picked', 'shipped')`,
        ];

        // Add filters
        if (customerId) {
          conditions.push(eq(orders.customerId, customerId));
        }
        if (search) {
          conditions.push(
            sql`(
          ${orders.orderNumber} ILIKE ${`%${search}%`} OR
          ${orders.internalNotes} ILIKE ${`%${search}%`}
        )`
          );
        }
        if (dateFrom) {
          conditions.push(sql`${orders.orderDate} >= ${dateFrom.toISOString().slice(0, 10)}`);
        }
        if (dateTo) {
          conditions.push(sql`${orders.orderDate} <= ${dateTo.toISOString().slice(0, 10)}`);
        }

        // Get orders with customer info and item counts
        const orderList = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerId: orders.customerId,
            customerName: customers.name,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            orderDate: orders.orderDate,
            dueDate: orders.dueDate,
            total: orders.total,
            metadata: orders.metadata,
            createdAt: orders.createdAt,
            updatedAt: orders.updatedAt,
            shippedDate: orders.shippedDate,
            // Count line items
            itemCount: sql<number>`count(${orderLineItems.id})::int`,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customerId, customers.id))
          .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
          .where(and(...conditions))
          .groupBy(
            orders.id,
            orders.orderNumber,
            orders.customerId,
            customers.name,
            orders.status,
            orders.paymentStatus,
            orders.orderDate,
            orders.dueDate,
            orders.total,
            orders.metadata,
            orders.createdAt,
            orders.updatedAt,
            orders.shippedDate
          )
          .orderBy(desc(orders.createdAt));

        // Group orders by fulfillment workflow stages
        const stages: FulfillmentKanbanResult['stages'] = {
          to_allocate: [],
          to_pick: [],
          picking: [],
          to_ship: [],
          shipped_today: [],
        };

        // Get today's date for shipped_today filter
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        orderList.forEach((order) => {
          const fulfillmentOrder: FulfillmentKanbanOrder = {
            id: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            customerName: order.customerName,
            status: order.status,
            paymentStatus: order.paymentStatus,
            orderDate: new Date(order.orderDate),
            dueDate: order.dueDate ? new Date(order.dueDate) : null,
            total: Number(order.total),
            metadata: order.metadata,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            itemCount: order.itemCount,
            shippedDate: order.shippedDate ? new Date(order.shippedDate) : null,
          };

          // Map order status to kanban stage
          switch (order.status) {
            case 'confirmed':
              stages.to_allocate.push(fulfillmentOrder);
              break;
            case 'picking':
              stages.picking.push(fulfillmentOrder);
              break;
            case 'picked':
              stages.to_ship.push(fulfillmentOrder);
              break;
            case 'shipped':
              // Only show shipped orders from today in shipped_today
              if (order.shippedDate) {
                const shippedDateStr = new Date(order.shippedDate).toISOString().slice(0, 10);
                if (shippedDateStr === todayStr) {
                  stages.shipped_today.push(fulfillmentOrder);
                }
              }
              break;
            default:
              // Any other statuses go to to_allocate as fallback
              stages.to_allocate.push(fulfillmentOrder);
          }
        });

        return {
          stages,
          total: orderList.length,
        };
      }
    )
  );
