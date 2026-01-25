/**
 * useSelection Hook
 *
 * Manages selection state for bulk operations with Set-based storage
 * for O(1) selection operations.
 *
 * @example
 * ```tsx
 * const { selected, toggle, selectAll, clear, count } = useSelection<string>();
 *
 * // In a table row
 * <Checkbox
 *   checked={isSelected(row.id)}
 *   onCheckedChange={() => toggle(row.id)}
 * />
 *
 * // Select all visible items
 * <Button onClick={() => selectAll(visibleIds)}>Select All</Button>
 *
 * // Clear selection
 * <Button onClick={clear}>Clear</Button>
 * ```
 */
import { useState, useCallback, useMemo } from 'react'

export interface UseSelectionReturn<T extends string> {
  /** The current selection as a Set */
  selected: Set<T>
  /** The current selection as an array (for passing to APIs) */
  selectedArray: T[]
  /** Number of selected items */
  count: number
  /** Check if an item is selected */
  isSelected: (id: T) => boolean
  /** Toggle an item's selection state */
  toggle: (id: T) => void
  /** Select multiple items (replaces current selection) */
  selectAll: (ids: T[]) => void
  /** Add items to selection without clearing existing */
  addToSelection: (ids: T[]) => void
  /** Remove items from selection */
  removeFromSelection: (ids: T[]) => void
  /** Clear all selections */
  clear: () => void
  /** Check if any items are selected */
  hasSelection: boolean
}

export function useSelection<T extends string = string>(): UseSelectionReturn<T> {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const selectedArray = useMemo(() => Array.from(selected), [selected])
  const count = selected.size
  const hasSelection = count > 0

  const isSelected = useCallback(
    (id: T) => selected.has(id),
    [selected]
  )

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelected(new Set(ids))
  }, [])

  const addToSelection = useCallback((ids: T[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const removeFromSelection = useCallback((ids: T[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  return {
    selected,
    selectedArray,
    count,
    isSelected,
    toggle,
    selectAll,
    addToSelection,
    removeFromSelection,
    clear,
    hasSelection,
  }
}
