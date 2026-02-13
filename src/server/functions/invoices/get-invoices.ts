'use server';

/**
 * Get Invoices Server Function
 *
 * Lists orders with invoice data, filtered by invoice status.
 * Invoice data is derived from orders - we query orders but
 * filter and format for invoice-centric views.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source invoices from orders table (invoice data is derived from orders)
 * @source customer from customers table (joined via customerId)
 *
 * @see src/lib/schemas/invoices for validation schemas
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, isNull, ilike, gte, lte, or, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { invoiceListQuerySchema, invoiceCursorQuerySchema } from '@/lib/schemas/invoices';
import type { InvoiceStatus } from '@/lib/constants/invoice-status';
import type { InvoiceListItem, InvoiceListResponse } from '@/lib/schemas/invoices';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Get a paginated list of invoices with filters
 */
export const getInvoices = createServerFn({ method: 'GET' })
  .inputValidator(invoiceListQuerySchema)
  .handler(async ({ data: filters }): Promise<InvoiceListResponse> => {
    const ctx = await withAuth();
    const { organizationId } = ctx;

    const {
      search,
      status,
      customerId,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters ?? {};

    // Build conditions
    const conditions = [
      eq(orders.organizationId, organizationId),
      isNull(orders.deletedAt),
    ];

    // Filter by invoice status
    if (status) {
      conditions.push(eq(orders.invoiceStatus, status));
    }

    // Filter by customer
    if (customerId) {
      conditions.push(eq(orders.customerId, customerId));
    }

    // Date range filter
    if (fromDate) {
      conditions.push(gte(orders.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      conditions.push(lte(orders.createdAt, new Date(toDate)));
    }

    // Amount range filter
    if (minAmount !== undefined) {
      conditions.push(gte(orders.total, minAmount));
    }
    if (maxAmount !== undefined) {
      conditions.push(lte(orders.total, maxAmount));
    }

    // Search across invoice number, order number, and customer name
    // Customer join is always performed, so we can search customer.name directly
    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(orders.orderNumber, searchPattern),
          ilike(orders.invoiceNumber, searchPattern),
          ilike(customers.name, searchPattern)
        )!
      );
    }

    // Sort configuration
    // Note: Customer join is always performed, so use joined column directly
    const sortColumn = {
      createdAt: orders.createdAt,
      dueDate: orders.invoiceDueDate,
      total: orders.total,
      invoiceNumber: orders.invoiceNumber,
      customer: customers.name, // Use joined column instead of subquery
    }[sortBy] ?? orders.createdAt;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute query with pagination
    // SECURITY: Always join customers with organizationId filter for multi-tenant isolation
    const offset = (page - 1) * pageSize;

    // Build customer join condition with organizationId filter
    const customerJoinCondition = and(
      eq(orders.customerId, customers.id),
      eq(customers.organizationId, organizationId), // SECURITY: Multi-tenant isolation
      isNull(customers.deletedAt)
    );

    const [invoiceRows, countResult] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          invoiceNumber: orders.invoiceNumber,
          customerId: orders.customerId,
          invoiceStatus: orders.invoiceStatus,
          invoiceDueDate: orders.invoiceDueDate,
          invoiceSentAt: orders.invoiceSentAt,
          invoiceViewedAt: orders.invoiceViewedAt,
          invoicePdfUrl: orders.invoicePdfUrl,
          total: orders.total,
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customerName: customers.name,
          customerEmail: customers.email,
        })
        .from(orders)
        .innerJoin(customers, customerJoinCondition)
        .where(and(...conditions))
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset(offset),
      // Count query must match main query joins for accurate count
      db
        .select({ count: count() })
        .from(orders)
        .innerJoin(customers, customerJoinCondition)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    // Transform to response format
    const invoices: InvoiceListItem[] = invoiceRows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      invoiceNumber: row.invoiceNumber,
      customerId: row.customerId,
      invoiceStatus: row.invoiceStatus as InvoiceStatus | null,
      invoiceDueDate: row.invoiceDueDate,
      invoiceSentAt: row.invoiceSentAt,
      invoiceViewedAt: row.invoiceViewedAt,
      invoicePdfUrl: row.invoicePdfUrl,
      total: row.total ? Number(row.total) : null,
      paidAmount: row.paidAmount ? Number(row.paidAmount) : null,
      balanceDue: row.balanceDue ? Number(row.balanceDue) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customerId,
        name: row.customerName,
        email: row.customerEmail,
      },
    }));

    return {
      invoices,
      total,
      page,
      pageSize,
      hasMore: offset + invoices.length < total,
    };
  });

/**
 * Get invoices with cursor pagination (recommended for large datasets).
 */
export const getInvoicesCursor = createServerFn({ method: 'GET' })
  .inputValidator(invoiceCursorQuerySchema)
  .handler(async ({ data: filters }) => {
    const ctx = await withAuth();
    const { organizationId } = ctx;
    const { cursor, pageSize = 20, sortOrder = 'desc', ...rest } = filters ?? {};

    const conditions = [
      eq(orders.organizationId, organizationId),
      isNull(orders.deletedAt),
    ];

    if (rest.status) conditions.push(eq(orders.invoiceStatus, rest.status));
    if (rest.customerId) conditions.push(eq(orders.customerId, rest.customerId));
    if (rest.fromDate) conditions.push(gte(orders.createdAt, new Date(rest.fromDate)));
    if (rest.toDate) conditions.push(lte(orders.createdAt, new Date(rest.toDate)));
    if (rest.minAmount !== undefined) conditions.push(gte(orders.total, rest.minAmount));
    if (rest.maxAmount !== undefined) conditions.push(lte(orders.total, rest.maxAmount));

    if (rest.search) {
      const searchPattern = containsPattern(rest.search);
      conditions.push(
        or(
          ilike(orders.orderNumber, searchPattern),
          ilike(orders.invoiceNumber, searchPattern),
          ilike(customers.name, searchPattern)
        )!
      );
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(orders.createdAt, orders.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderFn = sortOrder === 'asc' ? asc : desc;
    const customerJoinCondition = and(
      eq(orders.customerId, customers.id),
      eq(customers.organizationId, organizationId),
      isNull(customers.deletedAt)
    );

    const invoiceRows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        invoiceNumber: orders.invoiceNumber,
        customerId: orders.customerId,
        invoiceStatus: orders.invoiceStatus,
        invoiceDueDate: orders.invoiceDueDate,
        invoiceSentAt: orders.invoiceSentAt,
        invoiceViewedAt: orders.invoiceViewedAt,
        invoicePdfUrl: orders.invoicePdfUrl,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(orders)
      .innerJoin(customers, customerJoinCondition)
      .where(and(...conditions))
      .orderBy(orderFn(orders.createdAt), orderFn(orders.id))
      .limit(pageSize + 1);

    const invoices: InvoiceListItem[] = invoiceRows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      invoiceNumber: row.invoiceNumber,
      customerId: row.customerId,
      invoiceStatus: row.invoiceStatus as InvoiceStatus | null,
      invoiceDueDate: row.invoiceDueDate,
      invoiceSentAt: row.invoiceSentAt,
      invoiceViewedAt: row.invoiceViewedAt,
      invoicePdfUrl: row.invoicePdfUrl,
      total: row.total ? Number(row.total) : null,
      paidAmount: row.paidAmount ? Number(row.paidAmount) : null,
      balanceDue: row.balanceDue ? Number(row.balanceDue) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: { id: row.customerId, name: row.customerName, email: row.customerEmail },
    }));

    return buildStandardCursorResponse(invoices, pageSize);
  });
