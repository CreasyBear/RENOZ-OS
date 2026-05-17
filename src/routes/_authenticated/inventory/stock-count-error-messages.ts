export const STOCK_COUNTS_UNAVAILABLE_MESSAGE =
  'Stock counts are temporarily unavailable. Please refresh and try again.';

export const STOCK_COUNTS_REFRESH_UNAVAILABLE_MESSAGE =
  'Refresh failed. The list below may be stale until the next successful reload.';

export function getStockCountsReadErrorMessage(
  error: unknown,
  options: { hasCachedCounts?: boolean } = {}
): string | null {
  if (!error) return null;
  return options.hasCachedCounts
    ? STOCK_COUNTS_REFRESH_UNAVAILABLE_MESSAGE
    : STOCK_COUNTS_UNAVAILABLE_MESSAGE;
}
