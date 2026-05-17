export const QUALITY_HISTORY_UNAVAILABLE_MESSAGE =
  'Quality inspection history is temporarily unavailable. Please refresh and try again.';

export const QUALITY_HISTORY_REFRESH_UNAVAILABLE_MESSAGE =
  'Refresh failed. The inspection history below may be stale until the next successful reload.';

export function getQualityHistoryReadErrorMessage(
  error: unknown,
  options: { hasCachedRecords?: boolean } = {}
): string | null {
  if (!error) return null;
  return options.hasCachedRecords
    ? QUALITY_HISTORY_REFRESH_UNAVAILABLE_MESSAGE
    : QUALITY_HISTORY_UNAVAILABLE_MESSAGE;
}
