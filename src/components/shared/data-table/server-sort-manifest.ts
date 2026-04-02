import {
  resolveServerSortState,
  type SortDirection,
} from '@/components/shared/data-table/server-sorting'

export interface ServerSortManifest<TField extends string> {
  readonly fields: readonly TField[]
  readonly defaultField: TField
  readonly defaultDirection: SortDirection
  isField: (field: string) => field is TField
  getDefaultDirection: (field: TField) => SortDirection
  resolveSort: (
    currentField: TField,
    currentDirection: SortDirection,
    nextField: string,
    nextDirection?: SortDirection
  ) => { field: TField; direction: SortDirection } | null
}

export function createServerSortManifest<const TField extends string>(config: {
  fields: readonly TField[]
  defaultField: TField
  defaultDirection?: SortDirection
  getDefaultDirection: (field: TField) => SortDirection
}): ServerSortManifest<TField> {
  const fields = [...config.fields] as readonly TField[]
  const allowedFields = new Set<string>(fields)

  const isField = (field: string): field is TField => allowedFields.has(field)

  const resolveSort = (
    currentField: TField,
    currentDirection: SortDirection,
    nextField: string,
    nextDirection?: SortDirection
  ) =>
    resolveServerSortState({
      currentField,
      currentDirection,
      nextField,
      nextDirection,
      isValidField: isField,
      getDefaultDirection: config.getDefaultDirection,
    })

  return {
    fields,
    defaultField: config.defaultField,
    defaultDirection:
      config.defaultDirection ?? config.getDefaultDirection(config.defaultField),
    isField,
    getDefaultDirection: config.getDefaultDirection,
    resolveSort,
  }
}
