import { and, eq, gte, isNull, lt, lte, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { addresses, creditNotes, customers as customersTable, orderPayments, orders, statementHistory } from 'drizzle/schema';
import type { GenerateStatementInput, GeneratedStatement, StatementTransaction } from '@/lib/schemas';

const PAYMENT_TERMS = 'Net 30 days';

export async function generateStatementReadModel(
  ctx: SessionContext,
  data: GenerateStatementInput
): Promise<{ statement: GeneratedStatement; historyId: string }> {
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
          eq(addresses.organizationId, ctx.organizationId),
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

    const [openingInvoicesResult, openingPaymentsResult, openingCreditsResult] = await Promise.all([
      db
        .select({
          total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.customerId, customerId),
            isNull(orders.deletedAt),
            lt(orders.orderDate, startDate),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        ),
      db
        .select({
          total: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
        })
        .from(orderPayments)
        .innerJoin(orders, eq(orderPayments.orderId, orders.id))
        .where(
          and(
            eq(orderPayments.organizationId, ctx.organizationId),
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.customerId, customerId),
            isNull(orderPayments.deletedAt),
            isNull(orders.deletedAt),
            lt(orderPayments.paymentDate, startDate),
            notInArray(orders.status, ['draft', 'cancelled'])
          )
        ),
      db
        .select({
          total: sql<number>`COALESCE(SUM(${creditNotes.amount}), 0)`,
        })
        .from(creditNotes)
        .where(
          and(
            eq(creditNotes.organizationId, ctx.organizationId),
            eq(creditNotes.customerId, customerId),
            isNull(creditNotes.deletedAt),
            eq(creditNotes.status, 'applied'),
            lt(sql`DATE(COALESCE(${creditNotes.appliedAt}, ${creditNotes.createdAt}))`, startDate)
          )
        ),
    ]);

    const openingBalance =
      (openingInvoicesResult[0]?.total ?? 0) -
      (openingPaymentsResult[0]?.total ?? 0) -
      (openingCreditsResult[0]?.total ?? 0);

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
          notInArray(orders.status, ['draft', 'cancelled'])
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
          eq(creditNotes.status, 'applied'),
          gte(sql`DATE(COALESCE(${creditNotes.appliedAt}, ${creditNotes.createdAt}))`, startDate),
          lte(sql`DATE(COALESCE(${creditNotes.appliedAt}, ${creditNotes.createdAt}))`, endDate)
        )
      )
      .orderBy(creditNotes.createdAt);

    // Get payment transactions within the period
    const periodPayments = await db
      .select({
        id: orderPayments.id,
        orderId: orderPayments.orderId,
        orderNumber: orders.orderNumber,
        paymentDate: orderPayments.paymentDate,
        amount: orderPayments.amount,
        isRefund: orderPayments.isRefund,
        reference: orderPayments.reference,
      })
      .from(orderPayments)
      .innerJoin(orders, eq(orderPayments.orderId, orders.id))
      .where(
        and(
          eq(orderPayments.organizationId, ctx.organizationId),
          eq(orders.customerId, customerId),
          isNull(orderPayments.deletedAt),
          isNull(orders.deletedAt),
          gte(orderPayments.paymentDate, startDate),
          lte(orderPayments.paymentDate, endDate),
          notInArray(orders.status, ['draft', 'cancelled'])
        )
      )
      .orderBy(orderPayments.paymentDate);

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
    }

    // Process credit notes
    for (const cn of periodCreditNotes) {
      const amount = cn.amount ?? 0;
      const gst = cn.gstAmount ?? 0;

      runningBalance -= amount; // Credit notes reduce balance
      totalCredits += amount;
      totalGst -= gst;
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

    // Process payments and refunds
    for (const payment of periodPayments) {
      const amount = payment.amount ?? 0;
      const isRefund = payment.isRefund;
      const signedAmount = isRefund ? amount : -amount;

      runningBalance += signedAmount;
      totalPayments += isRefund ? -amount : amount;
      paymentCount += 1;

      transactions.push({
        id: payment.id,
        date: new Date(payment.paymentDate),
        type: 'payment',
        reference: payment.reference ?? `PAY-${payment.orderNumber}`,
        description: isRefund
          ? `Refund for ${payment.orderNumber}`
          : `Payment for ${payment.orderNumber}`,
        amount: signedAmount,
        gstAmount: 0,
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

    const [historyRecord] = await db
      .insert(statementHistory)
      .values({
        organizationId: ctx.organizationId,
        customerId,
        startDate,
        endDate,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        invoiceCount: statement.invoiceCount,
        paymentCount: statement.paymentCount,
        creditNoteCount: statement.creditNoteCount,
        totalInvoiced: statement.totalInvoiced,
        totalPayments: statement.totalPayments,
        totalCredits: statement.totalCredits,
        totalGst: statement.totalGst,
        pdfPath: null,
        notes: data.notes ?? null,
        createdBy: ctx.user.id,
      })
      .returning({ id: statementHistory.id });

    return { statement, historyId: historyRecord.id };
}
