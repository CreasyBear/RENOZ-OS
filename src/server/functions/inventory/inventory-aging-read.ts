import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  inventory,
  inventoryCostLayers,
  products,
  warehouseLocations as locations,
} from 'drizzle/schema';
import { formatAmount } from '@/lib/currency';
import type { AggregatedAgingItem, InventoryAgingQuery } from '@/lib/schemas/inventory';

interface ReadInventoryAgingInput extends InventoryAgingQuery {
  organizationId: string;
}

function agingInventoryProductJoinCondition(organizationId: string) {
  return and(
    eq(inventory.productId, products.id),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}

function generateAgingRecommendations(
  bucketData: Array<{ bucket: string; totalValue: number; totalQuantity: number }>
) {
  const recommendations: Array<{ type: string; message: string; priority: string }> = [];

  const oldBuckets = bucketData.filter((b) => b.bucket.includes('>') || b.bucket.includes('365'));
  const oldValue = oldBuckets.reduce((sum, b) => sum + b.totalValue, 0);

  if (oldValue > 0) {
    recommendations.push({
      type: 'slow_moving',
      message: `${formatAmount({ currency: 'AUD', amount: oldValue })} in inventory over 1 year old - consider markdown or disposal`,
      priority: 'high',
    });
  }

  const totalValue = bucketData.reduce((sum, b) => sum + b.totalValue, 0);
  const newestBucket = bucketData[0];
  if (newestBucket && totalValue > 0) {
    const newestPercent = (newestBucket.totalValue / totalValue) * 100;
    if (newestPercent < 30) {
      recommendations.push({
        type: 'turn_rate',
        message: `Only ${newestPercent.toFixed(0)}% of inventory is recent - review purchasing patterns`,
        priority: 'medium',
      });
    }
  }

  return recommendations;
}

export async function readInventoryAging({
  organizationId,
  locationId,
  ageBuckets,
}: ReadInventoryAgingInput) {
  const buckets = [...ageBuckets].sort((a, b) => a - b);
  const bucketLabels = [
    `0-${buckets[0]} days`,
    ...buckets.slice(0, -1).map((b, i) => `${b + 1}-${buckets[i + 1]} days`),
    `>${buckets[buckets.length - 1]} days`,
  ];

  const aging = await db
    .select({
      inventoryId: inventoryCostLayers.inventoryId,
      productId: inventory.productId,
      productSku: products.sku,
      productName: products.name,
      locationId: inventory.locationId,
      locationName: locations.name,
      layerId: inventoryCostLayers.id,
      receivedAt: inventoryCostLayers.receivedAt,
      quantityRemaining: inventoryCostLayers.quantityRemaining,
      unitCost: inventoryCostLayers.unitCost,
      ageInDays: sql<number>`EXTRACT(DAY FROM NOW() - ${inventoryCostLayers.receivedAt})::int`,
    })
    .from(inventoryCostLayers)
    .innerJoin(
      inventory,
      and(
        eq(inventoryCostLayers.inventoryId, inventory.id),
        eq(inventory.organizationId, organizationId)
      )
    )
    .leftJoin(products, agingInventoryProductJoinCondition(organizationId))
    .leftJoin(
      locations,
      and(
        eq(inventory.locationId, locations.id),
        eq(locations.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(inventoryCostLayers.organizationId, organizationId),
        gt(inventoryCostLayers.quantityRemaining, 0),
        locationId ? eq(inventory.locationId, locationId) : sql`true`
      )
    )
    .orderBy(asc(inventoryCostLayers.receivedAt));

  const totalValue = aging.reduce(
    (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
    0
  );

  const bucketData = bucketLabels.map((label, index) => {
    const minDays = index === 0 ? 0 : buckets[index - 1] + 1;
    const maxDays = index < buckets.length ? buckets[index] : Infinity;

    const itemsInBucket = aging.filter(
      (item) => item.ageInDays >= minDays && item.ageInDays <= maxDays
    );

    const totalQuantity = itemsInBucket.reduce((sum, item) => sum + item.quantityRemaining, 0);
    const bucketValue = itemsInBucket.reduce(
      (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
      0
    );

    const risk =
      maxDays === Infinity || maxDays >= 365
        ? 'critical'
        : maxDays >= 180
          ? 'high'
          : maxDays >= 90
            ? 'medium'
            : 'low';

    const aggregatedMap = new Map<string, AggregatedAgingItem>();

    itemsInBucket.forEach((item) => {
      const key = `${item.productId}-${item.locationId}`;
      const quantity = item.quantityRemaining;
      const unitCost = Number(item.unitCost);
      const itemValue = quantity * unitCost;
      const itemAge = item.ageInDays;
      const itemRisk: 'low' | 'medium' | 'high' | 'critical' =
        itemAge >= 365 ? 'critical' : itemAge >= 180 ? 'high' : itemAge >= 90 ? 'medium' : 'low';

      const existing = aggregatedMap.get(key);
      if (existing) {
        existing.totalQuantity += quantity;
        existing.totalValue += itemValue;
        existing.weightedAverageCost =
          existing.totalQuantity > 0 ? existing.totalValue / existing.totalQuantity : 0;

        if (item.receivedAt < existing.oldestReceivedAt) {
          existing.oldestReceivedAt = item.receivedAt;
          existing.ageInDays = itemAge;
        }

        const riskLevels: Record<'low' | 'medium' | 'high' | 'critical', number> = {
          low: 0,
          medium: 1,
          high: 2,
          critical: 3,
        };
        if (riskLevels[itemRisk] > riskLevels[existing.highestRisk]) {
          existing.highestRisk = itemRisk;
        }
      } else {
        aggregatedMap.set(key, {
          productId: item.productId,
          productSku: item.productSku ?? '',
          productName: item.productName ?? 'Unknown Product',
          locationId: item.locationId,
          locationName: item.locationName ?? 'Unknown',
          totalQuantity: quantity,
          totalValue: itemValue,
          weightedAverageCost: unitCost,
          oldestReceivedAt: item.receivedAt,
          highestRisk: itemRisk,
          ageInDays: itemAge,
        });
      }
    });

    const aggregatedItems = Array.from(aggregatedMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((agg) => ({
        inventoryId: '',
        productId: agg.productId,
        productSku: agg.productSku,
        productName: agg.productName,
        locationId: agg.locationId,
        locationName: agg.locationName,
        layerId: '',
        receivedAt: agg.oldestReceivedAt,
        quantity: agg.totalQuantity,
        unitCost: agg.weightedAverageCost,
        totalValue: agg.totalValue,
        ageInDays: agg.ageInDays,
        risk: agg.highestRisk,
      }));

    return {
      bucket: label,
      minDays,
      maxDays: maxDays === Infinity ? null : maxDays,
      itemCount: aggregatedMap.size,
      totalQuantity,
      totalValue: bucketValue,
      percentOfTotal: totalValue > 0 ? (bucketValue / totalValue) * 100 : 0,
      risk,
      items: aggregatedItems,
    };
  });

  const totalQuantity = aging.reduce((sum, item) => sum + item.quantityRemaining, 0);
  const avgAge =
    aging.length > 0 && totalQuantity > 0
      ? aging.reduce((sum, item) => sum + item.ageInDays * item.quantityRemaining, 0) /
        totalQuantity
      : 0;

  const valueAtRisk = bucketData
    .filter((b) => b.minDays >= 180)
    .reduce((sum, b) => sum + b.totalValue, 0);
  const riskPercentage = totalValue > 0 ? (valueAtRisk / totalValue) * 100 : 0;

  const uniqueProductLocations = new Set<string>();
  bucketData.forEach((bucket) => {
    bucket.items.forEach((item) => {
      uniqueProductLocations.add(`${item.productId}-${item.locationId}`);
    });
  });

  return {
    aging: bucketData,
    summary: {
      totalItems: uniqueProductLocations.size,
      totalQuantity,
      totalValue,
      averageAge: Math.round(avgAge),
      valueAtRisk,
      riskPercentage,
      oldestItem: aging.length > 0 ? aging[0] : null,
    },
    recommendations: generateAgingRecommendations(bucketData),
  };
}
