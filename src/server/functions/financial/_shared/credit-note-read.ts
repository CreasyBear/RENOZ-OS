/**
 * Credit note read helpers.
 */

import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { creditNotes, customers, orders } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import {
  creditNoteListQuerySchema,
  creditNotesByCustomerQuerySchema,
  idParamQuerySchema,
  type ListCreditNotesResult,
} from '@/lib/schemas';
import type { z } from 'zod';

type CreditNoteRecord = typeof creditNotes.$inferSelect;
export interface CreditNoteWithRelations extends CreditNoteRecord {
  customer: typeof customers.$inferSelect | null;
  order: typeof orders.$inferSelect | null;
}

export async function readCreditNote(
  ctx: SessionContext,
  data: z.infer<typeof idParamQuerySchema>,
): Promise<CreditNoteWithRelations> {
  const result = await db
    .select({
      creditNote: creditNotes,
      customer: customers,
      order: orders,
    })
    .from(creditNotes)
    .leftJoin(customers, eq(creditNotes.customerId, customers.id))
    .leftJoin(orders, eq(creditNotes.orderId, orders.id))
    .where(
      and(
        eq(creditNotes.id, data.id),
        eq(creditNotes.organizationId, ctx.organizationId),
        isNull(creditNotes.deletedAt),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Credit note not found', 'credit_note');
  }

  return {
    ...result[0].creditNote,
    customer: result[0].customer,
    order: result[0].order,
  };
}

export async function readCreditNotesList(
  ctx: SessionContext,
  data: z.infer<typeof creditNoteListQuerySchema>,
): Promise<ListCreditNotesResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    customerId,
    orderId,
  } = data;

  const limit = pageSize;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [
    eq(creditNotes.organizationId, ctx.organizationId),
    isNull(creditNotes.deletedAt),
  ];

  if (status) {
    conditions.push(eq(creditNotes.status, status));
  }

  if (customerId) {
    conditions.push(eq(creditNotes.customerId, customerId));
  }

  if (orderId) {
    conditions.push(eq(creditNotes.orderId, orderId));
  }

  if (search) {
    conditions.push(
      or(
        ilike(creditNotes.creditNoteNumber, containsPattern(search)),
        ilike(creditNotes.reason, containsPattern(search)),
      )!,
    );
  }

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(creditNotes)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  // Get items with relations
  const orderColumn =
    sortBy === 'amount'
      ? creditNotes.amount
      : sortBy === 'status'
        ? creditNotes.status
        : sortBy === 'customer'
          ? customers.name
          : creditNotes.createdAt;

  const items = await db
    .select({
      creditNote: creditNotes,
      customer: customers,
      order: orders,
    })
    .from(creditNotes)
    .leftJoin(customers, eq(creditNotes.customerId, customers.id))
    .leftJoin(orders, eq(creditNotes.orderId, orders.id))
    .where(whereClause)
    .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn))
    .limit(limit)
    .offset(offset);

  // Get summary totals
  const totalsResult = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)::numeric`,
      draftCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'draft')::int`,
      issuedCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'issued')::int`,
      appliedCount: sql<number>`COUNT(*) FILTER (WHERE ${creditNotes.status} = 'applied')::int`,
    })
    .from(creditNotes)
    .where(whereClause);

  // Map to schema-compliant response type (issuedAt/voidedAt/voidReason not in DB yet)
  const mappedItems: ListCreditNotesResult['items'] = items.map((row) => ({
    ...row.creditNote,
    issuedAt: null,
    voidedAt: null,
    voidReason: null,
    customer: row.customer
      ? {
          id: row.customer.id,
          name: row.customer.name,
          email: row.customer.email,
          phone: row.customer.phone,
        }
      : null,
    order: row.order
      ? {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
        }
      : null,
  }));

  return {
    items: mappedItems,
    total,
    page,
    limit,
    hasMore: offset + items.length < total,
    totals: {
      totalAmount: Number(totalsResult[0]?.totalAmount ?? 0),
      draftCount: totalsResult[0]?.draftCount ?? 0,
      issuedCount: totalsResult[0]?.issuedCount ?? 0,
      appliedCount: totalsResult[0]?.appliedCount ?? 0,
    },
  };
}

export async function readCreditNotesByCustomer(
  ctx: SessionContext,
  data: z.infer<typeof creditNotesByCustomerQuerySchema>,
) {
  const { customerId, page = 1, pageSize = 10, includeApplied } = data;

  const limit = pageSize;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [
    eq(creditNotes.organizationId, ctx.organizationId),
    eq(creditNotes.customerId, customerId),
    isNull(creditNotes.deletedAt),
  ];

  // Optionally exclude applied credit notes
  if (!includeApplied) {
    conditions.push(
      or(eq(creditNotes.status, 'draft'), eq(creditNotes.status, 'issued'))!,
    );
  }

  const whereClause = and(...conditions);

  // Get total
  const countResult = await db
    .select({ count: count() })
    .from(creditNotes)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  // Get items
  const items = await db
    .select()
    .from(creditNotes)
    .where(whereClause)
    .orderBy(desc(creditNotes.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total available credit (issued but not applied)
  const availableResult = await db
    .select({
      totalAvailable: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)::numeric`,
    })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.organizationId, ctx.organizationId),
        eq(creditNotes.customerId, customerId),
        eq(creditNotes.status, 'issued'),
        isNull(creditNotes.deletedAt),
      ),
    );

  return {
    items,
    total,
    page,
    limit,
    hasMore: offset + items.length < total,
    totalAvailableCredit: Number(availableResult[0]?.totalAvailable ?? 0),
  };
}
