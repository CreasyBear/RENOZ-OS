import { createSerializedMutationError } from '@/lib/server/serialized-mutation-contract';

export interface ProductSerializationRequirement {
  id: string;
  isSerialized: boolean;
}

export function getUniqueReceiptProductIds(productIds: Array<string | null>): string[] {
  return Array.from(new Set(productIds.filter((id): id is string => id !== null)));
}

export function buildProductSerializationRequirementMap(
  productIds: string[],
  productRows: ProductSerializationRequirement[]
): Map<string, boolean> {
  const serializationMap = new Map(
    productRows.map((product) => [product.id, product.isSerialized])
  );
  const missingProductIds = productIds.filter(
    (productId) => !serializationMap.has(productId)
  );

  if (missingProductIds.length > 0) {
    throw createSerializedMutationError(
      'Product serialization requirements are unavailable for one or more purchase-order lines. Refresh product data before receiving goods.',
      'invalid_serial_state'
    );
  }

  return serializationMap;
}
