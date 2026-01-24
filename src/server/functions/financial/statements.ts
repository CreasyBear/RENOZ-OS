/**
 * Customer Statements Server Functions
 *
 * Statement generation and history tracking for battery equipment sales.
 * Statements show:
 * - Opening balance
 * - Transactions (invoices, payments, credit notes)
 * - Closing balance
 * - GST breakdown
 * - Payment terms reminder (30 days)
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-004b
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, isNull, desc, gte, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  statementHistory,
  customers as customersTable,
  addresses,
  orders,
  creditNotes,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import {
  idParamSchema,
  generateStatementSchema,
  saveStatementHistorySchema,
  markStatementSentSchema,
  statementHistoryQuerySchema,
  statementListQuerySchema,
  type GeneratedStatement,
  type StatementTransaction,
  type StatementHistoryRecord,
} from '@/lib/schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard payment terms for statements */
const PAYMENT_TERMS = 'Net 30 days';

// ============================================================================
// GENERATE STATEMENT
// ============================================================================

/**
 * Generate a statement for a customer for the given date range.
 *
 * This computes all transactions (invoices, payments, credit notes)
 * within the period and calculates opening/closing balances.
 *
 * Note: This returns statement data - PDF generation is separate.
 */
export const generateStatement = createServerFn()
  .inputValidator(generateStatementSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { customerId, startDate, endDate } = data;

    // Get customer info
    const customerResult = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, customerId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      )
      .limit(1);

    if (customerResult.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    const customer = customerResult[0];

    // Get billing address from addresses table
    const billingAddressResult = await db
      .select({
        street1: addresses.street1,
        street2: addresses.street2,
        city: addresses.city,
        state: addresses.state,
        postcode: addresses.postcode,
      })
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.type, 'billing'),
          eq(addresses.isPrimary, true)
        )
      )
      .limit(1);

    // Format customer address
    let customerAddress: string | null = null;
    if (billingAddressResult.length > 0) {
      const addr = billingAddressResult[0];
      const addressParts = [
        addr.street1,
        addr.street2,
        addr.city,
        addr.state,
        addr.postcode,
      ].filter(Boolean);
      customerAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
    }

    // Calculate opening balance (sum of all order balances before start date)
    const openingBalanceResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(${orders.balanceDue}, ${orders.total} - COALESCE(${orders.paidAmount}, 0))), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          eq(orders.customerId, customerId),
          isNull(orders.deletedAt),
          sql`${orders.orderDate} < ${startDate}`,
          // Exclude draft and cancelled
          sql`${orders.status} NOT IN ('draft', 'cancelled')`
        )
      );

    const openingBalance = openingBalanceResult[0]?.total ?? 0;

    // Get all orders (invoices) within the period
    const periodOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        total: orders.total,
        taxAmount: orders.taxAmount,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          eq(orders.customerId, customerId),
          isNull(orders.deletedAt),
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate),
          sql`${orders.status} NOT IN ('draft', 'cancelled')`
        )
      )
      .orderBy(orders.orderDate);

    // Get credit notes within the period
    const periodCreditNotes = await db
      .select({
        id: creditNotes.id,
        creditNoteNumber: creditNotes.creditNoteNumber,
        createdAt: creditNotes.createdAt,
        amount: creditNotes.amount,
        gstAmount: creditNotes.gstAmount,
        reason: creditNotes.reason,
      })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.organizationId, ctx.organizationId),
          eq(creditNotes.customerId, customerId),
          isNull(creditNotes.deletedAt),
          // Only issued or applied credit notes count
          or(eq(creditNotes.status, 'issued'), eq(creditNotes.status, 'applied')),
          sql`DATE(${creditNotes.createdAt}) >= ${startDate}`,
          sql`DATE(${creditNotes.createdAt}) <= ${endDate}`
        )
      )
      .orderBy(creditNotes.createdAt);

    // Build transactions list and calculate totals
    const transactions: StatementTransaction[] = [];
    let runningBalance = openingBalance;
    let totalInvoiced = 0;
    let totalPayments = 0;
    let totalCredits = 0;
    let totalGst = 0;
    let invoiceCount = 0;
    let paymentCount = 0;
    let creditNoteCount = 0;

    // Process orders (invoices)
    for (const order of periodOrders) {
      const amount = order.total ?? 0;
      const gst = order.taxAmount ?? 0;

      runningBalance += amount;
      totalInvoiced += amount;
      totalGst += gst;
      invoiceCount += 1;

      transactions.push({
        id: order.id,
        date: new Date(order.orderDate),
        type: 'invoice',
        reference: order.orderNumber,
        description: `Invoice ${order.orderNumber}`,
        amount: amount,
        gstAmount: gst,
        balance: runningBalance,
      });

      // If there's a payment on this order, add it as a separate transaction
      const paidAmount = order.paidAmount ?? 0;
      if (paidAmount > 0) {
        runningBalance -= paidAmount;
        totalPayments += paidAmount;
        paymentCount += 1;

        transactions.push({
          id: `${order.id}-payment`,
          date: new Date(order.orderDate), // Same date as invoice for simplicity
          type: 'payment',
          reference: `PAY-${order.orderNumber}`,
          description: `Payment for ${order.orderNumber}`,
          amount: -paidAmount, // Negative because it reduces balance
          gstAmount: 0,
          balance: runningBalance,
        });
      }
    }

    // Process credit notes
    for (const cn of periodCreditNotes) {
      const amount = cn.amount ?? 0;
      const gst = cn.gstAmount ?? 0;

      runningBalance -= amount; // Credit notes reduce balance
      totalCredits += amount;
      creditNoteCount += 1;

      transactions.push({
        id: cn.id,
        date: cn.createdAt ?? new Date(),
        type: 'credit_note',
        reference: cn.creditNoteNumber,
        description: cn.reason ?? `Credit Note ${cn.creditNoteNumber}`,
        amount: -amount, // Negative because it reduces balance
        gstAmount: gst,
        balance: runningBalance,
      });
    }

    // Sort all transactions by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Recalculate running balance in sorted order
    let sortedRunningBalance = openingBalance;
    for (const txn of transactions) {
      sortedRunningBalance += txn.amount;
      txn.balance = sortedRunningBalance;
    }

    const closingBalance = sortedRunningBalance;

    const statement: GeneratedStatement = {
      customerId,
      customerName: customer.name ?? 'Unknown',
      customerEmail: customer.email,
      customerAddress,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      openingBalance,
      closingBalance,
      invoiceCount,
      paymentCount,
      creditNoteCount,
      totalInvoiced,
      totalPayments,
      totalCredits,
      totalGst,
      transactions,
      paymentTerms: PAYMENT_TERMS,
      generatedAt: new Date(),
    };

    return statement;
  });

