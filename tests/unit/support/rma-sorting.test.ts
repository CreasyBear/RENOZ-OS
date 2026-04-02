import { describe, expect, it } from 'vitest'
import { listRmasSchema } from '@/lib/schemas/support/rma'
import {
  DEFAULT_RMA_SORT_DIRECTION,
  DEFAULT_RMA_SORT_FIELD,
  RMA_SORT_FIELDS,
  getDefaultRmaSortDirection,
  resolveRmaSortState,
} from '@/components/domain/support/rma/rma-sorting'
import {
  DEFAULT_KB_ARTICLE_SORT_FIELD,
  KB_ARTICLE_SORT_FIELDS,
  getDefaultKbArticleSortDirection,
  resolveKbArticleSortState,
} from '@/components/domain/support/knowledge-base/kb-article-sorting'

describe('rma sorting helpers', () => {
  it('matches the rma schema contract', () => {
    expect(listRmasSchema.safeParse({ sortBy: 'createdAt' }).success).toBe(true)
    expect(listRmasSchema.safeParse({ sortBy: 'supplierName' }).success).toBe(false)
    expect(RMA_SORT_FIELDS).toEqual(['createdAt', 'rmaNumber', 'status'])
    expect(DEFAULT_RMA_SORT_FIELD).toBe('createdAt')
    expect(DEFAULT_RMA_SORT_DIRECTION).toBe('desc')
  })

  it('resolves same-field toggles and new-field defaults', () => {
    expect(getDefaultRmaSortDirection('createdAt')).toBe('desc')
    expect(getDefaultRmaSortDirection('status')).toBe('asc')
    expect(
      resolveRmaSortState('createdAt', 'desc', 'createdAt')
    ).toEqual({
      field: 'createdAt',
      direction: 'asc',
    })
  })
})

describe('knowledge base sorting helpers', () => {
  it('keeps route and page sort fields aligned', () => {
    expect(KB_ARTICLE_SORT_FIELDS).toEqual([
      'updatedAt',
      'createdAt',
      'title',
      'viewCount',
      'publishedAt',
    ])
    expect(DEFAULT_KB_ARTICLE_SORT_FIELD).toBe('updatedAt')
  })

  it('uses descending defaults except for title', () => {
    expect(getDefaultKbArticleSortDirection('updatedAt')).toBe('desc')
    expect(getDefaultKbArticleSortDirection('viewCount')).toBe('desc')
    expect(getDefaultKbArticleSortDirection('title')).toBe('asc')
    expect(
      resolveKbArticleSortState('updatedAt', 'desc', 'publishedAt')
    ).toEqual({
      field: 'publishedAt',
      direction: 'desc',
    })
  })
})
