import { describe, expect, it } from 'vitest'
import {
  projectListQuerySchema,
  PROJECT_SORT_FIELDS,
} from '@/lib/schemas/jobs/projects'
import {
  getDefaultProjectSortDirection,
  resolveProjectSortState,
} from '@/components/domain/jobs/projects/project-sorting'

describe('project sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(PROJECT_SORT_FIELDS).toEqual([
      'createdAt',
      'title',
      'status',
      'priority',
      'targetCompletionDate',
    ])

    expect(projectListQuerySchema.safeParse({ sortBy: 'priority' }).success).toBe(true)
    expect(projectListQuerySchema.safeParse({ sortBy: 'projectType' }).success).toBe(false)
  })

  it('defaults recency fields to descending order', () => {
    expect(getDefaultProjectSortDirection('createdAt')).toBe('desc')
    expect(getDefaultProjectSortDirection('targetCompletionDate')).toBe('desc')
    expect(getDefaultProjectSortDirection('title')).toBe('asc')
  })

  it('resolves explicit and implicit sort transitions', () => {
    expect(
      resolveProjectSortState('createdAt', 'desc', 'title', 'desc')
    ).toEqual({
      field: 'title',
      direction: 'desc',
    })

    expect(resolveProjectSortState('title', 'asc', 'title')).toEqual({
      field: 'title',
      direction: 'desc',
    })
  })
})
