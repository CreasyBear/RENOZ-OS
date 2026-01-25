/**
 * Demand Forecasting Server Functions
 *
 * Demand forecasting, safety stock calculations, and reorder optimization.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, asc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { inventoryForecasts, inventory, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/constants';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createForecastSchema, forecastListQuerySchema } from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

type ForecastRecord = typeof inventoryForecasts.$inferSelect;

// Period schema (not exported from inventory.ts yet)
const forecastPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly']);

interface ReorderRecommendation {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  daysUntilStockout: number | null;
}

interface ListForecastsResult {
  forecasts: ForecastRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// FORECASTS CRUD
// ============================================================================

/**
 * List forecasts with filtering.
 */
export const listForecasts = createServerFn({ method: 'GET' })
  .inputValidator(forecastListQuerySchema)
  .handler(async ({ data }): Promise<ListForecastsResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    const conditions = [eq(inventoryForecasts.organizationId, ctx.organizationId)];

    if (filters.productId) {
      conditions.push(eq(inventoryForecasts.productId, filters.productId));
    }
    if (filters.forecastPeriod) {
      conditions.push(eq(inventoryForecasts.forecastPeriod, filters.forecastPeriod));
    }
    if (filters.dateFrom) {
      conditions.push(
        gte(inventoryForecasts.forecastDate, filters.dateFrom.toISOString().split('T')[0])
      );
    }
    if (filters.dateTo) {
      conditions.push(
        lte(inventoryForecasts.forecastDate, filters.dateTo.toISOString().split('T')[0])
      );
    }

    const offset = (page - 1) * limit;
    const whereClause = and(...conditions);

    // Run count and paginated results in parallel to eliminate waterfall
    const [countResult, forecasts] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryForecasts)
        .where(whereClause),
      db
        .select()
        .from(inventoryForecasts)
        .where(whereClause)
        .orderBy(asc(inventoryForecasts.forecastDate))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      forecasts,
      total,
      page,
      limit,
      hasMore: offset + forecasts.length < total,
    };
  });

/**
 * Get forecast for a specific product.
 */
