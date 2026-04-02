export function hasMetricValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export const METRIC_UNAVAILABLE_VALUE = '—'

export function getMetricValueOrUnavailable<T>(
  value: T | null | undefined,
  unavailableValue: string = METRIC_UNAVAILABLE_VALUE
): T | string {
  return hasMetricValue(value) ? value : unavailableValue
}

export function getSummaryMetricSubtitle(input: {
  summaryState: 'loading' | 'ready' | 'unavailable'
  readySubtitle?: string
  unavailableSubtitle?: string
}): string | undefined {
  if (input.summaryState === 'unavailable') {
    return input.unavailableSubtitle ?? 'Summary unavailable'
  }

  return input.readySubtitle
}
