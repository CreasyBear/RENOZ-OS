export interface ProcurementProductState {
  status?: string | null;
  isActive?: boolean | null;
  isPurchasable?: boolean | null;
}

export const PROCUREMENT_PRODUCT_UNAVAILABLE_MESSAGE =
  'Product details are unavailable. Refresh product data before creating a purchase order.';

export const PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE =
  'This product is inactive, discontinued, or not purchasable. Update product settings before creating a purchase order.';

export function getProcurementProductBlockMessage(
  product: ProcurementProductState | null | undefined
): string | null {
  if (!product) {
    return PROCUREMENT_PRODUCT_UNAVAILABLE_MESSAGE;
  }

  if (
    product.status !== 'active' ||
    product.isActive !== true ||
    product.isPurchasable !== true
  ) {
    return PROCUREMENT_PRODUCT_NOT_PURCHASABLE_MESSAGE;
  }

  return null;
}
