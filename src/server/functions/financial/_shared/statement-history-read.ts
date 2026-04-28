import { and, count, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { customers as customersTable, statementHistory } from 'drizzle/schema';
import type { StatementHistoryQuery, StatementHistoryRecord, StatementListQuery } from '@/lib/schemas';

export async function readStatementHistory(
  ctx: SessionContext,
  data: StatementHistoryQuery
): Promise<{ items: StatementHistoryRecord[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }> {
    const { customerId, page, pageSize, dateFrom, dateTo } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [
      eq(statementHistory.organizationId, ctx.organizationId),
      eq(statementHistory.customerId, customerId),
    ];

    if (dateFrom) {
      conditions.push(gte(statementHistory.endDate, dateFrom.toISOString().split('T')[0]));
    }
    if (dateTo) {
      conditions.push(lte(statementHistory.startDate, dateTo.toISOString().split('T')[0]));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(statementHistory)
      .where(and(...conditions));

    const totalItems = countResult[0]?.count ?? 0;

    // Get paginated records with customer name
    const records = await db
      .select({
        id: statementHistory.id,
        customerId: statementHistory.customerId,
        customerName: customersTable.name,
        startDate: statementHistory.startDate,
        endDate: statementHistory.endDate,
        openingBalance: statementHistory.openingBalance,
        closingBalance: statementHistory.closingBalance,
        invoiceCount: statementHistory.invoiceCount,
        paymentCount: statementHistory.paymentCount,
        creditNoteCount: statementHistory.creditNoteCount,
        totalInvoiced: statementHistory.totalInvoiced,
        totalPayments: statementHistory.totalPayments,
        totalCredits: statementHistory.totalCredits,
        totalGst: statementHistory.totalGst,
        pdfPath: statementHistory.pdfPath,
        sentAt: statementHistory.sentAt,
        sentToEmail: statementHistory.sentToEmail,
        createdAt: statementHistory.createdAt,
      })
      .from(statementHistory)
      .innerJoin(customersTable, eq(statementHistory.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(statementHistory.endDate))
      .limit(pageSize)
      .offset(offset);

    // Map to response type
    const items: StatementHistoryRecord[] = records.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName ?? 'Unknown',
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      openingBalance: r.openingBalance,
      closingBalance: r.closingBalance,
      invoiceCount: r.invoiceCount,
      paymentCount: r.paymentCount,
      creditNoteCount: r.creditNoteCount,
      totalInvoiced: r.totalInvoiced,
      totalPayments: r.totalPayments,
      totalCredits: r.totalCredits,
      totalGst: r.totalGst,
      pdfPath: r.pdfPath,
      sentAt: r.sentAt,
      sentToEmail: r.sentToEmail,
      createdAt: r.createdAt ?? new Date(),
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

export async function readStatementById(
  ctx: SessionContext,
  data: { id: string }
): Promise<StatementHistoryRecord> {
    const records = await db
      .select({
        id: statementHistory.id,
        customerId: statementHistory.customerId,
        customerName: customersTable.name,
        startDate: statementHistory.startDate,
        endDate: statementHistory.endDate,
        openingBalance: statementHistory.openingBalance,
        closingBalance: statementHistory.closingBalance,
        invoiceCount: statementHistory.invoiceCount,
        paymentCount: statementHistory.paymentCount,
        creditNoteCount: statementHistory.creditNoteCount,
        totalInvoiced: statementHistory.totalInvoiced,
        totalPayments: statementHistory.totalPayments,
        totalCredits: statementHistory.totalCredits,
        totalGst: statementHistory.totalGst,
        pdfPath: statementHistory.pdfPath,
        sentAt: statementHistory.sentAt,
        sentToEmail: statementHistory.sentToEmail,
        createdAt: statementHistory.createdAt,
      })
      .from(statementHistory)
      .innerJoin(customersTable, eq(statementHistory.customerId, customersTable.id))
      .where(
        and(
          eq(statementHistory.id, data.id),
          eq(statementHistory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundError('Statement not found');
    }

    const r = records[0];
    const statement: StatementHistoryRecord = {
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName ?? 'Unknown',
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      openingBalance: r.openingBalance,
      closingBalance: r.closingBalance,
      invoiceCount: r.invoiceCount,
      paymentCount: r.paymentCount,
      creditNoteCount: r.creditNoteCount,
      totalInvoiced: r.totalInvoiced,
      totalPayments: r.totalPayments,
      totalCredits: r.totalCredits,
      totalGst: r.totalGst,
      pdfPath: r.pdfPath,
      sentAt: r.sentAt,
      sentToEmail: r.sentToEmail,
      createdAt: r.createdAt ?? new Date(),
    };

    return statement;
}

export async function listStatementHistory(
  ctx: SessionContext,
  data: StatementListQuery
): Promise<{ items: StatementHistoryRecord[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }> {
    const { page, pageSize, customerId, dateFrom, dateTo, onlySent } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(statementHistory.organizationId, ctx.organizationId)];

    if (customerId) {
      conditions.push(eq(statementHistory.customerId, customerId));
    }
    if (dateFrom) {
      conditions.push(gte(statementHistory.endDate, dateFrom.toISOString().split('T')[0]));
    }
    if (dateTo) {
      conditions.push(lte(statementHistory.startDate, dateTo.toISOString().split('T')[0]));
    }
    if (onlySent) {
      conditions.push(isNotNull(statementHistory.sentAt));
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(statementHistory)
      .where(and(...conditions));

    const totalItems = countResult[0]?.count ?? 0;

    // Get paginated records
    const records = await db
      .select({
        id: statementHistory.id,
        customerId: statementHistory.customerId,
        customerName: customersTable.name,
        startDate: statementHistory.startDate,
        endDate: statementHistory.endDate,
        openingBalance: statementHistory.openingBalance,
        closingBalance: statementHistory.closingBalance,
        invoiceCount: statementHistory.invoiceCount,
        paymentCount: statementHistory.paymentCount,
        creditNoteCount: statementHistory.creditNoteCount,
        totalInvoiced: statementHistory.totalInvoiced,
        totalPayments: statementHistory.totalPayments,
        totalCredits: statementHistory.totalCredits,
        totalGst: statementHistory.totalGst,
        pdfPath: statementHistory.pdfPath,
        sentAt: statementHistory.sentAt,
        sentToEmail: statementHistory.sentToEmail,
        createdAt: statementHistory.createdAt,
      })
      .from(statementHistory)
      .innerJoin(customersTable, eq(statementHistory.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(statementHistory.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: StatementHistoryRecord[] = records.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName ?? 'Unknown',
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      openingBalance: r.openingBalance,
      closingBalance: r.closingBalance,
      invoiceCount: r.invoiceCount,
      paymentCount: r.paymentCount,
      creditNoteCount: r.creditNoteCount,
      totalInvoiced: r.totalInvoiced,
      totalPayments: r.totalPayments,
      totalCredits: r.totalCredits,
      totalGst: r.totalGst,
      pdfPath: r.pdfPath,
      sentAt: r.sentAt,
      sentToEmail: r.sentToEmail,
      createdAt: r.createdAt ?? new Date(),
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
