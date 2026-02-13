import { describe, expect, expectTypeOf, it } from 'vitest'
import { recipientCriteriaSchema } from '@/lib/schemas/communications/email-campaigns'
import type { CampaignRecipientCriteria } from '../../../drizzle/schema/communications/email-campaigns'

describe('email campaign wire types', () => {
  it('accepts flexible custom filters at schema boundary', () => {
    const result = recipientCriteriaSchema.safeParse({
      customFilters: {
        tier: 'gold',
        spendMin: 500,
        active: true,
        nested: { source: 'manual' },
      },
    })

    expect(result.success).toBe(true)
  })

  it('keeps customFilters assignable to ServerFn object maps', () => {
    expectTypeOf<NonNullable<CampaignRecipientCriteria['customFilters']>>()
      .toMatchTypeOf<Record<string, {}>>()
  })
})
