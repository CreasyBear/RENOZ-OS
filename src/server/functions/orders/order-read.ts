'use server'

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  addresses,
  customers,
  orderLineItems,
  orderShipments,
  orders,
  products,
} from 'drizzle/schema';
import {
  buildCursorCondition,
  buildStandardCursorResponse,
  decodeCursor,
} from '@/lib/db/pagination';
import {
  orderCursorQuerySchema,
  orderListQuerySchema,
  orderParamsSchema,
} from '@/lib/schemas/orders';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';

type Order = typeof orders.$inferSelect;
type OrderLineItem = typeof orderLineItems.$inferSelect;

export interface OrderWithLineItems extends Order {
  lineItems: OrderLineItem[];
}

const _getOrderCached = cache(
  async (id: string, organizationId: string): Promise<OrderWithLineItems | null> => {
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
        .where(
          and(
            eq(orderLineItems.orderId, id),
            eq(orderLineItems.organizationId, organizationId)
          )
        )
        .orderBy(asc(orderLineItems.lineNumber)),
    ]);

    const [order] = orderResult;
    if (!order) {
      return null;
    }

    return { ...order, lineItems };
  }
);

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
      .leftJoin(
        customers,
        and(
          eq(orders.customerId, customers.id),
          eq(customers.organizationId, organizationId),
          isNull(customers.deletedAt)
        )
      )
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
      .leftJoin(
        products,
        and(
          eq(orderLineItems.productId, products.id),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      )
      .where(
        and(
          eq(orderLineItems.orderId, id),
          eq(orderLineItems.organizationId, organizationId)
        )
      )
      .orderBy(asc(orderLineItems.lineNumber)),
  ]);

  if (!orderResult[0]) {
    return null;
  }

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
    customerWithAddresses = {
      ...customer,
      addresses: customerAddresses,
    } as typeof customer & { addresses: typeof customerAddresses };
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

export async function getOrderByClientRequestId(
  organizationId: string,
  clientRequestId: string
): Promise<OrderWithLineItems | null> {
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),
        eq(orders.clientRequestId, clientRequestId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  return _getOrderCached(existing.id, organizationId);
}

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

    const conditions = [eq(orders.organizationId, ctx.organizationId), isNull(orders.deletedAt)];

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

    const customerJoin = and(
      eq(orders.customerId, customers.id),
      eq(customers.organizationId, ctx.organizationId),
      isNull(customers.deletedAt)
    );

    // Count must use the same customer join as the list query when search references customers.name
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(customers, customerJoin)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    const orderColumn =
      sortBy === 'orderNumber'
        ? orders.orderNumber
        : sortBy === 'customer'
          ? customers.name
          : sortBy === 'orderDate'
            ? orders.orderDate
            : sortBy === 'total'
              ? orders.total
              : sortBy === 'status'
                ? orders.status
                : orders.createdAt;
    const orderDir = sortOrder === 'asc' ? asc : desc;

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
        customer: {
          id: customers.id,
          name: customers.name,
        },
        itemCount: sql<number>`count(${orderLineItems.id})::int`,
      })
      .from(orders)
      .leftJoin(customers, customerJoin)
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .where(and(...conditions))
      .groupBy(orders.id, customers.id, customers.name)
      .orderBy(
        orderDir(orderColumn),
        orderDir(orders.createdAt),
        orderDir(orders.id)
      )
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

export const getOrderStats = createServerFn({ method: 'GET' }).handler(async () => {
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

export const getFulfillmentDashboardSummary = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const [orderStats, shipmentStats] = await Promise.all([
    db
      .select({
        toPick: sql<number>`count(
          CASE
            WHEN ${orders.status} IN ('confirmed', 'picking') THEN 1
          END
        )::int`,
        readyToShip: sql<number>`count(CASE WHEN ${orders.status} = 'picked' THEN 1 END)::int`,
        overdue: sql<number>`count(
          CASE
            WHEN ${orders.status} IN ('confirmed', 'picking', 'picked')
              AND ${orders.orderDate} < CURRENT_DATE - INTERVAL '3 days'
            THEN 1
          END
        )::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      ),
    db
      .select({
        inTransit: sql<number>`count(
          CASE
            WHEN ${orderShipments.status} IN ('pending', 'in_transit', 'out_for_delivery', 'failed')
            THEN 1
          END
        )::int`,
      })
      .from(orderShipments)
      .where(eq(orderShipments.organizationId, ctx.organizationId)),
  ]);

  return {
    toPick: orderStats[0]?.toPick ?? 0,
    readyToShip: orderStats[0]?.readyToShip ?? 0,
    overdue: orderStats[0]?.overdue ?? 0,
    inTransit: shipmentStats[0]?.inTransit ?? 0,
  };
});

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