// ============================================================================
// SAVE STATEMENT HISTORY
// ============================================================================

/**
 * Save a generated statement to history.
 *
 * Call this after generating a statement PDF.
 * Returns the created history record ID.
 */
export const saveStatementHistory = createServerFn()
  .inputValidator(saveStatementHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify customer exists
    const customerExists = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, data.customerId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      )
      .limit(1);

    if (customerExists.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    const [record] = await db
      .insert(statementHistory)
      .values({
        organizationId: ctx.organizationId,
        customerId: data.customerId,
        startDate: data.startDate,
        endDate: data.endDate,
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        invoiceCount: data.invoiceCount,
        paymentCount: data.paymentCount,
        creditNoteCount: data.creditNoteCount,
        totalInvoiced: data.totalInvoiced,
        totalPayments: data.totalPayments,
        totalCredits: data.totalCredits,
        totalGst: data.totalGst,
        pdfPath: data.pdfPath ?? null,
        notes: data.notes ?? null,
        createdBy: ctx.user.id,
      })
      .returning({ id: statementHistory.id });

    return { id: record.id };
  });

// ============================================================================
// MARK STATEMENT SENT
// ============================================================================

/**
 * Mark a statement as sent via email.
 */
export const markStatementSent = createServerFn()
  .inputValidator(markStatementSentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [updated] = await db
      .update(statementHistory)
      .set({
        sentAt: new Date(),
        sentToEmail: data.sentToEmail,
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(statementHistory.id, data.statementId),
          eq(statementHistory.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: statementHistory.id });

    if (!updated) {
      throw new NotFoundError('Statement not found');
    }

    return { success: true };
  });

// ============================================================================
// GET STATEMENT HISTORY
// ============================================================================

/**
 * Get statement history for a specific customer.
 */
export const getStatementHistory = createServerFn()
  .inputValidator(statementHistoryQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { customerId, page, pageSize, dateFrom, dateTo } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [
      eq(statementHistory.organizationId, ctx.organizationId),
      eq(statementHistory.customerId, customerId),
    ];

    if (dateFrom) {
      conditions.push(gte(statementHistory.endDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(statementHistory.startDate, dateTo));
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
  });

// ============================================================================
// GET STATEMENT BY ID
// ============================================================================

/**
 * Get a single statement by ID.
 */
export const getStatement = createServerFn()
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

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
  });

// ============================================================================
// LIST ALL STATEMENTS
// ============================================================================

/**
 * List all statements across customers (admin view).
 */
export const listStatements = createServerFn()
  .inputValidator(statementListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, customerId, dateFrom, dateTo, onlySent } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [eq(statementHistory.organizationId, ctx.organizationId)];

    if (customerId) {
      conditions.push(eq(statementHistory.customerId, customerId));
    }
    if (dateFrom) {
      conditions.push(gte(statementHistory.endDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(statementHistory.startDate, dateTo));
    }
    if (onlySent) {
      conditions.push(sql`${statementHistory.sentAt} IS NOT NULL`);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
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
  });
