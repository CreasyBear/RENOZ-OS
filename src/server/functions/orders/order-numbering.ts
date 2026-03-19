import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from 'drizzle/schema';

const MAX_ORDER_NUMBER_RETRIES = 5;

/**
 * Generate unique order number with prefix ORD-YYYYMMDD-XXXX.
 * Uses retry loop to handle race conditions from concurrent order creation.
 */
export async function generateOrderNumber(organizationId: string): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt++) {
    try {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            sql`DATE(${orders.orderDate}) = CURRENT_DATE`
          )
        );

      const todayCount = (countResult?.count ?? 0) + 1 + attempt;
      const sequence = todayCount.toString().padStart(4, '0');
      const orderNumber = `ORD-${datePrefix}-${sequence}`;

      const [existing] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, organizationId),
            eq(orders.orderNumber, orderNumber),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return orderNumber;
      }
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        continue;
      }
      throw error;
    }
  }

  return `ORD-${datePrefix}-${Date.now().toString(36).toUpperCase()}`;
}
