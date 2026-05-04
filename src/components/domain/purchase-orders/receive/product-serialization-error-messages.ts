import type { ProductSerializationError } from '@/hooks/purchase-orders/use-product-serialization';

export const PRODUCT_SERIALIZATION_ERROR_TITLE =
  'Product serialization requirements could not be loaded';

export const PRODUCT_SERIALIZATION_FALLBACK_MESSAGE =
  'Product serialization requirements are temporarily unavailable. Please refresh and try again.';

export function getSerializationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function buildProductSerializationErrorMessages(
  errors: ProductSerializationError[],
  productLabels: Map<string, string>
) {
  return errors.map((errorItem) => {
    const productLabel = productLabels.get(errorItem.productId) ?? errorItem.productId;
    return `${productLabel}: ${getSerializationErrorMessage(
      errorItem.error,
      PRODUCT_SERIALIZATION_FALLBACK_MESSAGE
    )}`;
  });
}
