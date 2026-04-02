import { describe, expect, it } from 'vitest'
import {
  TEMPLATE_LOCAL_SORT_FIELDS,
  isTemplateLocalSortField,
} from '@/components/domain/communications/templates/template-local-sorting'
import { templatesSearchSchema } from '@/lib/schemas/communications/email-templates'

describe('template local sorting contract', () => {
  it('keeps template table sorting explicitly local', () => {
    expect(TEMPLATE_LOCAL_SORT_FIELDS).toEqual([
      'name',
      'category',
      'subject',
      'status',
      'version',
    ])
    expect(isTemplateLocalSortField('subject')).toBe(true)
    expect(isTemplateLocalSortField('updatedAt')).toBe(false)
  })

  it('does not expose url/server sort params for templates', () => {
    const parsed = templatesSearchSchema.parse({ sortBy: 'name' })
    expect(parsed).not.toHaveProperty('sortBy')
    expect(templatesSearchSchema.safeParse({ search: 'welcome', category: 'support' }).success).toBe(true)
  })
})
