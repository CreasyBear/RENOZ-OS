'use server';

/**
 * Get Invoice Summary Server Function
 *
 * Aggregates invoice totals by status for dashboard cards.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source summary aggregated from orders table (invoice data)
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull, inArray, gte, lte, count, sum } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { invoiceSummaryQuerySchema } from '@/lib/schemas/invoices';
import {
  INVOICE_STATUS_VALUES,
  OPEN_INVOICE_STATUSES,
  type InvoiceStatus,
} from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceStatusSummary {
  status: InvoiceStatus;
  count: number;
  totalAmount: number;
}

export interface InvoiceSummaryResponse {
  byStatus: InvoiceStatusSummary[];
  totals: {
    open: {
      count: number;
      amount: number;
    };
    overdue: {
      count: number;
      amount: number;
    };
    paid: {
      count: number;
      amount: number;
    };
    all: {
      count: number;
      amount: number;
    };
  };
}

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Get invoice summary aggregates for dashboard
 */
export const getInvoiceSummary = createServerFn({ method: 'GET' })
  .inputValidator(invoiceSummaryQuerySchema)
  .handler(async ({ data: filters }): Promise<InvoiceSummaryResponse> => {
    const ctx = await withAuth();
    const { organizationId } = ctx;

    const { statuses, customerId, fromDate, toDate } = filters ?? {};

    // Build base conditions
    const baseConditions = [
      eq(orders.organizationId, organizationId),
      isNull(orders.deletedAt),
    ];

    if (customerId) {
      baseConditions.push(eq(orders.customerId, customerId));
    }

    if (fromDate) {
      baseConditions.push(gte(orders.createdAt, new Date(fromDate)));
    }

    if (toDate) {
      baseConditions.push(lte(orders.createdAt, new Date(toDate)));
    }

    // Build final conditions array
    const finalConditions = [...baseConditions];
    if (statuses?.length) {
      finalConditions.push(inArray(orders.invoiceStatus, statuses));
    }

    // Get counts and totals by status
    const statusResults = await db
      .select({
        status: orders.invoiceStatus,
        count: count(),
        totalAmount: sum(orders.total),
      })
      .from(orders)
      .where(and(...finalConditions))
      .groupBy(orders.invoiceStatus);

    // Build byStatus array with all statuses (even if zero)
    // Handle null sum() result (Drizzle returns null when no rows match)
    const byStatus: InvoiceStatusSummary[] = INVOICE_STATUS_VALUES.map((status) => {
      const found = statusResults.find((r) => r.status === status);
      return {
        status,
        count: Number(found?.count ?? 0),
        totalAmount: Number(found?.totalAmount ?? 0), // sum() returns null if no rows, coalesce to 0
      };
    });

    // Calculate totals
    const openStatuses = byStatus.filter((s) =>
      OPEN_INVOICE_STATUSES.includes(s.status)
    );
    const overdueStatus = byStatus.find((s) => s.status === 'overdue');
    const paidStatus = byStatus.find((s) => s.status === 'paid');

    const totals = {
      open: {
        count: openStatuses.reduce((sum, s) => sum + s.count, 0),
        amount: openStatuses.reduce((sum, s) => sum + s.totalAmount, 0),
      },
      overdue: {
        count: overdueStatus?.count ?? 0,
        amount: overdueStatus?.totalAmount ?? 0,
      },
      paid: {
        count: paidStatus?.count ?? 0,
        amount: paidStatus?.totalAmount ?? 0,
      },
      all: {
        count: byStatus.reduce((sum, s) => sum + s.count, 0),
        amount: byStatus.reduce((sum, s) => sum + s.totalAmount, 0),
      },
    };

    return {
      byStatus,
      totals,
    };
  });
