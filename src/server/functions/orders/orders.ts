'use server'

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

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, sql, desc, asc, isNull, ilike, inArray, gte, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import {
  orders,
  orderLineItems,
  orderLineSerialAllocations,
  serializedItems,
  customers,
  addresses,
  products,
  type OrderAddress,
  type OrderMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { ordersLogger } from '@/lib/logger';
import { computeChanges } from '@/lib/activity-logger';
import {
  createOrderSchema,
  updateOrderSchema,
  orderListQuerySchema,
  orderCursorQuerySchema,
  orderParamsSchema,
  createOrderLineItemSchema,
  updateOrderStatusSchema,
  type OrderStatus,
  type FulfillmentKanbanOrder,
  type FulfillmentKanbanResult,
} from '@/lib/schemas/orders';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { GST_RATE, roundCurrency } from '@/lib/order-calculations';
import { validateInvoiceTotals } from '@/lib/utils/financial';
import type { SerializedMutationErrorCode } from '@/lib/schemas/inventory';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
  type SerializedMutationEnvelope,
} from '@/lib/server/serialized-mutation-contract';
import {
  addSerializedItemEvent,
  releaseSerializedItemAllocation,
} from '@/server/functions/_shared/serialized-lineage';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import {
  generateQuotePdf,
  generateInvoicePdf,
  generateDeliveryNotePdf,
} from '@/trigger/jobs';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const ORDER_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'version',
];

// ============================================================================
// TYPES
// ============================================================================

/** Drizzle transaction type for functions that accept either db or tx */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTransaction = typeof db | DbTransaction;

type Order = typeof orders.$inferSelect;
type OrderLineItem = typeof orderLineItems.$inferSelect;

interface OrderWithLineItems extends Order {
  lineItems: OrderLineItem[];
}

// Types moved to schemas - imported above

async function releaseOrderSerialAllocations(
  tx: DbTransaction,
  params: {
    organizationId: string;
    orderId: string;
    orderNumber: string;
    userId: string;
  }
): Promise<void> {
  const lineItemsWithSerials = await tx
    .select({
      id: orderLineItems.id,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, params.orderId),
        eq(orderLineItems.organizationId, params.organizationId)
      )
    );

  const lineItemIds = lineItemsWithSerials.map((li) => li.id);
  if (lineItemIds.length > 0) {
    await tx
      .update(orderLineItems)
      .set({
        allocatedSerialNumbers: null,
        updatedAt: new Date(),
      })
      .where(inArray(orderLineItems.id, lineItemIds));
  }

  const activeAllocations = lineItemIds.length > 0
    ? await tx
        .select({
          lineItemId: orderLineSerialAllocations.orderLineItemId,
          serializedItemId: orderLineSerialAllocations.serializedItemId,
          serialNumber: serializedItems.serialNumberNormalized,
        })
        .from(orderLineSerialAllocations)
        .innerJoin(serializedItems, eq(orderLineSerialAllocations.serializedItemId, serializedItems.id))
        .where(
          and(
            eq(orderLineSerialAllocations.organizationId, params.organizationId),
            eq(orderLineSerialAllocations.isActive, true),
            inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
          )
        )
    : [];

  for (const allocation of activeAllocations) {
    await releaseSerializedItemAllocation(tx, {
      organizationId: params.organizationId,
      serializedItemId: allocation.serializedItemId,
      userId: params.userId,
    });
    await addSerializedItemEvent(tx, {
      organizationId: params.organizationId,
      serializedItemId: allocation.serializedItemId,
      eventType: 'deallocated',
      entityType: 'order_line_item',
      entityId: allocation.lineItemId,
      notes: `Order ${params.orderNumber} cancelled`,
      userId: params.userId,
    });
  }
}

// ============================================================================
// ORDER NUMBER GENERATION
// ============================================================================

const MAX_ORDER_NUMBER_RETRIES = 5;

/**
 * Generate unique order number with prefix ORD-YYYYMMDD-XXXX
 * Uses retry loop to handle race conditions from concurrent order creation.
 * Catches unique constraint violations (code 23505) to retry on conflict.
 */
