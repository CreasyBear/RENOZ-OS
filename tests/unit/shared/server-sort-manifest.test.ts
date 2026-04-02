import { describe, expect, it } from 'vitest'
import { createServerSortManifest } from '@/components/shared/data-table/server-sort-manifest'

describe('createServerSortManifest', () => {
  const manifest = createServerSortManifest({
    fields: ['name', 'createdAt', 'value'] as const,
    defaultField: 'createdAt',
    getDefaultDirection: (field) =>
      field === 'name' ? 'asc' : 'desc',
  })

  it('exposes canonical sort metadata', () => {
    expect(manifest.fields).toEqual(['name', 'createdAt', 'value'])
    expect(manifest.defaultField).toBe('createdAt')
    expect(manifest.defaultDirection).toBe('desc')
    expect(manifest.isField('name')).toBe(true)
    expect(manifest.isField('missing')).toBe(false)
  })

  it('resolves explicit and implicit sort transitions consistently', () => {
    expect(
      manifest.resolveSort('createdAt', 'desc', 'name')
    ).toEqual({
      field: 'name',
      direction: 'asc',
    })

    expect(
      manifest.resolveSort('name', 'asc', 'name')
    ).toEqual({
      field: 'name',
      direction: 'desc',
    })

    expect(
      manifest.resolveSort('createdAt', 'desc', 'value', 'asc')
    ).toEqual({
      field: 'value',
      direction: 'asc',
    })
  })
})
