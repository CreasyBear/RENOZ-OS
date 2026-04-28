/**
 * Xero invoice status read helpers.
 */

import { setResponseStatus } from '@tanstack/react-start/server';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers as customersTable, orders } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import {
  getInvoiceXeroStatusSchema,
  listInvoicesBySyncStatusSchema,
  xeroSyncStatusSchema,
  type InvoiceWithSyncStatus,
  type InvoiceXeroStatus,
  type ListInvoicesBySyncStatusResponse,
} from '@/lib/schemas';
import { safeNumber } from '@/lib/numeric';
import { getXeroSyncReadiness } from '../xero-adapter';
import { normalizeXeroSyncIssue } from './xero-invoice-sync-command';
import type { z } from 'zod';

export async function readInvoiceXeroStatus(
  ctx: SessionContext,
  data: z.infer<typeof getInvoiceXeroStatusSchema>,
): Promise<InvoiceXeroStatus> {
  const readiness = await getXeroSyncReadiness(ctx.organizationId);

  const [order] = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      xeroInvoiceId: orders.xeroInvoiceId,
      xeroSyncStatus: orders.xeroSyncStatus,
      xeroSyncError: orders.xeroSyncError,
      lastXeroSyncAt: orders.lastXeroSyncAt,
      xeroInvoiceUrl: orders.xeroInvoiceUrl,
      customerXeroContactId: customersTable.xeroContactId,
    })
    .from(orders)
    .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
    .where(
      and(
        eq(orders.id, data.orderId),
        eq(orders.organizationId, ctx.organizationId),
        isNull(orders.deletedAt),
      ),
    );

  if (!order) {
    setResponseStatus(404);
    throw new NotFoundError('Order not found', 'order');
  }

  const issue = normalizeXeroSyncIssue({
    readiness,
    xeroSyncError: order.xeroSyncError,
    customerXeroContactId: order.customerXeroContactId,
    xeroInvoiceId: order.xeroInvoiceId,
    orderId: order.orderId,
    customerId: order.customerId,
  });

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    xeroInvoiceId: order.xeroInvoiceId,
    xeroSyncStatus: order.xeroSyncStatus ?? 'pending',
    xeroSyncError: order.xeroSyncError,
    lastXeroSyncAt: order.lastXeroSyncAt,
    xeroInvoiceUrl: order.xeroInvoiceUrl,
    integrationAvailable: readiness.available,
    integrationMessage: readiness.message ?? null,
    issue,
    customerXeroContactId: order.customerXeroContactId,
    customerId: order.customerId,
  };
}

export async function readInvoicesBySyncStatus(
  ctx: SessionContext,
  data: z.infer<typeof listInvoicesBySyncStatusSchema>,
): Promise<ListInvoicesBySyncStatusResponse> {
  const readiness = await getXeroSyncReadiness(ctx.organizationId);
  const { status, errorsOnly, issue, customerId, orderId, page, pageSize } = data;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [
    eq(orders.organizationId, ctx.organizationId),
    isNull(orders.deletedAt),
    ne(orders.status, 'draft'),
    ne(orders.status, 'cancelled'),
  ];

  if (status) {
    conditions.push(eq(orders.xeroSyncStatus, status));
  }

  if (errorsOnly) {
    conditions.push(eq(orders.xeroSyncStatus, 'error'));
  }

  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }

  if (orderId) {
    conditions.push(eq(orders.id, orderId));
  }

  const selectInvoices = () =>
    db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        total: orders.total,
        customerId: orders.customerId,
        xeroInvoiceId: orders.xeroInvoiceId,
        xeroSyncStatus: orders.xeroSyncStatus,
        xeroSyncError: orders.xeroSyncError,
        lastXeroSyncAt: orders.lastXeroSyncAt,
        xeroInvoiceUrl: orders.xeroInvoiceUrl,
        customerName: customersTable.name,
        customerXeroContactId: customersTable.xeroContactId,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(orders.orderDate));

  type InvoiceStatusRow = Awaited<ReturnType<typeof selectInvoices>>[number];

  const mapInvoice = (r: InvoiceStatusRow): InvoiceWithSyncStatus => {
    const syncStatus = xeroSyncStatusSchema.parse(r.xeroSyncStatus ?? 'pending');

    return {
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      orderDate: new Date(r.orderDate),
      total: safeNumber(r.total),
      customerId: r.customerId,
      customerName: r.customerName,
      xeroInvoiceId: r.xeroInvoiceId,
      xeroSyncStatus: syncStatus,
      xeroSyncError: r.xeroSyncError,
      lastXeroSyncAt: r.lastXeroSyncAt ? new Date(r.lastXeroSyncAt) : null,
      xeroInvoiceUrl: r.xeroInvoiceUrl,
      canResync:
        readiness.available &&
        (syncStatus === 'error' || syncStatus === 'pending'),
      issue: normalizeXeroSyncIssue({
        readiness,
        xeroSyncError: r.xeroSyncError,
        customerXeroContactId: r.customerXeroContactId,
        xeroInvoiceId: r.xeroInvoiceId,
        orderId: r.orderId,
        customerId: r.customerId,
      }),
      customerXeroContactId: r.customerXeroContactId,
    };
  };

  if (issue) {
    const filtered = (await selectInvoices())
      .map(mapInvoice)
      .filter((invoice) => invoice.issue?.code === issue);

    return {
      invoices: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
      page,
      pageSize,
      integrationAvailable: readiness.available,
      integrationMessage: readiness.message ?? null,
    };
  }

  // Run data query and count query in parallel
  const [results, countResult] = await Promise.all([
    selectInvoices().limit(pageSize).offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(...conditions)),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return {
    invoices: results.map(mapInvoice),
    total: totalCount,
    page,
    pageSize,
    integrationAvailable: readiness.available,
    integrationMessage: readiness.message ?? null,
  };
}
