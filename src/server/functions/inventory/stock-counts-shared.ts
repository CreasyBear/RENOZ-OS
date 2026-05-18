import { and, eq, isNull } from 'drizzle-orm';
import { inventory, products } from 'drizzle/schema';

export function stockCountProductJoinCondition(organizationId: string) {
  return and(
    eq(inventory.productId, products.id),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}
