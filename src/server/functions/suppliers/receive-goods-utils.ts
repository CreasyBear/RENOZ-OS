/**
 * Receive Goods Currency Conversion Utilities
 *
 * Converts PO item unit prices from PO currency to organization currency.
 *
 * @see receive-goods.ts
 */

/**
 * Convert unit price from PO currency to organization currency.
 * When currencies match, no conversion. Otherwise uses exchange rate (1 PO = X org).
 */
export function unitPriceToOrgCurrency(
  unitPriceInPoCurrency: number,
  poCurrency: string,
  orgCurrency: string,
  exchangeRate: number | null
): number {
  if (poCurrency === orgCurrency) return unitPriceInPoCurrency;
  return unitPriceInPoCurrency * (exchangeRate ?? 1);
}
