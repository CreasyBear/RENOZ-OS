/**
 * Payment reminder candidate selection helpers.
 */

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers as customersTable,
  orders,
  reminderHistory,
  reminderTemplates,
} from 'drizzle/schema';
import type { SessionContext } from '@/lib/server/protected';
import {
  overdueOrdersForRemindersQuerySchema,
  type OrderForReminder,
} from '@/lib/schemas';
import {
  calculateDaysOverdue as calcDaysOverdue,
  getEffectiveDueDate,
} from '@/lib/utils/financial';
import type { z } from 'zod';

function calculateDaysOverdue(dueDate: Date): number {
  return calcDaysOverdue(dueDate, new Date());
}

export async function readOrdersForPaymentReminders(
  ctx: SessionContext,
  data: z.infer<typeof overdueOrdersForRemindersQuerySchema>,
) {
  const {
    page,
    pageSize,
    minDaysOverdue,
    matchTemplateDays,
    excludeAlreadyReminded,
  } = data;
  const offset = (page - 1) * pageSize;

  // Get active templates for this org
  const activeTemplates = await db
    .select({
      id: reminderTemplates.id,
      name: reminderTemplates.name,
      daysOverdue: reminderTemplates.daysOverdue,
    })
    .from(reminderTemplates)
    .where(
      and(
        eq(reminderTemplates.organizationId, ctx.organizationId),
        eq(reminderTemplates.isActive, true),
      ),
    )
    .orderBy(asc(reminderTemplates.daysOverdue));

  // RAW SQL (Phase 11 Keep): EXISTS subqueries, COALESCE date arithmetic. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  const effectiveDueExpr = sql`COALESCE(${orders.dueDate}, (${orders.orderDate} + interval '30 days')::date)`;
  const daysOverdueExpr = sql`(CURRENT_DATE - ${effectiveDueExpr})::integer`;

  const baseConditions = and(
    eq(orders.organizationId, ctx.organizationId),
    isNull(orders.deletedAt),
    ne(orders.status, 'draft'),
    ne(orders.status, 'cancelled'),
    sql`${daysOverdueExpr} >= ${minDaysOverdue}`,
    or(
      gt(orders.balanceDue, 0),
      and(
        isNull(orders.balanceDue),
        sql`COALESCE(${orders.total}, 0) > COALESCE(${orders.paidAmount}, 0)`,
      ),
    ),
  );

  // matchTemplateDays: restrict to orders that have a matching template
  const ordersWithMatch = matchTemplateDays
    ? await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          customerId: orders.customerId,
          customerName: customersTable.name,
          customerEmail: customersTable.email,
        })
        .from(orders)
        .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
        .where(
          and(
            baseConditions,
            sql`EXISTS (
                  SELECT 1 FROM reminder_templates t
                  WHERE t.organization_id = ${ctx.organizationId}
                    AND t.is_active = true
                    AND t.days_overdue <= (CURRENT_DATE - ${effectiveDueExpr})::integer
                )`,
          ),
        )
    : await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          dueDate: orders.dueDate,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          customerId: orders.customerId,
          customerName: customersTable.name,
          customerEmail: customersTable.email,
        })
        .from(orders)
        .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
        .where(baseConditions);

  // Get reminder history for these orders (for excludeAlreadyReminded and result shape)
  const orderIds = ordersWithMatch.map((o) => o.orderId);
  const reminderHistoryMap = new Map<
    string,
    { sentAt: Date; daysOverdue: number | null }
  >();

  if (orderIds.length > 0) {
    const historyResult = await db
      .select({
        orderId: reminderHistory.orderId,
        sentAt: reminderHistory.sentAt,
        daysOverdue: reminderHistory.daysOverdue,
      })
      .from(reminderHistory)
      .where(
        and(
          eq(reminderHistory.organizationId, ctx.organizationId),
          inArray(reminderHistory.orderId, orderIds),
        ),
      )
      .orderBy(desc(reminderHistory.sentAt));

    for (const h of historyResult) {
      if (!reminderHistoryMap.has(h.orderId)) {
        reminderHistoryMap.set(h.orderId, {
          sentAt: h.sentAt,
          daysOverdue: h.daysOverdue,
        });
      }
    }
  }

  // Build eligible orders (apply excludeAlreadyReminded and find matching template)
  const eligibleOrders: OrderForReminder[] = [];

  for (const order of ordersWithMatch) {
    const effectiveDueDate = getEffectiveDueDate(
      order.orderDate,
      order.dueDate,
    );
    const daysOverdue = calculateDaysOverdue(effectiveDueDate);

    const balanceDue =
      order.balanceDue ?? (order.total ?? 0) - (order.paidAmount ?? 0);
    if (balanceDue <= 0) continue;

    let matchingTemplate = null;
    for (const t of activeTemplates) {
      if (daysOverdue >= t.daysOverdue) {
        matchingTemplate = t;
      }
    }

    const lastReminder = reminderHistoryMap.get(order.orderId);
    if (excludeAlreadyReminded && lastReminder && matchingTemplate) {
      if (
        lastReminder.daysOverdue !== null &&
        lastReminder.daysOverdue >= matchingTemplate.daysOverdue
      ) {
        continue;
      }
    }

    eligibleOrders.push({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.orderDate),
      dueDate: effectiveDueDate,
      daysOverdue,
      balanceDue,
      customerId: order.customerId,
      customerName: order.customerName ?? 'Unknown',
      customerEmail: order.customerEmail,
      lastReminderSentAt: lastReminder?.sentAt ?? null,
      lastReminderDaysOverdue: lastReminder?.daysOverdue ?? null,
      matchingTemplateId: matchingTemplate?.id ?? null,
      matchingTemplateName: matchingTemplate?.name ?? null,
    });
  }

  eligibleOrders.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const totalItems = eligibleOrders.length;
  const paginatedOrders = eligibleOrders.slice(offset, offset + pageSize);

  return {
    items: paginatedOrders,
    templates: activeTemplates,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}
