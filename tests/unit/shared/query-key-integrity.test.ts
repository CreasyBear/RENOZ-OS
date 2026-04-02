import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

describe('query key integrity', () => {
  it('separates finite and infinite customer list keys', () => {
    const filters = { search: 'Ada', sortBy: 'name' as const }

    expect(queryKeys.customers.list(filters)).not.toEqual(
      queryKeys.customers.infiniteList(filters)
    )
  })

  it('separates finite and infinite order list keys', () => {
    const filters = { search: 'SO-100', sortBy: 'orderNumber' as const }

    expect(queryKeys.orders.list(filters)).not.toEqual(
      queryKeys.orders.infiniteList(filters)
    )
  })

  it('separates finite and infinite opportunity list keys', () => {
    const filters = { search: 'Kitchen', sortBy: 'createdAt' as const, sortOrder: 'desc' as const }

    expect(queryKeys.opportunities.list(filters)).not.toEqual(
      queryKeys.opportunities.infiniteList(filters)
    )
  })
})
