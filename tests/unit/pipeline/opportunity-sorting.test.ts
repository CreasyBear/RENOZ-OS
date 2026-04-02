import { describe, expect, it } from 'vitest'
import {
  opportunityListQuerySchema,
  OPPORTUNITY_SORT_FIELDS,
} from '@/lib/schemas/pipeline'
import {
  getDefaultOpportunitySortDirection,
  resolveOpportunitySortState,
} from '@/components/domain/pipeline/opportunities/opportunity-sorting'

describe('opportunity sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(OPPORTUNITY_SORT_FIELDS).toEqual([
      'title',
      'stage',
      'value',
      'probability',
      'expectedCloseDate',
      'daysInStage',
      'createdAt',
    ])

    expect(opportunityListQuerySchema.safeParse({ sortBy: 'probability' }).success).toBe(true)
    expect(opportunityListQuerySchema.safeParse({ sortBy: 'customer' }).success).toBe(false)
  })

  it('defaults metric and recency fields to descending order', () => {
    expect(getDefaultOpportunitySortDirection('value')).toBe('desc')
    expect(getDefaultOpportunitySortDirection('probability')).toBe('desc')
    expect(getDefaultOpportunitySortDirection('createdAt')).toBe('desc')
    expect(getDefaultOpportunitySortDirection('title')).toBe('asc')
  })

  it('resolves sort transitions consistently', () => {
    expect(
      resolveOpportunitySortState('createdAt', 'desc', 'title')
    ).toEqual({
      field: 'title',
      direction: 'asc',
    })

    expect(
      resolveOpportunitySortState('title', 'asc', 'title')
    ).toEqual({
      field: 'title',
      direction: 'desc',
    })
  })
})