export async function generateOrderNumber(organizationId: string): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Retry loop to handle concurrent requests
  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt++) {
    try {
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
    } catch (error: unknown) {
      // Catch unique constraint violations (PostgreSQL error code 23505) and retry
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        continue;
      }
      throw error;
    }
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
  picked: ['partially_shipped', 'shipped', 'cancelled'],
  partially_shipped: ['shipped', 'delivered', 'cancelled'],
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

/**
 * Calculate line item totals including tax.
 * Uses roundCurrency for DB CHECK constraint compatibility (avoids floating-point drift).
 */
export function calculateLineItemTotals(lineItem: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxType?: string;
}): { taxAmount: number; lineTotal: number } {
  const subtotal = roundCurrency(lineItem.quantity * lineItem.unitPrice);

  // Apply discount
  let discountedAmount = subtotal;
  if (lineItem.discountPercent) {
    discountedAmount = roundCurrency(
      discountedAmount - subtotal * (lineItem.discountPercent / 100)
    );
  }
  if (lineItem.discountAmount) {
    discountedAmount = roundCurrency(discountedAmount - lineItem.discountAmount);
  }
  discountedAmount = Math.max(0, discountedAmount);

  // Tax-free types: gst_free, export (DB enum values)
  const isTaxFree =
    lineItem.taxType === 'gst_free' || lineItem.taxType === 'export';
  const taxAmount = isTaxFree ? 0 : roundCurrency(discountedAmount * GST_RATE);
  const lineTotal = roundCurrency(discountedAmount + taxAmount);

  return {
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculate order totals from line items.
 * Uses roundCurrency for DB CHECK constraint compatibility (avoids floating-point drift).
 */
export function calculateOrderTotals(
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
  const subtotal = roundCurrency(lineSubtotal - lineTaxTotal);

  // Apply order-level discount
  let discountAmt = 0;
  if (discountPercent) {
    discountAmt = subtotal * (discountPercent / 100);
  }
  if (discountAmount) {
    discountAmt += discountAmount;
  }
  discountAmt = roundCurrency(Math.min(discountAmt, subtotal));

  // Recalculate tax after discount
  const taxableAmount = roundCurrency(subtotal - discountAmt + shippingAmount);
  const taxAmount = roundCurrency(taxableAmount * GST_RATE);

  // Final total
  const total = roundCurrency(
    subtotal - discountAmt + taxAmount + shippingAmount
  );

  return {
    subtotal,
    discountAmount: discountAmt,
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
  .handler(async ({ data }) => {
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

    // Add filters - use ilike helper instead of raw SQL for type safety
    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(orders.orderNumber, searchPattern),
          ilike(orders.internalNotes, searchPattern),
          ilike(customers.name, searchPattern)
        )!
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
      conditions.push(gte(orders.total, minTotal));
    }
    if (maxTotal !== undefined) {
      conditions.push(lte(orders.total, maxTotal));
    }
    if (dateFrom) {
      conditions.push(gte(orders.orderDate, dateFrom.toISOString().slice(0, 10)));
    }
    if (dateTo) {
      conditions.push(lte(orders.orderDate, dateTo.toISOString().slice(0, 10)));
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
      .leftJoin(customers, and(
        eq(orders.customerId, customers.id),
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt)
      ))
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
// ORDER STATS
// ============================================================================

/**
 * Get order statistics for dashboard/summary cards
 */
export const getOrderStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const ctx = await withAuth();

    const [stats] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        pendingOrders: sql<number>`count(CASE WHEN ${orders.status} IN ('confirmed', 'picking', 'picked', 'partially_shipped', 'shipped') THEN 1 END)::int`,
        unpaidOrders: sql<number>`count(CASE WHEN ${orders.paymentStatus} = 'pending' AND ${orders.status} = 'delivered' THEN 1 END)::int`,
        draftOrders: sql<number>`count(CASE WHEN ${orders.status} = 'draft' THEN 1 END)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          gte(orders.createdAt, sql`NOW() - INTERVAL '2 years'`)
        )
      );

    return {
      totalOrders: stats?.totalOrders ?? 0,
      totalRevenue: stats?.totalRevenue ?? 0,
      pendingOrders: stats?.pendingOrders ?? 0,
      unpaidOrders: stats?.unpaidOrders ?? 0,
      draftOrders: stats?.draftOrders ?? 0,
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
      conditions.push(gte(orders.total, minTotal));
    }
    if (maxTotal !== undefined) {
      conditions.push(lte(orders.total, maxTotal));
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
      })
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
 * Cached order fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getOrderCached = cache(async (id: string, organizationId: string): Promise<OrderWithLineItems | null> => {
  const [orderResult, lineItems] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1),
    db
      .select()
      .from(orderLineItems)
      .where(and(
        eq(orderLineItems.orderId, id),
        eq(orderLineItems.organizationId, organizationId)
      ))
      .orderBy(asc(orderLineItems.lineNumber)),
  ]);

  const [order] = orderResult;
  if (!order) return null;

  return { ...order, lineItems };
});

/**
 * Get single order with full details including line items.
 */
export const getOrder = createServerFn({ method: 'GET' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();
    const result = await _getOrderCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Order not found', 'order');
    }
    return result;
  });

// ============================================================================
// GET ORDER WITH CUSTOMER
// ============================================================================

/**
 * Cached order-with-customer fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getOrderWithCustomerCached = cache(async (id: string, organizationId: string) => {
  const [orderResult, lineItems] = await Promise.all([
    db
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
      .leftJoin(customers, and(
        eq(orders.customerId, customers.id),
        eq(customers.organizationId, organizationId),
        isNull(customers.deletedAt)
      ))
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1),
    db
      .select({
        lineItem: orderLineItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          isSerialized: products.isSerialized,
        },
      })
      .from(orderLineItems)
      .leftJoin(products, and(
        eq(orderLineItems.productId, products.id),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      ))
      .where(and(
        eq(orderLineItems.orderId, id),
        eq(orderLineItems.organizationId, organizationId)
      ))
      .orderBy(asc(orderLineItems.lineNumber)),
  ]);

  if (!orderResult[0]) return null;

  const customer = orderResult[0].customer;
  let customerWithAddresses = customer;

  if (customer?.id) {
    const customerAddresses = await db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customer.id),
          eq(addresses.organizationId, organizationId)
        )
      )
      .orderBy(desc(addresses.isPrimary), asc(addresses.type));
    customerWithAddresses = { ...customer, addresses: customerAddresses } as typeof customer & { addresses: typeof customerAddresses };
  }

  return {
    ...orderResult[0].order,
    customer: customerWithAddresses,
    lineItems: lineItems.map((li) => ({
      ...li.lineItem,
      product: li.product,
    })),
  };
});

/**
 * Get order with customer details for display.
 */
export const getOrderWithCustomer = createServerFn({ method: 'GET' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const result = await _getOrderWithCustomerCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Order not found', 'order');
    }
    return result;
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
    const logger = createActivityLoggerWithContext(ctx);

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

    const totalsValidation = validateInvoiceTotals({
      subtotal: orderTotals.subtotal,
      taxAmount: orderTotals.taxAmount,
      shippingAmount: data.shippingAmount ? Number(data.shippingAmount) : 0,
      discountAmount: orderTotals.discountAmount,
      total: orderTotals.total,
    });

    if (!totalsValidation.isValid) {
      throw new ValidationError('Order totals do not reconcile', {
        total: [
          `Expected ${totalsValidation.expectedTotal.toFixed(2)}, got ${orderTotals.total.toFixed(2)}`,
        ],
      });
    }

    // Insert order and line items in transaction
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
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

    // INT-DOC-007: Trigger quote PDF generation on order creation
    // Fire-and-forget - don't block order creation on PDF generation
    generateQuotePdf.trigger({
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      organizationId: ctx.organizationId,
      customerId: result.order.customerId,
    }).catch((error) => {
      // Log but don't fail order creation if PDF trigger fails
      ordersLogger.error('[INT-DOC-007] Failed to trigger quote PDF generation', error);
    });

    // Log order creation
    logger.logAsync({
      entityType: 'order',
      entityId: result.order.id,
      action: 'created',
      changes: computeChanges({
        before: null,
        after: result.order,
        excludeFields: ORDER_EXCLUDED_FIELDS as never[],
      }),
      description: `Created order: ${result.order.orderNumber}`,
      metadata: {
        orderNumber: result.order.orderNumber,
        customerId: result.order.customerId,
        total: result.order.total,
        status: result.order.status,
        lineItemCount: result.lineItems.length,
      },
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
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing order (for change tracking)
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

    const before = existing;
    const currentStatus = existing.status as OrderStatus;
    const requestedStatus = data.status as OrderStatus | undefined;

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

    if (requestedStatus && requestedStatus !== currentStatus) {
      if (!validateStatusTransition(currentStatus, requestedStatus)) {
        throw new ValidationError('Invalid status transition', {
          status: [`Cannot transition from '${currentStatus}' to '${requestedStatus}'`],
        });
      }

      if (requestedStatus === 'cancelled') {
        const [shippedLineItem] = await db
          .select({ id: orderLineItems.id })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.orderId, id),
              eq(orderLineItems.organizationId, ctx.organizationId),
              sql`${orderLineItems.qtyShipped} > 0`
            )
          )
          .limit(1);

        if (shippedLineItem) {
          throw new ValidationError('Cannot cancel order with shipped items', {
            status: ['This order has shipped quantities. Create returns/RMA before cancellation.'],
          });
        }
      }
    }

    // Update order
    const updateData: Record<string, unknown> = { ...data };
    if (requestedStatus && requestedStatus === currentStatus) {
      delete updateData.status;
    }
    if (requestedStatus && requestedStatus !== currentStatus) {
      if (requestedStatus === 'shipped' || requestedStatus === 'partially_shipped') {
        updateData.shippedDate = new Date().toISOString().slice(0, 10);
      }
      if (requestedStatus === 'delivered') {
        updateData.deliveredDate = new Date().toISOString().slice(0, 10);
      }
    }
    if (data.billingAddress) updateData.billingAddress = data.billingAddress as OrderAddress;
    if (data.shippingAddress) updateData.shippingAddress = data.shippingAddress as OrderAddress;
    if (data.metadata) updateData.metadata = data.metadata as OrderMetadata;
    updateData.updatedAt = new Date();
    updateData.updatedBy = ctx.user.id;

    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (requestedStatus === 'cancelled' && requestedStatus !== currentStatus) {
        await releaseOrderSerialAllocations(tx, {
          organizationId: ctx.organizationId,
          orderId: id,
          orderNumber: existing.orderNumber,
          userId: ctx.user.id,
        });
      }

      const [result] = await tx
        .update(orders)
        .set(updateData)
        .where(
          and(
            eq(orders.id, id),
            eq(orders.organizationId, ctx.organizationId),
            requestedStatus && requestedStatus !== currentStatus
              ? eq(orders.status, currentStatus)
              : undefined,
            isNull(orders.deletedAt) // MUST include deletedAt check
          )
        )
        .returning();

      if (!result) {
        throw new ConflictError(
          'Order was modified by another user. Please refresh and try again.'
        );
      }

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

    // Log order update
    const changes = computeChanges({
      before,
      after: updated,
      excludeFields: ORDER_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'order',
        entityId: updated.id,
        action: 'updated',
        changes,
        description: `Updated order: ${updated.orderNumber}`,
        metadata: {
          orderNumber: updated.orderNumber,
          customerId: updated.customerId, // Include customerId for customer timeline lookup
          changedFields: changes.fields,
        },
      });
    }

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
  .handler(async ({ data: { id, data } }): Promise<SerializedMutationEnvelope<Order>> => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

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
    const transitionName = 'order_status_update';
    const idempotencyKey = data.idempotencyKey?.trim();

    if (idempotencyKey) {
      const replayed = await hasProcessedIdempotencyKey(db, {
        organizationId: ctx.organizationId,
        entityType: 'order',
        entityId: id,
        action: 'updated',
        idempotencyKey,
      });
      if (replayed) {
        return serializedMutationSuccess(
          existing,
          `Idempotent replay ignored. Order remains in ${currentStatus} status.`,
          {
            affectedIds: [existing.id],
            transition: {
              transition: transitionName,
              fromStatus: currentStatus,
              toStatus: currentStatus,
              blockedBy: 'idempotency_key_replay',
            },
          }
        );
      }
    }

    // Idempotent retry safety: repeated status update returns current state.
    if (currentStatus === newStatus) {
      return serializedMutationSuccess(existing, `Order already in ${newStatus} status.`, {
        affectedIds: [existing.id],
        transition: {
          transition: transitionName,
          fromStatus: currentStatus,
          toStatus: newStatus,
        },
      });
    }

    // Guard: cannot cancel orders that already have shipped quantities.
    if (newStatus === 'cancelled') {
      const [shippedLineItem] = await db
        .select({ id: orderLineItems.id })
        .from(orderLineItems)
        .where(
          and(
            eq(orderLineItems.orderId, id),
            eq(orderLineItems.organizationId, ctx.organizationId),
            sql`${orderLineItems.qtyShipped} > 0`
          )
        )
        .limit(1);

      if (shippedLineItem) {
        throw createSerializedMutationError(
          'Cannot cancel order with shipped items. Create returns/RMA before cancellation.',
          'shipped_status_conflict'
        );
      }
    }

    if (!validateStatusTransition(currentStatus, newStatus)) {
      throw createSerializedMutationError(
        `Invalid status transition: cannot move from '${currentStatus}' to '${newStatus}'.`,
        'transition_blocked'
      );
    }

    // Update status-related dates
    const statusDates: Record<string, string> = {};
    if (newStatus === 'shipped' || newStatus === 'partially_shipped') {
      statusDates.shippedDate = new Date().toISOString().slice(0, 10);
    }
    if (newStatus === 'delivered') {
      statusDates.deliveredDate = new Date().toISOString().slice(0, 10);
    }

    // Update order with optimistic locking on current status
    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (newStatus === 'cancelled') {
        await releaseOrderSerialAllocations(tx, {
          organizationId: ctx.organizationId,
          orderId: id,
          orderNumber: existing.orderNumber,
          userId: ctx.user.id,
        });
      }

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
        .where(
          and(
            eq(orders.id, id),
            eq(orders.organizationId, ctx.organizationId), // MUST include organizationId filter
            eq(orders.status, currentStatus) // Optimistic lock: only update if status hasn't changed
          )
        )
        .returning();

      if (!result) {
        throw new ConflictError(
          'Order status was modified by another user. Please refresh and try again.'
        );
      }

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

    // INT-DOC-007: Trigger PDF generation based on status change
    // Fire-and-forget - don't block status update on PDF generation

    // Generate invoice PDF when order is confirmed (becomes a formal billable order)
    if (newStatus === 'confirmed') {
      generateInvoicePdf.trigger({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        organizationId: ctx.organizationId,
        customerId: updated.customerId,
        dueDate: updated.dueDate ?? undefined,
      }).catch((error) => {
        ordersLogger.error('[INT-DOC-007] Failed to trigger invoice PDF generation', error);
      });
    }

    // Generate delivery note PDF when order is shipped
    if (newStatus === 'shipped') {
      generateDeliveryNotePdf.trigger({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        organizationId: ctx.organizationId,
        customerId: updated.customerId,
        deliveryDate: statusDates.shippedDate ?? null,
      }).catch((error) => {
        ordersLogger.error('[INT-DOC-007] Failed to trigger delivery note PDF generation', error);
      });
    }

    // Log status change
    logger.logAsync({
      entityType: 'order',
      entityId: updated.id,
      action: 'updated',
      changes: {
        before: { status: currentStatus },
        after: { status: newStatus },
        fields: ['status'],
      },
      description: `Status changed: ${currentStatus} → ${newStatus}`,
      metadata: {
        orderNumber: updated.orderNumber,
        customerId: updated.customerId, // Include customerId for customer timeline lookup
        previousStatus: currentStatus,
        newStatus,
        notes: data.notes ?? undefined,
        idempotencyKey: data.idempotencyKey ?? undefined,
      },
    });

    return serializedMutationSuccess(updated, `Order status updated to ${newStatus}.`, {
      affectedIds: [updated.id],
      transition: {
        transition: transitionName,
        fromStatus: currentStatus,
        toStatus: newStatus,
      },
    });
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
    const logger = createActivityLoggerWithContext(ctx);

    // Get existing order - select only fields needed for validation and logging
    const [existing] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
      })
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

    const orderToDelete = existing;

    // Only allow deletion of draft orders
    if (existing.status !== 'draft') {
      throw new ValidationError('Cannot delete non-draft order', {
        status: ['Only draft orders can be deleted'],
      });
    }

    // Soft delete
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      await tx
        .update(orders)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(orders.id, data.id),
            eq(orders.organizationId, ctx.organizationId)
          )
        );

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

    // Log order deletion
    logger.logAsync({
      entityType: 'order',
      entityId: data.id,
      action: 'deleted',
      description: `Deleted order: ${orderToDelete.orderNumber}`,
      metadata: {
        orderNumber: orderToDelete.orderNumber,
        status: orderToDelete.status,
        total: orderToDelete.total,
      },
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

    // Wrap insert and recalculate in transaction for atomicity
    const newItem = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get next line number - MUST include organizationId filter
      const [maxLine] = await tx
        .select({ max: sql<string>`MAX(${orderLineItems.lineNumber})` })
        .from(orderLineItems)
        .where(
          and(
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      const nextLineNumber = ((parseInt(maxLine?.max ?? '0', 10) || 0) + 1)
        .toString()
        .padStart(3, '0');

      // Insert line item
      const [inserted] = await tx
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

      // Recalculate order totals within same transaction
      await recalculateOrderTotals(data.orderId, ctx.user.id, ctx.organizationId, tx);

      return inserted;
    });

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

    // Get existing line item - select only fields needed for recalculation
    // MUST include organizationId filter
    const [existing] = await db
      .select({
        id: orderLineItems.id,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        discountPercent: orderLineItems.discountPercent,
        discountAmount: orderLineItems.discountAmount,
        taxType: orderLineItems.taxType,
      })
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.id, itemId),
          eq(orderLineItems.orderId, orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      )
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

    // Wrap update and recalculate in transaction for atomicity
    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Update line item - MUST include organizationId filter
      const [updatedItem] = await tx
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
        .where(
          and(
            eq(orderLineItems.id, itemId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        )
        .returning();

      // Recalculate order totals within same transaction
      await recalculateOrderTotals(orderId, ctx.user.id, ctx.organizationId, tx);

      return updatedItem;
    });

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

    // Wrap count check, delete and recalculate in transaction for atomicity
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get line item count within transaction to ensure consistency
      // MUST include organizationId filter
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(orderLineItems)
        .where(
          and(
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      if ((countResult?.count ?? 0) <= 1) {
        throw new ValidationError('Cannot delete last line item', {
          lineItem: ['Order must have at least one line item'],
        });
      }

      // Delete line item - MUST include organizationId filter
      await tx
        .delete(orderLineItems)
        .where(
          and(
            eq(orderLineItems.id, data.itemId),
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      // Recalculate order totals within same transaction
      await recalculateOrderTotals(data.orderId, ctx.user.id, ctx.organizationId, tx);
    });

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
      .where(and(
        eq(orderLineItems.orderId, data.id),
        eq(orderLineItems.organizationId, ctx.organizationId)
      ))
      .orderBy(asc(orderLineItems.lineNumber));

    // Generate new order number
    const newOrderNumber = await generateOrderNumber(ctx.organizationId);

    // Create duplicate in transaction
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
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
 * @param orderId - The order ID to recalculate
 * @param userId - The user making the change
 * @param tx - Optional transaction context (defaults to db for backwards compatibility)
 */
async function recalculateOrderTotals(
  orderId: string,
  userId: string,
  organizationId: string,
  tx: DbOrTransaction = db
): Promise<void> {
  // Aggregate line item totals in SQL instead of fetching all rows and reducing in JS
  // MUST include organizationId filter for security
  const [lineItemAgg] = await tx
    .select({
      totalLineTotal: sql<number>`COALESCE(SUM(${orderLineItems.lineTotal}), 0)`,
      totalTaxAmount: sql<number>`COALESCE(SUM(${orderLineItems.taxAmount}), 0)`,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, orderId),
        eq(orderLineItems.organizationId, organizationId)
      )
    );

  // Get current order for discount and shipping - MUST include organizationId filter
  const [order] = await tx
    .select({
      discountPercent: orders.discountPercent,
      discountAmount: orders.discountAmount,
      shippingAmount: orders.shippingAmount,
      paidAmount: orders.paidAmount,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (!order) return;

  const lineSubtotal = Number(lineItemAgg?.totalLineTotal ?? 0);
  const lineTaxTotal = Number(lineItemAgg?.totalTaxAmount ?? 0);

  // Calculate totals using the aggregated values
  const totals = calculateOrderTotals(
    [{ lineTotal: lineSubtotal, taxAmount: lineTaxTotal }],
    order.discountPercent ? Number(order.discountPercent) : null,
    order.discountAmount ? Number(order.discountAmount) : null,
    Number(order.shippingAmount)
  );

  const balanceDue = totals.total - Number(order.paidAmount);

  // Update order - MUST include organizationId filter
  await tx
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
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId)
      )
    );
}

// ============================================================================
// BULK UPDATE ORDER STATUS (Kanban operations)
// ============================================================================

/**
 * Bulk update order status with optimized batch processing.
 * 
 * PERFORMANCE: Previously used sequential loop with 2N queries (N selects + N updates).
 * Now uses batch fetch (1 query) + batch updates (N updates in transaction) = N+1 queries total.
 * For 100 orders: previously 200 queries, now ~101 queries.
 */
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
    }): Promise<{
      updated: number;
      failed: string[];
      success: true;
      message: string;
      affectedIds?: string[];
      errorsById?: Record<string, string>;
      partialFailure?: { code: SerializedMutationErrorCode; message: string };
    }> => {
      const ctx = await withAuth();

      if (orderIds.length === 0) {
        throw new ValidationError('No order IDs provided', {
          orderIds: ['At least one order ID is required'],
        });
      }

      const updated: string[] = [];
      const failed: string[] = [];

      // PERFORMANCE: Batch fetch all orders in a single query instead of N queries
      const existingOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            inArray(orders.id, orderIds),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        );

      // Create lookup map for O(1) access
      const orderMap = new Map(existingOrders.map(o => [o.id, o]));

      // Track orders that passed validation
      const validUpdates: Array<{
        order: typeof existingOrders[0];
        statusDates: Record<string, string>;
      }> = [];

      // Validate all orders first (in memory, no DB queries)
      for (const orderId of orderIds) {
        const existing = orderMap.get(orderId);

        if (!existing) {
          failed.push(`${orderId}: Order not found`);
          continue;
        }

        const currentStatus = existing.status as OrderStatus;
        const newStatus = status as OrderStatus;

        // Idempotent retry safety: already in target status.
        if (currentStatus === newStatus) {
          updated.push(orderId);
          continue;
        }

        if (!validateStatusTransition(currentStatus, newStatus)) {
          failed.push(
            `${orderId}: Invalid status transition from '${currentStatus}' to '${newStatus}'`
          );
          continue;
        }

        // Calculate status dates
        const statusDates: Record<string, string> = {};
        if (newStatus === 'shipped') {
          statusDates.shippedDate = new Date().toISOString().slice(0, 10);
        }
        if (newStatus === 'delivered') {
          statusDates.deliveredDate = new Date().toISOString().slice(0, 10);
        }

        validUpdates.push({ order: existing, statusDates });
      }

      // Guard: bulk cancellation cannot include orders with shipped quantities.
      if ((status as OrderStatus) === 'cancelled' && validUpdates.length > 0) {
        const candidateOrderIds = validUpdates.map(({ order }) => order.id);
        const shippedRows = await db
          .select({ orderId: orderLineItems.orderId })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.organizationId, ctx.organizationId),
              inArray(orderLineItems.orderId, candidateOrderIds),
              sql`${orderLineItems.qtyShipped} > 0`
            )
          )
          .groupBy(orderLineItems.orderId);

        const shippedOrderIds = new Set(shippedRows.map((row) => row.orderId));
        if (shippedOrderIds.size > 0) {
          const blocked = new Set(shippedRows.map((row) => row.orderId));
          for (const orderId of blocked) {
            failed.push(
              `${orderId}: Cannot cancel order with shipped quantities (process return/RMA first)`
            );
          }
          const filtered = validUpdates.filter(({ order }) => !blocked.has(order.id));
          validUpdates.length = 0;
          validUpdates.push(...filtered);
        }
      }

      // Process valid updates in a transaction for atomicity
      if (validUpdates.length > 0) {
        await db.transaction(async (tx) => {
          await tx.execute(
            sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
          );
          for (const { order: existing, statusDates } of validUpdates) {
            const newStatus = status as OrderStatus;

            const currentStatus = existing.status as OrderStatus;

            if (newStatus === 'cancelled') {
              await releaseOrderSerialAllocations(tx, {
                organizationId: ctx.organizationId,
                orderId: existing.id,
                orderNumber: existing.orderNumber,
                userId: ctx.user.id,
              });
            }

            // Optimistic lock: only update if status hasn't changed since validation
            const [updateResult] = await tx
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
              .where(
                and(
                  eq(orders.id, existing.id),
                  eq(orders.organizationId, ctx.organizationId), // MUST include organizationId filter
                  eq(orders.status, currentStatus)
                )
              )
              .returning();

            if (!updateResult) {
              failed.push(`${existing.id}: Status was modified concurrently`);
              continue;
            }

            updated.push(existing.id);

            // INT-DOC-007: Trigger PDF generation based on status change
            // Fire-and-forget - don't block bulk update on PDF generation
            if (newStatus === 'confirmed') {
              generateInvoicePdf.trigger({
                orderId: existing.id,
                orderNumber: existing.orderNumber,
                organizationId: ctx.organizationId,
                customerId: existing.customerId,
                dueDate: existing.dueDate ?? undefined,
              }).catch((error) => {
                ordersLogger.error(`[INT-DOC-007] Failed to trigger invoice PDF for order ${existing.id}`, error);
              });
            }

            if (newStatus === 'shipped') {
              generateDeliveryNotePdf.trigger({
                orderId: existing.id,
                orderNumber: existing.orderNumber,
                organizationId: ctx.organizationId,
                customerId: existing.customerId,
                deliveryDate: statusDates.shippedDate ?? null,
              }).catch((error) => {
                ordersLogger.error(`[INT-DOC-007] Failed to trigger delivery note PDF for order ${existing.id}`, error);
              });
            }
          }
        });
      }

      const errorsById: Record<string, string> = {};
      for (const errorLine of failed) {
        const [failedId, ...rest] = errorLine.split(':');
        if (failedId && rest.length > 0) {
          errorsById[failedId.trim()] = rest.join(':').trim();
        }
      }

      return {
        updated: updated.length,
        failed,
        success: true,
        message:
          failed.length > 0
            ? `Updated ${updated.length} orders with ${failed.length} failures.`
            : `Updated ${updated.length} orders.`,
        affectedIds: updated,
        errorsById: Object.keys(errorsById).length > 0 ? errorsById : undefined,
        partialFailure:
          failed.length > 0
            ? {
                code: 'transition_blocked',
                message: 'Some orders could not be updated due to state transition constraints.',
              }
            : undefined,
      };
    }
  );

// ============================================================================
// CREATE ORDER FOR KANBAN BOARD
// ============================================================================

/**
 * @deprecated Unused — OrderCreateDialog is not wired up. Use createOrder + /orders/create instead.
 * Safe to remove in future cleanup. See PREMORTEM_ORDERS_CREATION.md.
 */
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

    // Intentionally creates zero-total orders for the kanban workflow.
    // Line items and totals are added/calculated later by the user after placing
    // the order in the desired fulfillment stage on the kanban board.
    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const [result] = await tx
        .insert(orders)
        .values({
          orderNumber,
          organizationId: ctx.organizationId,
          customerId,
          status,
          paymentStatus: 'pending',
          orderDate: new Date().toISOString().slice(0, 10),
          total: 0, // Intentionally zero — recalculated when line items are added
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

// Types moved to schemas - imported above

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
          inArray(orders.status, ['confirmed', 'picking', 'picked', 'partially_shipped', 'shipped']),
        ];

        // Add filters
        if (customerId) {
          conditions.push(eq(orders.customerId, customerId));
        }
        if (search) {
          conditions.push(
            or(
              ilike(orders.orderNumber, containsPattern(search)),
              ilike(orders.internalNotes, containsPattern(search))
            )!
          );
        }
        if (dateFrom) {
          conditions.push(gte(orders.orderDate, dateFrom.toISOString().slice(0, 10)));
        }
        if (dateTo) {
          conditions.push(lte(orders.orderDate, dateTo.toISOString().slice(0, 10)));
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
          .leftJoin(customers, and(
            eq(orders.customerId, customers.id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          ))
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
          .orderBy(desc(orders.createdAt))
          .limit(1000);

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
            metadata: (order.metadata ?? null) as FlexibleJson | null,
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
            case 'partially_shipped':
              // Partially shipped orders need attention — show in to_ship
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
  );
