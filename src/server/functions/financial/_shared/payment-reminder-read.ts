/**
 * Payment reminder history read helpers.
 */

import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers as customersTable,
  orders,
  reminderHistory,
} from 'drizzle/schema';
import type { SessionContext } from '@/lib/server/protected';
import {
  reminderHistoryQuerySchema,
  type ReminderHistoryWithOrder,
} from '@/lib/schemas';
import type { z } from 'zod';

export async function readPaymentReminderHistory(
  ctx: SessionContext,
  data: z.infer<typeof reminderHistoryQuerySchema>,
) {
  const {
    page,
    pageSize,
    orderId,
    customerId,
    dateFrom,
    dateTo,
    deliveryStatus,
  } = data;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions: ReturnType<typeof eq>[] = [
    eq(reminderHistory.organizationId, ctx.organizationId),
  ];

  if (orderId) {
    conditions.push(eq(reminderHistory.orderId, orderId));
  }
  if (dateFrom) {
    conditions.push(gte(reminderHistory.sentAt, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(reminderHistory.sentAt, dateTo));
  }
  if (deliveryStatus) {
    conditions.push(eq(reminderHistory.deliveryStatus, deliveryStatus));
  }
  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(reminderHistory)
    .innerJoin(orders, eq(reminderHistory.orderId, orders.id))
    .where(and(...conditions));

  const totalItems = countResult[0]?.count ?? 0;

  // Get paginated records
  const records = await db
    .select({
      id: reminderHistory.id,
      orderId: reminderHistory.orderId,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      customerName: customersTable.name,
      templateId: reminderHistory.templateId,
      templateName: reminderHistory.templateName,
      daysOverdue: reminderHistory.daysOverdue,
      subjectSent: reminderHistory.subjectSent,
      bodySent: reminderHistory.bodySent,
      recipientEmail: reminderHistory.recipientEmail,
      sentAt: reminderHistory.sentAt,
      deliveryStatus: reminderHistory.deliveryStatus,
      deliveryError: reminderHistory.deliveryError,
      isManualSend: reminderHistory.isManualSend,
      notes: reminderHistory.notes,
    })
    .from(reminderHistory)
    .innerJoin(orders, eq(reminderHistory.orderId, orders.id))
    .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(desc(reminderHistory.sentAt))
    .limit(pageSize)
    .offset(offset);

  const items: ReminderHistoryWithOrder[] = records.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    customerId: r.customerId,
    customerName: r.customerName ?? 'Unknown',
    templateId: r.templateId,
    templateName: r.templateName,
    daysOverdue: r.daysOverdue,
    subjectSent: r.subjectSent,
    bodySent: r.bodySent,
    recipientEmail: r.recipientEmail,
    sentAt: r.sentAt,
    deliveryStatus:
      r.deliveryStatus as ReminderHistoryWithOrder['deliveryStatus'],
    deliveryError: r.deliveryError,
    isManualSend: r.isManualSend,
    notes: r.notes,
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}
