import { describe, expect, expectTypeOf, it } from 'vitest'
import { amendmentChangesSchema } from '@/lib/schemas/orders/order-amendments'
import type { AmendmentChanges } from '@/lib/schemas/orders/order-amendments'
import type { JsonValue } from '@/lib/schemas/_shared/patterns'

describe('order amendments wire types', () => {
  it('accepts flexible before/after payloads at schema boundary', () => {
    const result = amendmentChangesSchema.safeParse({
      type: 'quantity_change',
      description: 'Update quantities',
      before: {
        lineItemId: 'abc',
        quantity: 1,
      },
      after: {
        lineItemId: 'abc',
        quantity: 3,
        nested: { source: 'manual' },
      },
    })

    expect(result.success).toBe(true)
  })

  it('keeps before/after assignable to ServerFn object maps', () => {
    expectTypeOf<NonNullable<AmendmentChanges['before']>>()
      .toMatchTypeOf<Record<string, JsonValue>>()
    expectTypeOf<NonNullable<AmendmentChanges['after']>>()
      .toMatchTypeOf<Record<string, JsonValue>>()
  })
})
