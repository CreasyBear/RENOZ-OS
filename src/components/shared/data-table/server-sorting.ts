export type SortDirection = "asc" | "desc";

interface ResolveServerSortStateOptions<TField extends string> {
  currentField: TField;
  currentDirection: SortDirection;
  nextField: string;
  nextDirection?: SortDirection;
  isValidField: (field: string) => field is TField;
  getDefaultDirection: (field: TField) => SortDirection;
}

export function resolveServerSortState<TField extends string>({
  currentField,
  currentDirection,
  nextField,
  nextDirection,
  isValidField,
  getDefaultDirection,
}: ResolveServerSortStateOptions<TField>): {
  field: TField;
  direction: SortDirection;
} | null {
  if (!isValidField(nextField)) {
    return null;
  }

  if (nextDirection) {
    return { field: nextField, direction: nextDirection };
  }

  if (currentField === nextField) {
    return {
      field: currentField,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }

  return {
    field: nextField,
    direction: getDefaultDirection(nextField),
  };
}
