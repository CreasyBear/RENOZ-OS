import { GST_RATE, roundCurrency } from '@/lib/order-calculations';

/**
 * Calculate line item totals including tax.
 * Uses roundCurrency for DB CHECK constraint compatibility (avoids floating-point drift).
 */
export function calculateLineItemTotals(lineItem: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxType?: string;
}): { taxAmount: number; lineTotal: number } {
  const subtotal = roundCurrency(lineItem.quantity * lineItem.unitPrice);

  let discountedAmount = subtotal;
  if (lineItem.discountPercent) {
    discountedAmount = roundCurrency(
      discountedAmount - subtotal * (lineItem.discountPercent / 100)
    );
  }
  if (lineItem.discountAmount) {
    discountedAmount = roundCurrency(discountedAmount - lineItem.discountAmount);
  }
  discountedAmount = Math.max(0, discountedAmount);

  const isTaxFree = lineItem.taxType === 'gst_free' || lineItem.taxType === 'export';
  const taxAmount = isTaxFree ? 0 : roundCurrency(discountedAmount * GST_RATE);
  const lineTotal = roundCurrency(discountedAmount + taxAmount);

  return {
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculate order totals from line items.
 * Uses roundCurrency for DB CHECK constraint compatibility (avoids floating-point drift).
 */
export function calculateOrderTotals(
  lineItems: Array<{ lineTotal: number; taxAmount: number }>,
  discountPercent?: number | null,
  discountAmount?: number | null,
  shippingAmount: number = 0
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  const lineSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const lineTaxTotal = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);

  const subtotal = roundCurrency(lineSubtotal - lineTaxTotal);

  let discountAmt = 0;
  if (discountPercent) {
    discountAmt = subtotal * (discountPercent / 100);
  }
  if (discountAmount) {
    discountAmt += discountAmount;
  }
  discountAmt = roundCurrency(Math.min(discountAmt, subtotal));

  const taxableAmount = roundCurrency(subtotal - discountAmt + shippingAmount);
  const taxAmount = roundCurrency(taxableAmount * GST_RATE);

  const total = roundCurrency(subtotal - discountAmt + taxAmount + shippingAmount);

  return {
    subtotal,
    discountAmount: discountAmt,
    taxAmount,
    total,
  };
}
