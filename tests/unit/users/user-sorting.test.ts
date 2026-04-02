import { describe, expect, it } from 'vitest'
import {
  USER_SORT_FIELDS,
  userListQuerySchema,
} from '@/lib/schemas/auth'
import {
  getDefaultUserSortDirection,
  resolveUserSortState,
} from '@/routes/_authenticated/admin/users/user-sorting'

describe('user sorting helpers', () => {
  it('matches the schema-backed sort contract', () => {
    expect(USER_SORT_FIELDS).toEqual([
      'name',
      'email',
      'role',
      'status',
      'createdAt',
    ])

    expect(userListQuerySchema.safeParse({ sortBy: 'email' }).success).toBe(true)
    expect(userListQuerySchema.safeParse({ sortBy: 'type' }).success).toBe(false)
  })

  it('defaults createdAt to descending order and other fields to ascending', () => {
    expect(getDefaultUserSortDirection('createdAt')).toBe('desc')
    expect(getDefaultUserSortDirection('name')).toBe('asc')
  })

  it('rejects unsupported sort fields', () => {
    expect(resolveUserSortState('name', 'asc', 'lastSeenAt')).toBeNull()
  })
})
