import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  categories,
  inventory,
  inventoryCostLayers,
  products,
  warehouseLocations as locations,
} from 'drizzle/schema';
import type {
  InventoryValuationQuery,
  InventoryValuationResult,
} from '@/lib/schemas/inventory';
import { getFinanceIntegritySummary } from './finance-integrity-summary';

interface ReadInventoryValuationInput extends InventoryValuationQuery {
  organizationId: string;
}

function valuationInventoryProductJoinCondition(organizationId: string) {
  return and(
    eq(inventory.productId, products.id),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}

export async function readInventoryValuation({
  organizationId,
  locationId,
  productId,
  valuationMethod,
}: ReadInventoryValuationInput): Promise<InventoryValuationResult> {
  const invConditions = [eq(inventory.organizationId, organizationId)];

  if (locationId) {
    invConditions.push(eq(inventory.locationId, locationId));
  }
  if (productId) {
    invConditions.push(eq(inventory.productId, productId));
  }

  const [totals] = await db
    .select({
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      totalSkus: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
      totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::numeric`,
    })
    .from(inventory)
    .where(and(...invConditions));

  const byCategory = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::numeric`,
      skuCount: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
    })
    .from(inventory)
    .leftJoin(products, valuationInventoryProductJoinCondition(organizationId))
    .leftJoin(
      categories,
      and(eq(products.categoryId, categories.id), eq(categories.organizationId, organizationId))
    )
    .where(and(...invConditions))
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sql`SUM(${inventory.totalValue})`));

  const byLocation = await db
    .select({
      locationId: locations.id,
      locationCode: locations.locationCode,
      locationName: locations.name,
      itemCount: sql<number>`COUNT(DISTINCT ${inventory.id})::int`,
      totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      capacity: locations.capacity,
    })
    .from(inventory)
    .innerJoin(
      locations,
      and(eq(inventory.locationId, locations.id), eq(locations.organizationId, organizationId))
    )
    .where(and(...invConditions))
    .groupBy(locations.id, locations.locationCode, locations.name, locations.capacity)
    .orderBy(desc(sql`SUM(${inventory.totalValue})`));

  const costLayerCounts = db
    .select({
      productId: inventory.productId,
      costLayerCount: sql<number>`COUNT(DISTINCT ${inventoryCostLayers.id})::int`,
    })
    .from(inventoryCostLayers)
    .innerJoin(
      inventory,
      and(
        eq(inventoryCostLayers.inventoryId, inventory.id),
        eq(inventory.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(inventoryCostLayers.organizationId, organizationId),
        eq(inventory.organizationId, organizationId),
        gt(inventoryCostLayers.quantityRemaining, 0),
        locationId ? eq(inventory.locationId, locationId) : sql`true`
      )
    )
    .groupBy(inventory.productId)
    .as('cost_layer_counts');

  const byProduct = await db
    .select({
      productId: inventory.productId,
      productSku: sql<string>`COALESCE(${products.sku}, '')`,
      productName: sql<string>`COALESCE(${products.name}, 'Unknown Product')`,
      totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      weightedAverageCost: sql<number>`
        CASE
          WHEN SUM(${inventory.quantityOnHand}) > 0
          THEN SUM(${inventory.totalValue}) / SUM(${inventory.quantityOnHand})
          ELSE 0
        END::numeric`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      costLayers: sql<number>`COALESCE(${costLayerCounts.costLayerCount}, 0)::int`,
    })
    .from(inventory)
    .leftJoin(products, valuationInventoryProductJoinCondition(organizationId))
    .leftJoin(costLayerCounts, eq(costLayerCounts.productId, inventory.productId))
    .where(and(...invConditions))
    .groupBy(inventory.productId, products.sku, products.name, costLayerCounts.costLayerCount)
    .orderBy(desc(sql`SUM(${inventory.totalValue})`))
    .limit(50);

  const totalValueNum = Number(totals?.totalValue ?? 0);
  const totalUnitsNum = Number(totals?.totalUnits ?? 0);
  const averageUnitCost = totalUnitsNum > 0 ? totalValueNum / totalUnitsNum : 0;

  const financeIntegrity = await getFinanceIntegritySummary(organizationId);

  return {
    totalValue: totalValueNum,
    totalSkus: totals?.totalSkus ?? 0,
    totalUnits: totalUnitsNum,
    averageUnitCost,
    byCategory: byCategory.map((category) => {
      const catValue = Number(category.totalValue);
      const catUnits = Number(category.totalUnits);
      return {
        categoryId: category.categoryId ?? '',
        categoryName: category.categoryName ?? 'Uncategorized',
        totalValue: catValue,
        totalUnits: catUnits,
        percentOfTotal: totalValueNum > 0 ? (catValue / totalValueNum) * 100 : 0,
        skuCount: category.skuCount ?? 0,
      };
    }),
    byLocation: byLocation.map((location) => {
      const locValue = Number(location.totalValue);
      const locQuantity = Number(location.totalQuantity);
      const capacity = location.capacity ? Number(location.capacity) : null;
      return {
        locationId: location.locationId,
        locationCode: location.locationCode,
        locationName: location.locationName,
        itemCount: location.itemCount,
        totalQuantity: locQuantity,
        totalValue: locValue,
        percentOfTotal: totalValueNum > 0 ? (locValue / totalValueNum) * 100 : 0,
        utilization: capacity && capacity > 0 ? (locQuantity / capacity) * 100 : 0,
      };
    }),
    byProduct: byProduct.map((product) => ({
      ...product,
      weightedAverageCost: Number(product.weightedAverageCost),
      totalValue: Number(product.totalValue),
    })),
    valuationMethod,
    asOf: new Date().toISOString(),
    financeIntegrity,
  };
}
