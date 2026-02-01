import { useState, useCallback, useMemo } from "react";

export interface UseTableSelectionOptions<T extends { id: string }> {
  /** Items to manage selection for */
  items: T[];
  /** Initial selected IDs */
  initialSelection?: Set<string>;
}

export interface UseTableSelectionReturn<T extends { id: string }> {
  /** Set of selected item IDs */
  selectedIds: Set<string>;
  /** Array of selected items */
  selectedItems: T[];
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some (but not all) items are selected */
  isPartiallySelected: boolean;
  /** Last clicked row index (for shift-click range) */
  lastClickedIndex: number | null;
  /** Update last clicked index */
  setLastClickedIndex: (index: number | null) => void;
  /** Handle single item selection */
  handleSelect: (id: string, checked: boolean) => void;
  /** Handle select all toggle */
  handleSelectAll: (checked: boolean) => void;
  /** Handle shift-click range selection */
  handleShiftClickRange: (startIdx: number, endIdx: number) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if specific item is selected */
  isSelected: (id: string) => boolean;
}

/**
 * Hook for managing table row selection with shift-click range support.
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   selectedItems,
 *   isAllSelected,
 *   handleSelect,
 *   handleSelectAll,
 *   handleShiftClickRange,
 *   clearSelection,
 *   lastClickedIndex,
 *   setLastClickedIndex,
 * } = useTableSelection({ items: orders });
 *
 * // In row render:
 * <CheckboxCell
 *   checked={isSelected(row.id)}
 *   onChange={(checked) => {
 *     handleSelect(row.id, checked);
 *     setLastClickedIndex(rowIndex);
 *   }}
 *   onShiftClick={() => {
 *     if (lastClickedIndex !== null) {
 *       handleShiftClickRange(lastClickedIndex, rowIndex);
 *     }
 *   }}
 * />
 * ```
 */
export function useTableSelection<T extends { id: string }>({
  items,
  initialSelection = new Set(),
}: UseTableSelectionOptions<T>): UseTableSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelection);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(items.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items]
  );

  const handleShiftClickRange = useCallback(
    (startIdx: number, endIdx: number) => {
      const [start, end] =
        startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (items[i]) {
            next.add(items[i].id);
          }
        }
        return next;
      });
    },
    [items]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const isPartiallySelected = useMemo(
    () =>
      items.some((item) => selectedIds.has(item.id)) &&
      !items.every((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    lastClickedIndex,
    setLastClickedIndex,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  };
}
