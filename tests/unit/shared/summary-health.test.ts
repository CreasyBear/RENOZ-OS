import { describe, expect, it } from 'vitest'
import {
  createMetricSurface,
  getSummaryIntegrity,
  getSummaryState,
  hasSummaryIntegrityError,
  isSummaryReady,
} from '@/lib/metrics/summary-health'

describe('summary-health', () => {
  it('classifies loading, ready, and unavailable summary states explicitly', () => {
    expect(
      getSummaryState({
        data: undefined,
        error: null,
        isLoading: true,
      })
    ).toBe('loading')

    expect(
      getSummaryState({
        data: { total: 1 },
        error: null,
        isLoading: false,
      })
    ).toBe('ready')

    expect(
      getSummaryState({
        data: null,
        error: new Error('boom'),
        isLoading: false,
      })
    ).toBe('unavailable')
  })

  it('flags summary failures only after loading completes and no summary data exists', () => {
    expect(
      hasSummaryIntegrityError({
        data: null,
        error: new Error('boom'),
        isLoading: false,
      })
    ).toBe(true)
  })

  it('does not flag healthy or still-loading summaries', () => {
    expect(
      hasSummaryIntegrityError({
        data: { total: 1 },
        error: null,
        isLoading: false,
      })
    ).toBe(false)

    expect(
      hasSummaryIntegrityError({
        data: undefined,
        error: new Error('boom'),
        isLoading: true,
      })
    ).toBe(false)
  })

  it('builds summary integrity and metric surface contracts for containers', () => {
    expect(
      getSummaryIntegrity({
        data: { total: 3 },
        error: null,
        isLoading: false,
      })
    ).toEqual({
      summary: { total: 3 },
      summaryState: 'ready',
      summaryError: null,
    })

    expect(
      createMetricSurface({
        data: null,
        error: new Error('boom'),
        isLoading: false,
        items: [{ id: 'row-1' }],
      })
    ).toMatchObject({
      items: [{ id: 'row-1' }],
      summary: null,
      summaryState: 'unavailable',
    })

    expect(
      isSummaryReady({
        data: { total: 9 },
        error: null,
        isLoading: false,
      })
    ).toBe(true)
  })
})
