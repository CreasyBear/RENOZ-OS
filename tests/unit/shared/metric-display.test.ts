import { describe, expect, it } from 'vitest'
import {
  getMetricValueOrUnavailable,
  getSummaryMetricSubtitle,
  hasMetricValue,
} from '@/lib/metrics/metric-display'

describe('hasMetricValue', () => {
  it('treats zero as a real metric value', () => {
    expect(hasMetricValue(0)).toBe(true)
    expect(hasMetricValue(0)).toBeTruthy()
  })

  it('rejects nullish values', () => {
    expect(hasMetricValue(null)).toBe(false)
    expect(hasMetricValue(undefined)).toBe(false)
  })

  it('returns an unavailable marker only for nullish metric values', () => {
    expect(getMetricValueOrUnavailable(0)).toBe(0)
    expect(getMetricValueOrUnavailable('0h')).toBe('0h')
    expect(getMetricValueOrUnavailable(null)).toBe('—')
  })

  it('builds summary-aware subtitles for metric cards', () => {
    expect(
      getSummaryMetricSubtitle({
        summaryState: 'ready',
        readySubtitle: 'Healthy',
      })
    ).toBe('Healthy')

    expect(
      getSummaryMetricSubtitle({
        summaryState: 'unavailable',
      })
    ).toBe('Summary unavailable')
  })
})
