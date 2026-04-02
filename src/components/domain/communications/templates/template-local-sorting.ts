export type TemplateLocalSortField =
  | 'name'
  | 'category'
  | 'subject'
  | 'status'
  | 'version'

export const TEMPLATE_LOCAL_SORT_FIELDS = [
  'name',
  'category',
  'subject',
  'status',
  'version',
] as const satisfies readonly TemplateLocalSortField[]

const templateLocalSortFields = new Set<string>(TEMPLATE_LOCAL_SORT_FIELDS)

export function isTemplateLocalSortField(
  value: string
): value is TemplateLocalSortField {
  return templateLocalSortFields.has(value)
}
