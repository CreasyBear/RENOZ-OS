export interface SummaryHealthInput<T> {
  data: T | null | undefined
  error: unknown
  isLoading: boolean
}

export type SummaryState = 'loading' | 'ready' | 'unavailable'

export interface SummaryIntegrity<T> {
  summary: T | null
  summaryState: SummaryState
  summaryError: unknown
}

export interface MetricSurface<TSummary, TItems> extends SummaryIntegrity<TSummary> {
  items: TItems
}

export function getSummaryState<T>({
  data,
  error,
  isLoading,
}: SummaryHealthInput<T>): SummaryState {
  if (isLoading) {
    return 'loading'
  }

  if (data != null) {
    return 'ready'
  }

  if (error != null) {
    return 'unavailable'
  }

  return 'loading'
}

export function getSummaryIntegrity<T>(
  input: SummaryHealthInput<T>
): SummaryIntegrity<T> {
  return {
    summary: input.data ?? null,
    summaryState: getSummaryState(input),
    summaryError: input.error,
  }
}

export function createMetricSurface<TSummary, TItems>(input: {
  items: TItems
} & SummaryHealthInput<TSummary>): MetricSurface<TSummary, TItems> {
  const { items, ...summaryInput } = input

  return {
    items,
    ...getSummaryIntegrity(summaryInput),
  }
}

export function isSummaryReady<T>(input: SummaryHealthInput<T>): boolean {
  return getSummaryState(input) === 'ready'
}

export function hasSummaryIntegrityError<T>({
  data,
  error,
  isLoading,
}: SummaryHealthInput<T>): boolean {
  return getSummaryState({ data, error, isLoading }) === 'unavailable'
}
