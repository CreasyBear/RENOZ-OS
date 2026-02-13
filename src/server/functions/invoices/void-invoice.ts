'use server';

/**
 * Void Invoice Server Function
 *
 * Sets invoice status to 'canceled' with guards to only allow
 * voiding from unpaid or overdue status.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source invoice from orders table
 * @mutates orders.invoiceStatus
 *
 * @see src/lib/constants/invoice-status.ts for status transitions
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';

// ============================================================================
// TYPES
// ============================================================================

export interface VoidInvoiceResponse {
  success: boolean;
  invoiceId: string;
  previousStatus: string;
  newStatus: 'canceled';
}

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const voidInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().optional(),
});

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Void an invoice (set status to canceled)
 *
 * Only allows voiding from 'unpaid' or 'overdue' status.
 * Paid invoices cannot be voided - use refund instead.
 */
export const voidInvoice = createServerFn({ method: 'POST' })
  .inputValidator(voidInvoiceSchema)
  .handler(async ({ data }): Promise<VoidInvoiceResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.delete });
    const { organizationId } = ctx;
    const userId = ctx.user.id;
    const logger = createActivityLoggerWithContext(ctx);

    const { orderId, reason } = data;

    // Get current invoice state
    const [existing] = await db
      .select({
        id: orders.id,
        invoiceStatus: orders.invoiceStatus,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Invoice not found');
    }

    if (!existing.invoiceStatus) {
      throw new ValidationError('This order does not have an invoice');
    }

    // Guard: Only allow voiding unpaid or overdue invoices
    if (!['unpaid', 'overdue'].includes(existing.invoiceStatus)) {
      throw new ValidationError(
        `Cannot void invoice in '${existing.invoiceStatus}' status. Only unpaid or overdue invoices can be voided.`
      );
    }

    // Execute update
    await db
      .update(orders)
      .set({
        invoiceStatus: 'canceled',
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, organizationId), // SECURITY: Multi-tenant isolation
          isNull(orders.deletedAt)
        )
      );

    // Log activity
    await logger.log({
      entityType: 'order',
      entityId: orderId,
      action: 'updated',
      changes: {
        before: { invoiceStatus: existing.invoiceStatus },
        after: { invoiceStatus: 'canceled' },
        fields: ['invoiceStatus'],
      },
      metadata: {
        orderNumber: existing.orderNumber,
        previousStatus: existing.invoiceStatus,
        newStatus: 'canceled',
        ...(reason ? { reason } : {}),
      },
    });

    return {
      success: true,
      invoiceId: orderId,
      previousStatus: existing.invoiceStatus,
      newStatus: 'canceled',
    };
  });
