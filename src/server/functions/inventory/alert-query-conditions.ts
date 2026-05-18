import { and, eq, isNull } from 'drizzle-orm';
import { inventory, products, warehouseLocations } from 'drizzle/schema';

export function alertProductWhereCondition(productId: string, organizationId: string) {
  return and(
    eq(products.id, productId),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}

export function alertLocationWhereCondition(locationId: string, organizationId: string) {
  return and(
    eq(warehouseLocations.id, locationId),
    eq(warehouseLocations.organizationId, organizationId)
  );
}

export function alertInventoryProductJoinCondition(organizationId: string) {
  return and(
    eq(inventory.productId, products.id),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}
