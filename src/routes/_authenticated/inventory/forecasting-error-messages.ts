export const REORDER_RECOMMENDATIONS_UNAVAILABLE_MESSAGE =
  'Reorder recommendations are temporarily unavailable. Please refresh and try again.';
export const FORECAST_DETAILS_UNAVAILABLE_MESSAGE =
  'Demand forecast details are temporarily unavailable. Please refresh and try again.';

export function getReorderRecommendationsReadErrorMessage(error: unknown): string | undefined {
  return error ? REORDER_RECOMMENDATIONS_UNAVAILABLE_MESSAGE : undefined;
}

export function getForecastDetailsReadErrorMessage(error: unknown): string | undefined {
  return error ? FORECAST_DETAILS_UNAVAILABLE_MESSAGE : undefined;
}
