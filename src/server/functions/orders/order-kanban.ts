'use server'

import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import { customers, orderLineItems, orders } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';
import type {
  FulfillmentKanbanOrder,
  FulfillmentKanbanResult,
  OrderStatus,
} from '@/lib/schemas/orders';
import { generateOrderNumber } from './order-numbering';

const fulfillmentKanbanQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

type Order = typeof orders.$inferSelect;

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

    const orderNumber = await generateOrderNumber(ctx.organizationId);

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
          total: 0,
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

      const conditions = [
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
        inArray(orders.status, ['confirmed', 'picking', 'picked', 'partially_shipped', 'shipped']),
      ];

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
          itemCount: sql<number>`count(${orderLineItems.id})::int`,
        })
        .from(orders)
        .leftJoin(
          customers,
          and(
            eq(orders.customerId, customers.id),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
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

      const stages: FulfillmentKanbanResult['stages'] = {
        to_allocate: [],
        to_pick: [],
        picking: [],
        to_ship: [],
        shipped_today: [],
      };

      const todayStr = new Date().toISOString().slice(0, 10);

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

        switch (order.status) {
          case 'confirmed':
            stages.to_allocate.push(fulfillmentOrder);
            break;
          case 'picking':
            stages.picking.push(fulfillmentOrder);
            break;
          case 'picked':
          case 'partially_shipped':
            stages.to_ship.push(fulfillmentOrder);
            break;
          case 'shipped':
            if (order.shippedDate) {
              const shippedDateStr = new Date(order.shippedDate).toISOString().slice(0, 10);
              if (shippedDateStr === todayStr) {
                stages.shipped_today.push(fulfillmentOrder);
              }
            }
            break;
          default:
            stages.to_allocate.push(fulfillmentOrder);
        }
      });

      return {
        stages,
        total: orderList.length,
      };
    }
  );
