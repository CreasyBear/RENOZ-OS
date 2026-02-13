/**
 * Recent Items Server Functions
 *
 * Lightweight queries for dashboard popover data.
 * Returns top N items for each metric category.
 *
 * PATTERN: Each function returns a standard shape:
 * {
 *   items: Array<{ id, title, subtitle, status?, href? }>,
 *   total: number
 * }
 *
 * This allows consistent consumption by MetricCardPopover.
 *
 * @see src/components/shared/metric-card-popover.tsx for UI component
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, isNull, gt, ne, desc, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, customers, opportunities } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';

// ============================================================================
// SHARED TYPES
// ============================================================================

/** Standard recent item shape for popovers */
export interface RecentItemResult {
  id: string;
  title: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  href?: string;
}

/** Standard response shape for recent items queries */
export interface RecentItemsResponse {
  items: RecentItemResult[];
  total: number;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const recentItemsQuerySchema = z.object({
  limit: z.number().min(1).max(10).default(5),
});

// ============================================================================
// FINANCIAL: OUTSTANDING INVOICES
// ============================================================================

/**
 * Get recent outstanding invoices for AR Balance popover.
 * Returns top invoices by balance due, with customer name and order number.
 */
export const getRecentOutstandingInvoices = createServerFn({ method: 'GET' })
  .inputValidator(recentItemsQuerySchema)
  .handler(async ({ data }): Promise<RecentItemsResponse> => {
    const ctx = await withAuth();
    const now = new Date();

    // Get outstanding orders sorted by balance due (highest first)
    const outstandingOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        balanceDue: orders.balanceDue,
        dueDate: orders.dueDate,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0)
        )
      )
      .orderBy(desc(orders.balanceDue))
      .limit(data.limit);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0)
        )
      );

    const items: RecentItemResult[] = outstandingOrders.map((order) => {
      const dueDate = order.dueDate ? new Date(order.dueDate) : null;
      const daysOverdue = dueDate
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: order.id,
        title: order.customerName,
        subtitle: `${order.orderNumber} · $${Number(order.balanceDue).toLocaleString()}`,
        status: daysOverdue > 0 ? 'warning' : 'neutral',
        href: `/orders/${order.id}`,
      };
    });

    return {
      items,
      total: countResult[0]?.count ?? 0,
    };
  });

// ============================================================================
// FINANCIAL: OVERDUE INVOICES
// ============================================================================

/**
 * Get recent overdue invoices for Overdue AR popover.
 * Returns invoices past due date, sorted by days overdue.
 */
export const getRecentOverdueInvoices = createServerFn({ method: 'GET' })
  .inputValidator(recentItemsQuerySchema)
  .handler(async ({ data }): Promise<RecentItemsResponse> => {
    const ctx = await withAuth();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get overdue orders sorted by due date (oldest first)
    const overdueOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        balanceDue: orders.balanceDue,
        dueDate: orders.dueDate,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0),
          lt(orders.dueDate, todayStr) // Past due
        )
      )
      .orderBy(orders.dueDate) // Oldest first
      .limit(data.limit);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          ne(orders.status, 'cancelled'),
          gt(orders.balanceDue, 0),
          lt(orders.dueDate, todayStr)
        )
      );

    const items: RecentItemResult[] = overdueOrders.map((order) => {
      const dueDate = order.dueDate ? new Date(order.dueDate) : null;
      const daysOverdue = dueDate
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: order.id,
        title: order.customerName,
        subtitle: `${order.orderNumber} · ${daysOverdue} days overdue`,
        status: daysOverdue > 30 ? 'error' : 'warning',
        href: `/orders/${order.id}`,
      };
    });

    return {
      items,
      total: countResult[0]?.count ?? 0,
    };
  });

// ============================================================================
// PIPELINE: TOP OPPORTUNITIES
// ============================================================================

/**
 * Get top opportunities by value for Pipeline popover.
 */
export const getRecentOpportunities = createServerFn({ method: 'GET' })
  .inputValidator(recentItemsQuerySchema)
  .handler(async ({ data }): Promise<RecentItemsResponse> => {
    const ctx = await withAuth();

    // Get top opportunities by value
    const topOpportunities = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        value: opportunities.value,
        stage: opportunities.stage,
        customerName: customers.name,
      })
      .from(opportunities)
      .innerJoin(customers, eq(opportunities.customerId, customers.id))
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt),
          ne(opportunities.stage, 'won'),
          ne(opportunities.stage, 'lost')
        )
      )
      .orderBy(desc(opportunities.value))
      .limit(data.limit);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt),
          ne(opportunities.stage, 'won'),
          ne(opportunities.stage, 'lost')
        )
      );

    const items: RecentItemResult[] = topOpportunities.map((opp) => ({
      id: opp.id,
      title: opp.title,
      subtitle: `${opp.customerName} · $${Number(opp.value).toLocaleString()}`,
      status: 'neutral',
      href: `/pipeline/${opp.id}`,
    }));

    return {
      items,
      total: countResult[0]?.count ?? 0,
    };
  });

// ============================================================================
// OPERATIONS: ORDERS TO SHIP
// ============================================================================

/**
 * Get orders ready to ship for Operations popover.
 * Returns confirmed orders sorted by oldest first.
 */
export const getRecentOrdersToShip = createServerFn({ method: 'GET' })
  .inputValidator(recentItemsQuerySchema)
  .handler(async ({ data }): Promise<RecentItemsResponse> => {
    const ctx = await withAuth();
    const now = new Date();

    // Get confirmed orders sorted by order date (oldest first)
    const confirmedOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        total: orders.total,
        orderDate: orders.orderDate,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          eq(orders.status, 'confirmed')
        )
      )
      .orderBy(orders.orderDate) // Oldest first
      .limit(data.limit);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt),
          eq(orders.status, 'confirmed')
        )
      );

    const items: RecentItemResult[] = confirmedOrders.map((order) => {
      const orderDate = new Date(order.orderDate);
      const daysOld = Math.floor(
        (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: order.id,
        title: order.customerName,
        subtitle: `${order.orderNumber} · ${daysOld > 0 ? `${daysOld}d old` : 'Today'}`,
        status: daysOld > 7 ? 'warning' : 'neutral',
        href: `/orders/${order.id}`,
      };
    });

    return {
      items,
      total: countResult[0]?.count ?? 0,
    };
  });
