export function calculateEffectiveSupplierPrice(params: {
  basePrice: number;
  discountType?: string | null;
  discountValue?: number | null;
}): number {
  const basePrice = Number(params.basePrice);
  const discountValue = Number(params.discountValue ?? 0);

  if (params.discountType === "percentage") {
    return Math.max(0, basePrice * (1 - discountValue / 100));
  }

  if (params.discountType === "fixed") {
    return Math.max(0, basePrice - discountValue);
  }

  return basePrice;
}