export const getProductForecast = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      period: forecastPeriodSchema.default('monthly'),
      days: z.coerce.number().int().min(7).max(365).default(90),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify product exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Get existing forecasts
    const forecasts = await db
      .select()
      .from(inventoryForecasts)
      .where(
        and(
          eq(inventoryForecasts.organizationId, ctx.organizationId),
          eq(inventoryForecasts.productId, data.productId),
          eq(
            inventoryForecasts.forecastPeriod,
            data.period as 'daily' | 'weekly' | 'monthly' | 'quarterly'
          ),
          gte(inventoryForecasts.forecastDate, new Date().toISOString().split('T')[0])
        )
      )
      .orderBy(asc(inventoryForecasts.forecastDate))
      .limit(
        Math.ceil(data.days / (data.period === 'daily' ? 1 : data.period === 'weekly' ? 7 : 30))
      );

    // Get current inventory
    const [currentStock] = await db
      .select({
        totalOnHand: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        totalAvailable: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::int`,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.organizationId, ctx.organizationId),
          eq(inventory.productId, data.productId)
        )
      );

    // Get historical demand
    const historicalDemand = await getHistoricalDemand(ctx.organizationId, data.productId, 90);

    // Get latest forecast with safety stock info
    const latestForecast = forecasts[0];

    return {
      product,
      forecasts,
      currentStock: {
        onHand: currentStock?.totalOnHand ?? 0,
        available: currentStock?.totalAvailable ?? 0,
      },
      historicalDemand,
      safetyStock: latestForecast?.safetyStockLevel ?? 0,
      reorderPoint: latestForecast?.reorderPoint ?? 0,
      recommendedOrderQuantity: latestForecast?.recommendedOrderQuantity ?? 0,
    };
  });

/**
 * Create or update forecast.
 */
export const upsertForecast = createServerFn({ method: 'POST' })
  .inputValidator(createForecastSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.FORECAST });

    // Verify product exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Check for existing forecast
    const dateStr = data.forecastDate.toISOString().split('T')[0];
    const [existing] = await db
      .select()
      .from(inventoryForecasts)
      .where(
        and(
          eq(inventoryForecasts.organizationId, ctx.organizationId),
          eq(inventoryForecasts.productId, data.productId),
          eq(inventoryForecasts.forecastDate, dateStr),
          eq(inventoryForecasts.forecastPeriod, data.forecastPeriod)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [forecast] = await db
        .update(inventoryForecasts)
        .set({
          demandQuantity: String(data.demandQuantity),
          forecastAccuracy: data.forecastAccuracy ? String(data.forecastAccuracy) : null,
          confidenceLevel: data.confidenceLevel ? String(data.confidenceLevel) : null,
          safetyStockLevel: data.safetyStockLevel,
          reorderPoint: data.reorderPoint,
          recommendedOrderQuantity: data.recommendedOrderQuantity,
          calculatedAt: new Date(),
        })
        .where(eq(inventoryForecasts.id, existing.id))
        .returning();

      return { forecast, created: false };
    }

    // Create new
    const [forecast] = await db
      .insert(inventoryForecasts)
      .values({
        organizationId: ctx.organizationId,
        productId: data.productId,
        forecastDate: dateStr,
        forecastPeriod: data.forecastPeriod,
        demandQuantity: String(data.demandQuantity),
        forecastAccuracy: data.forecastAccuracy ? String(data.forecastAccuracy) : null,
        confidenceLevel: data.confidenceLevel ? String(data.confidenceLevel) : null,
        safetyStockLevel: data.safetyStockLevel,
        reorderPoint: data.reorderPoint,
        recommendedOrderQuantity: data.recommendedOrderQuantity,
      })
      .returning();

    return { forecast, created: true };
  });

/**
 * Bulk update forecasts.
 * Uses PostgreSQL upsert (ON CONFLICT DO UPDATE) to avoid N+1 queries.
 */
export const bulkUpdateForecasts = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      forecasts: z.array(createForecastSchema).min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.INVENTORY.FORECAST });

    // Build all values upfront
    const forecastValues = data.forecasts.map((forecastData) => ({
      organizationId: ctx.organizationId,
      productId: forecastData.productId,
      forecastDate: forecastData.forecastDate.toISOString().split('T')[0],
      forecastPeriod: forecastData.forecastPeriod,
      demandQuantity: String(forecastData.demandQuantity),
      forecastAccuracy: forecastData.forecastAccuracy
        ? String(forecastData.forecastAccuracy)
        : null,
      confidenceLevel: forecastData.confidenceLevel
        ? String(forecastData.confidenceLevel)
        : null,
      safetyStockLevel: forecastData.safetyStockLevel,
      reorderPoint: forecastData.reorderPoint,
      recommendedOrderQuantity: forecastData.recommendedOrderQuantity,
    }));

    // Single upsert using ON CONFLICT DO UPDATE
    // The unique constraint is on (organizationId, productId, forecastDate, forecastPeriod)
    const upsertedForecasts = await db
      .insert(inventoryForecasts)
      .values(forecastValues)
      .onConflictDoUpdate({
        target: [
          inventoryForecasts.organizationId,
          inventoryForecasts.productId,
          inventoryForecasts.forecastDate,
          inventoryForecasts.forecastPeriod,
        ],
        set: {
          demandQuantity: sql`excluded.demand_quantity`,
          forecastAccuracy: sql`excluded.forecast_accuracy`,
          confidenceLevel: sql`excluded.confidence_level`,
          safetyStockLevel: sql`excluded.safety_stock_level`,
          reorderPoint: sql`excluded.reorder_point`,
          recommendedOrderQuantity: sql`excluded.recommended_order_quantity`,
          calculatedAt: new Date(),
        },
      })
      .returning();

    // Build composite keys to check which were created vs updated
    // by querying createdAt vs calculatedAt
    const results = upsertedForecasts.map((forecast) => {
      // If createdAt is very close to now (within 1 second), it was created
      const createdAtTime = new Date(forecast.createdAt).getTime();
      const now = Date.now();
      const isNew = now - createdAtTime < 1000;
      return { forecast, created: isNew };
    });

    return {
      results,
      createdCount: results.filter((r) => r.created).length,
      updatedCount: results.filter((r) => !r.created).length,
    };
  });

// ============================================================================
// SAFETY STOCK CALCULATIONS
// ============================================================================

/**
 * Calculate safety stock for a product.
 */
export const calculateSafetyStock = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      serviceLevel: z.coerce.number().min(0.5).max(0.999).default(0.95),
      leadTimeDays: z.coerce.number().int().min(1).max(365).default(7),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify product exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Get historical demand data
    const historicalDemand = await getHistoricalDemand(ctx.organizationId, data.productId, 365);

    if (historicalDemand.dailyDemand.length < 30) {
      throw new ValidationError('Insufficient historical data for safety stock calculation', {
        productId: ['Need at least 30 days of demand history'],
      });
    }

    // Calculate standard deviation of daily demand
    const demandValues = historicalDemand.dailyDemand.map((d) => d.quantity);
    const avgDemand = demandValues.reduce((a, b) => a + b, 0) / demandValues.length;
    const variance =
      demandValues.reduce((sum, val) => sum + Math.pow(val - avgDemand, 2), 0) /
      demandValues.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for service level
    const zScore = getZScore(data.serviceLevel);

    // Safety stock formula: Z * σ * √L
    // Where Z = z-score, σ = std dev of demand, L = lead time
    const safetyStock = Math.ceil(zScore * stdDev * Math.sqrt(data.leadTimeDays));

    // Reorder point: (Average daily demand × Lead time) + Safety stock
    const reorderPoint = Math.ceil(avgDemand * data.leadTimeDays + safetyStock);

    // Economic Order Quantity (EOQ) - simplified
    // Assuming holding cost = 25% of unit cost per year, ordering cost = $50
    const annualDemand = avgDemand * 365;
    const orderingCost = 50;
    const holdingCostPercent = 0.25;
    const unitCost = Number(product.costPrice ?? product.basePrice ?? 10);
    const holdingCost = unitCost * holdingCostPercent;
    const eoq =
      holdingCost > 0
        ? Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost))
        : Math.ceil(avgDemand * 30);

    return {
      product,
      calculations: {
        serviceLevel: data.serviceLevel,
        leadTimeDays: data.leadTimeDays,
        zScore,
        averageDailyDemand: Math.round(avgDemand * 100) / 100,
        demandStdDev: Math.round(stdDev * 100) / 100,
        safetyStock,
        reorderPoint,
        recommendedOrderQuantity: eoq,
      },
      historical: {
        daysAnalyzed: historicalDemand.dailyDemand.length,
        totalDemand: historicalDemand.totalDemand,
        peakDemand: Math.max(...demandValues),
        minDemand: Math.min(...demandValues),
      },
    };
  });

/**
 * Get reorder recommendations for all products.
 */
export const getReorderRecommendations = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      urgencyFilter: z.enum(['all', 'critical', 'high']).default('all'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get products with forecasts and current stock
    const productsWithData = await db
      .select({
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        currentStock: sql<number>`COALESCE((
          SELECT SUM(quantity_on_hand) FROM inventory
          WHERE product_id = ${products.id}
          AND organization_id = ${ctx.organizationId}
        ), 0)::int`,
        reorderPoint: sql<number>`COALESCE((
          SELECT reorder_point FROM inventory_forecasts
          WHERE product_id = ${products.id}
          AND organization_id = ${ctx.organizationId}
          ORDER BY forecast_date DESC
          LIMIT 1
        ), 0)::int`,
        safetyStock: sql<number>`COALESCE((
          SELECT safety_stock_level FROM inventory_forecasts
          WHERE product_id = ${products.id}
          AND organization_id = ${ctx.organizationId}
          ORDER BY forecast_date DESC
          LIMIT 1
        ), 0)::int`,
        recommendedQuantity: sql<number>`COALESCE((
          SELECT recommended_order_quantity FROM inventory_forecasts
          WHERE product_id = ${products.id}
          AND organization_id = ${ctx.organizationId}
          ORDER BY forecast_date DESC
          LIMIT 1
        ), 0)::int`,
        avgDailyDemand: sql<number>`COALESCE((
          SELECT demand_quantity FROM inventory_forecasts
          WHERE product_id = ${products.id}
          AND organization_id = ${ctx.organizationId}
          AND forecast_period = 'daily'
          ORDER BY forecast_date DESC
          LIMIT 1
        ), 0)::numeric`,
      })
      .from(products)
      .where(and(eq(products.organizationId, ctx.organizationId), eq(products.isActive, true)));

    // Calculate recommendations
    const recommendations: ReorderRecommendation[] = productsWithData
      .map((p) => {
        const stockAboveReorder = p.currentStock - p.reorderPoint;
        const daysUntilStockout =
          Number(p.avgDailyDemand) > 0
            ? Math.floor(p.currentStock / Number(p.avgDailyDemand))
            : null;

        let urgency: 'critical' | 'high' | 'medium' | 'low';
        if (p.currentStock <= 0) {
          urgency = 'critical';
        } else if (p.currentStock <= p.safetyStock) {
          urgency = 'critical';
        } else if (p.currentStock <= p.reorderPoint) {
          urgency = 'high';
        } else if (stockAboveReorder <= p.safetyStock) {
          urgency = 'medium';
        } else {
          urgency = 'low';
        }

        return {
          productId: p.productId,
          productSku: p.productSku,
          productName: p.productName,
          currentStock: p.currentStock,
          reorderPoint: p.reorderPoint,
          safetyStock: p.safetyStock,
          recommendedQuantity: p.recommendedQuantity || Math.ceil(p.reorderPoint * 1.5),
          urgency,
          daysUntilStockout,
        };
      })
      .filter((r) => {
        if (data.urgencyFilter === 'critical') return r.urgency === 'critical';
        if (data.urgencyFilter === 'high') return r.urgency === 'critical' || r.urgency === 'high';
        return r.currentStock <= r.reorderPoint || r.urgency !== 'low';
      })
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      })
      .slice(0, data.limit);

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter((r) => r.urgency === 'critical').length,
        highCount: recommendations.filter((r) => r.urgency === 'high').length,
        mediumCount: recommendations.filter((r) => r.urgency === 'medium').length,
      },
    };
  });

// ============================================================================
// FORECAST ACCURACY
// ============================================================================

/**
 * Get forecast accuracy metrics.
 */
export const getForecastAccuracy = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid().optional(),
      period: forecastPeriodSchema.default('monthly'),
      lookbackDays: z.coerce.number().int().min(30).max(365).default(90),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - data.lookbackDays);

    const conditions = [
      eq(inventoryForecasts.organizationId, ctx.organizationId),
      eq(
        inventoryForecasts.forecastPeriod,
        data.period as 'daily' | 'weekly' | 'monthly' | 'quarterly'
      ),
      lte(inventoryForecasts.forecastDate, new Date().toISOString().split('T')[0]),
      gte(inventoryForecasts.forecastDate, startDate.toISOString().split('T')[0]),
    ];

    if (data.productId) {
      conditions.push(eq(inventoryForecasts.productId, data.productId));
    }

    // Get forecasts with accuracy data
    const forecasts = await db
      .select({
        id: inventoryForecasts.id,
        productId: inventoryForecasts.productId,
        forecastDate: inventoryForecasts.forecastDate,
        demandQuantity: inventoryForecasts.demandQuantity,
        forecastAccuracy: inventoryForecasts.forecastAccuracy,
      })
      .from(inventoryForecasts)
      .where(and(...conditions))
      .orderBy(asc(inventoryForecasts.forecastDate));

    // Calculate accuracy metrics
    const withAccuracy = forecasts.filter((f) => f.forecastAccuracy !== null);
    const avgAccuracy =
      withAccuracy.length > 0
        ? withAccuracy.reduce((sum, f) => sum + Number(f.forecastAccuracy), 0) / withAccuracy.length
        : null;

    // Group by month for trend
    const monthlyTrend = forecasts.reduce(
      (acc, f) => {
        const month = f.forecastDate.substring(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, totalAccuracy: 0, withAccuracy: 0 };
        }
        acc[month].count++;
        if (f.forecastAccuracy !== null) {
          acc[month].totalAccuracy += Number(f.forecastAccuracy);
          acc[month].withAccuracy++;
        }
        return acc;
      },
      {} as Record<string, { count: number; totalAccuracy: number; withAccuracy: number }>
    );

    const trend = Object.entries(monthlyTrend)
      .map(([month, data]) => ({
        month,
        forecastCount: data.count,
        averageAccuracy: data.withAccuracy > 0 ? data.totalAccuracy / data.withAccuracy : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalForecasts: forecasts.length,
        forecastsWithAccuracy: withAccuracy.length,
        averageAccuracy: avgAccuracy ? Math.round(avgAccuracy * 100) / 100 : null,
        period: data.period,
        lookbackDays: data.lookbackDays,
      },
      trend,
      benchmarks: {
        excellent: 90,
        good: 80,
        acceptable: 70,
        needsImprovement: 60,
      },
    };
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getHistoricalDemand(organizationId: string, productId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily demand from outbound movements
  const dailyDemand = await db.execute<{ date: string; quantity: number }>(
    sql`
      SELECT
        DATE(created_at) as date,
        ABS(SUM(quantity)) as quantity
      FROM inventory_movements
      WHERE organization_id = ${organizationId}
        AND product_id = ${productId}
        AND movement_type IN ('pick', 'ship')
        AND quantity < 0
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `
  );

  const demandData = dailyDemand as unknown as { date: string; quantity: number }[];
  const totalDemand = demandData.reduce((sum, d) => sum + d.quantity, 0);

  return {
    dailyDemand: demandData,
    totalDemand,
    averageDailyDemand: demandData.length > 0 ? totalDemand / demandData.length : 0,
  };
}

function getZScore(serviceLevel: number): number {
  // Z-scores for common service levels
  const zScores: Record<string, number> = {
    '0.5': 0,
    '0.6': 0.25,
    '0.7': 0.52,
    '0.75': 0.67,
    '0.8': 0.84,
    '0.85': 1.04,
    '0.9': 1.28,
    '0.95': 1.64,
    '0.97': 1.88,
    '0.98': 2.05,
    '0.99': 2.33,
    '0.995': 2.58,
    '0.999': 3.09,
  };

  // Find closest match
  const key = String(Math.round(serviceLevel * 1000) / 1000);
  if (zScores[key]) return zScores[key];

  // Linear interpolation for values in between
  const keys = Object.keys(zScores)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (serviceLevel >= keys[i] && serviceLevel <= keys[i + 1]) {
      const ratio = (serviceLevel - keys[i]) / (keys[i + 1] - keys[i]);
      return (
        zScores[String(keys[i])] + ratio * (zScores[String(keys[i + 1])] - zScores[String(keys[i])])
      );
    }
  }

  return 1.64; // Default to 95% service level
}
