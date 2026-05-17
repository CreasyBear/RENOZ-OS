import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inventory } from 'drizzle/schema';
import type { InventoryTurnoverResult } from '@/lib/schemas/inventory';

interface ReadInventoryTurnoverInput {
  organizationId: string;
  period: InventoryTurnoverResult['turnover']['period'];
  productId?: string;
}

export async function readInventoryTurnover({
  organizationId,
  period,
  productId,
}: ReadInventoryTurnoverInput): Promise<InventoryTurnoverResult> {
  const periodDays = period === '30d' ? 30 : period === '90d' ? 90 : 365;

  const conditions = [eq(inventory.organizationId, organizationId)];
  if (productId) {
    conditions.push(eq(inventory.productId, productId));
  }

  const [currentInventory] = await db
    .select({
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
    })
    .from(inventory)
    .where(and(...conditions));

  // RAW SQL (Phase 11 Keep): CTEs, turnover calculations. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  const cogsPeriodResult = await db.execute<{ cogs: number }>(
    sql`
      SELECT COALESCE(SUM(ABS(total_cost)), 0)::numeric as cogs
      FROM inventory_movements
      WHERE organization_id = ${organizationId}
        AND movement_type IN ('pick', 'ship')
        AND quantity < 0
        AND created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
        ${productId ? sql`AND product_id = ${productId}` : sql``}
    `
  );

  const cogs = Number((cogsPeriodResult as unknown as { cogs: number }[])[0]?.cogs ?? 0);
  const avgInventory = Number(currentInventory?.totalValue ?? 0);
  const annualizedCOGS = (cogs / periodDays) * 365;
  const turnoverRate = avgInventory > 0 ? annualizedCOGS / avgInventory : 0;
  const daysOnHand = turnoverRate > 0 ? 365 / turnoverRate : 0;

  const turnoverByProduct = await db.execute<{
    productId: string;
    productSku: string;
    productName: string;
    inventoryValue: number;
    periodCOGS: number;
    turnoverRate: number;
  }>(
    sql`
      WITH product_cogs AS (
        SELECT
          product_id,
          COALESCE(SUM(ABS(total_cost)), 0) as period_cogs
        FROM inventory_movements
        WHERE organization_id = ${organizationId}
          AND movement_type IN ('pick', 'ship')
          AND quantity < 0
          AND created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
        GROUP BY product_id
      ),
      product_inventory AS (
        SELECT
          product_id,
          COALESCE(SUM(total_value), 0) as inventory_value
        FROM inventory
        WHERE organization_id = ${organizationId}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
        GROUP BY product_id
      )
      SELECT
        p.id as product_id,
        COALESCE(NULLIF(p.sku, ''), 'N/A') as product_sku,
        COALESCE(NULLIF(p.name, ''), 'Unknown Product') as product_name,
        COALESCE(pi.inventory_value, 0)::numeric as inventory_value,
        COALESCE(pc.period_cogs, 0)::numeric as period_cogs,
        CASE
          WHEN COALESCE(pi.inventory_value, 0) > 0
          THEN ((COALESCE(pc.period_cogs, 0) / ${periodDays}) * 365) / pi.inventory_value
          ELSE 0
        END::numeric as turnover_rate
      FROM products p
      LEFT JOIN product_inventory pi ON p.id = pi.product_id
      LEFT JOIN product_cogs pc ON p.id = pc.product_id
      WHERE p.organization_id = ${organizationId}
        AND p.deleted_at IS NULL
        AND p.name IS NOT NULL
        AND TRIM(p.name) != ''
        ${productId ? sql`AND p.id = ${productId}` : sql``}
        AND (COALESCE(pi.inventory_value, 0) > 0 OR COALESCE(pc.period_cogs, 0) > 0)
      ORDER BY turnover_rate DESC
      LIMIT 20
    `
  );

  const previousPeriodDays = periodDays;
  const previousPeriodStartDaysAgo = periodDays * 2;
  const previousPeriodEndDaysAgo = periodDays;
  const previousPeriodStartDate = sql`NOW() - INTERVAL '1 day' * ${previousPeriodStartDaysAgo}`;
  const previousPeriodEndDate = sql`NOW() - INTERVAL '1 day' * ${previousPeriodEndDaysAgo}`;
  const previousTurnoverByProduct = await db.execute<{
    productId: string;
    turnoverRate: number;
  }>(
    sql`
      WITH product_cogs_prev AS (
        SELECT
          product_id,
          COALESCE(SUM(ABS(total_cost)), 0) as period_cogs
        FROM inventory_movements
        WHERE organization_id = ${organizationId}
          AND movement_type IN ('pick', 'ship')
          AND quantity < 0
          AND created_at >= ${previousPeriodStartDate}
          AND created_at < ${previousPeriodEndDate}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
        GROUP BY product_id
      ),
      historical_quantity AS (
        SELECT
          product_id,
          COALESCE(SUM(quantity), 0) as net_quantity
        FROM inventory_movements
        WHERE organization_id = ${organizationId}
          AND created_at < ${previousPeriodEndDate}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
        GROUP BY product_id
      ),
      historical_cost AS (
        SELECT
          product_id,
          CASE
            WHEN SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN quantity ELSE 0 END) > 0
            THEN SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN unit_cost * quantity ELSE 0 END) / 
                 SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN quantity ELSE 0 END)
            ELSE NULL
          END as avg_unit_cost
        FROM inventory_movements
        WHERE organization_id = ${organizationId}
          AND quantity > 0
          AND unit_cost IS NOT NULL
          AND unit_cost > 0
          AND created_at < ${previousPeriodEndDate}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
        GROUP BY product_id
      ),
      current_inventory_cost AS (
        SELECT
          product_id,
          CASE
            WHEN SUM(quantity_on_hand) > 0
            THEN SUM(total_value) / SUM(quantity_on_hand)
            ELSE NULL
          END as current_avg_cost
        FROM inventory
        WHERE organization_id = ${organizationId}
        GROUP BY product_id
      ),
      product_inventory_prev AS (
        SELECT
          COALESCE(hq.product_id, hc.product_id, cic.product_id) as product_id,
          CASE
            WHEN COALESCE(hq.net_quantity, 0) <= 0 THEN 0
            WHEN COALESCE(hc.avg_unit_cost, 0) > 0 THEN COALESCE(hq.net_quantity, 0) * hc.avg_unit_cost
            WHEN COALESCE(cic.current_avg_cost, 0) > 0 THEN COALESCE(hq.net_quantity, 0) * cic.current_avg_cost
            ELSE 0
          END as inventory_value
        FROM historical_quantity hq
        FULL OUTER JOIN historical_cost hc ON hq.product_id = hc.product_id
        FULL OUTER JOIN current_inventory_cost cic ON COALESCE(hq.product_id, hc.product_id) = cic.product_id
      )
      SELECT
        p.id as product_id,
        CASE
          WHEN COALESCE(pi.inventory_value, 0) > 0
          THEN ((COALESCE(pc.period_cogs, 0) / ${previousPeriodDays}) * 365) / pi.inventory_value
          ELSE 0
        END::numeric as turnover_rate
      FROM products p
      LEFT JOIN product_inventory_prev pi ON p.id = pi.product_id
      LEFT JOIN product_cogs_prev pc ON p.id = pc.product_id
      WHERE p.organization_id = ${organizationId}
        AND p.deleted_at IS NULL
        ${productId ? sql`AND p.id = ${productId}` : sql``}
    `
  );

  const previousTurnoverMap = new Map<string, number>();
  for (const item of previousTurnoverByProduct as unknown as Array<{ product_id: string; turnover_rate: number }>) {
    previousTurnoverMap.set(item.product_id, Number(item.turnover_rate ?? 0));
  }

  const trendPeriods: Array<{ period: string; turnoverRate: number; daysOnHand: number }> = [];
  const trendInterval = periodDays === 30 ? 7 : periodDays === 90 ? 30 : 90;

  for (let i = 3; i >= 0; i--) {
    const trendWindowStartDaysAgo = (i + 1) * trendInterval;
    const trendWindowEndDaysAgo = i * trendInterval;
    const trendWindowStartDate = sql`NOW() - INTERVAL '1 day' * ${trendWindowStartDaysAgo}`;
    const trendWindowEndDate = sql`NOW() - INTERVAL '1 day' * ${trendWindowEndDaysAgo}`;

    const trendCogsResult = await db.execute<{ cogs: number }>(
      sql`
        SELECT COALESCE(SUM(ABS(total_cost)), 0)::numeric as cogs
        FROM inventory_movements
        WHERE organization_id = ${organizationId}
          AND movement_type IN ('pick', 'ship')
          AND quantity < 0
          AND created_at >= ${trendWindowStartDate}
          AND created_at < ${trendWindowEndDate}
          ${productId ? sql`AND product_id = ${productId}` : sql``}
      `
    );

    const trendCogsNum = Number((trendCogsResult as unknown as { cogs: number }[])[0]?.cogs ?? 0);
    const trendAnnualizedCOGS = (trendCogsNum / trendInterval) * 365;
    const trendTurnoverRate = avgInventory > 0 ? trendAnnualizedCOGS / avgInventory : 0;
    const trendDaysOnHand = trendTurnoverRate > 0 ? 365 / trendTurnoverRate : 0;

    trendPeriods.push({
      period: i === 0 ? 'Current' : `Period ${4 - i}`,
      turnoverRate: Math.round(trendTurnoverRate * 100) / 100,
      daysOnHand: Math.round(trendDaysOnHand),
    });
  }

  return {
    turnover: {
      period,
      periodDays,
      cogsForPeriod: cogs,
      averageInventoryValue: avgInventory,
      annualizedCOGS,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      daysOnHand: Math.round(daysOnHand),
    },
    byProduct: (
      turnoverByProduct as unknown as Array<{
        product_id: string;
        product_sku: string;
        product_name: string;
        inventory_value: number;
        period_cogs: number;
        turnover_rate: number;
      }>
    ).map((p) => {
      const inventoryValue = Number(p.inventory_value ?? 0);
      const periodCOGS = Number(p.period_cogs ?? 0);
      const turnoverRate = Number(p.turnover_rate ?? 0);
      const previousTurnoverRate = previousTurnoverMap.get(p.product_id ?? '') ?? 0;
      const trendPercentage =
        previousTurnoverRate === 0
          ? 0
          : ((turnoverRate - previousTurnoverRate) / previousTurnoverRate) * 100;

      const TREND_THRESHOLD = 5;
      let trend: 'up' | 'down' | 'stable';
      if (Math.abs(trendPercentage) < TREND_THRESHOLD) {
        trend = 'stable';
      } else if (trendPercentage > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      return {
        productId: p.product_id ?? '',
        productSku: p.product_sku ?? '',
        productName: p.product_name ?? 'Unknown Product',
        inventoryValue: isNaN(inventoryValue) ? 0 : inventoryValue,
        periodCOGS: isNaN(periodCOGS) ? 0 : periodCOGS,
        turnoverRate: isNaN(turnoverRate) ? 0 : turnoverRate,
        trend,
        trendPercentage: Math.round(trendPercentage * 100) / 100,
      };
    }),
    trends: trendPeriods,
    benchmarks: {
      excellent: 12,
      good: 6,
      average: 3,
      poor: 1,
    },
  };
}
