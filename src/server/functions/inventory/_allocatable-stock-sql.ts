import { sql } from 'drizzle-orm';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/schemas/inventory';
import { inventory } from 'drizzle/schema';

export function allocatableQuantitySumSql() {
  return sql<number>`COALESCE(SUM(CASE WHEN ${inventory.status} = 'available' THEN ${inventory.quantityAvailable} ELSE 0 END), 0)::numeric`;
}

function rawAllocatableQuantitySumSql(alias = 'i') {
  return sql.raw(
    `COALESCE(SUM(CASE WHEN ${alias}.status = 'available' THEN ${alias}.quantity_available ELSE 0 END), 0)`
  );
}

export function allocatableStockCountSql(
  organizationId: string,
  condition: 'low_stock' | 'out_of_stock'
) {
  const aggregate = rawAllocatableQuantitySumSql();
  const having =
    condition === 'low_stock'
      ? sql`${aggregate} < ${DEFAULT_LOW_STOCK_THRESHOLD} AND ${aggregate} > 0`
      : sql`${aggregate} <= 0`;

  return sql<number>`
    (
      SELECT COUNT(*)::int
      FROM (
        SELECT i.product_id
        FROM inventory i
        WHERE i.organization_id = ${organizationId}
        GROUP BY i.product_id
        HAVING ${having}
      ) product_availability
    )
  `;
}
