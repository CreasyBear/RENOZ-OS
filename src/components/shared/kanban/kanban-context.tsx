/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Kanban Context
 *
 * Provides shared state for selection, keyboard navigation, and optimistic updates.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";

// ============================================================================
// SELECTION CONTEXT
// ============================================================================

export interface SelectionContextValue {
  /** Currently selected item IDs */
  selectedIds: Set<string>;
  /** Last selected item (for shift-click range selection) */
  lastSelectedId: string | null;
  /** Toggle selection of an item */
  toggleSelection: (id: string, multi?: boolean, range?: boolean) => void;
  /** Select a single item (clears others) */
  selectOnly: (id: string) => void;
  /** Select multiple items */
  selectMultiple: (ids: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Get selected count */
  selectedCount: number;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export interface SelectionProviderProps {
  children: ReactNode;
  /** All item IDs in order (for range selection) */
  itemIds: string[];
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function SelectionProvider({
  children,
  itemIds,
  onSelectionChange,
}: SelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const toggleSelection = useCallback(
    (id: string, multi = false, range = false) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (range && lastSelectedId) {
          // Shift+Click: select range
          const startIdx = itemIds.indexOf(lastSelectedId);
          const endIdx = itemIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            for (let i = from; i <= to; i++) {
              next.add(itemIds[i]);
            }
          }
        } else if (multi) {
          // Cmd/Ctrl+Click: toggle single
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        } else {
          // Normal click: select only this one
          next.clear();
          next.add(id);
        }

        return next;
      });
      setLastSelectedId(id);
    },
    [itemIds, lastSelectedId]
  );

  const selectOnly = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setLastSelectedId(id);
  }, []);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    if (ids.length > 0) {
      setLastSelectedId(ids[ids.length - 1]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const value = useMemo(
    () => ({
      selectedIds,
      lastSelectedId,
      toggleSelection,
      selectOnly,
      selectMultiple,
      clearSelection,
      isSelected,
      selectedCount: selectedIds.size,
    }),
    [
      selectedIds,
      lastSelectedId,
      toggleSelection,
      selectOnly,
      selectMultiple,
      clearSelection,
      isSelected,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return context;
}

// ============================================================================
// KEYBOARD NAVIGATION CONTEXT
// ============================================================================

export interface KeyboardNavigationContextValue {
  /** Currently focused item ID */
  focusedId: string | null;
  /** Set focused item */
  setFocusedId: (id: string | null) => void;
  /** Focus next item */
  focusNext: () => void;
  /** Focus previous item */
  focusPrev: () => void;
  /** Move focused item to next column */
  moveToNextColumn: () => void;
  /** Move focused item to previous column */
  moveToPrevColumn: () => void;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | undefined>(
  undefined
);

export interface KeyboardNavigationProviderProps {
  children: ReactNode;
  /** All item IDs in order */
  itemIds: string[];
  /** Column keys in order */
  columnKeys: string[];
  /** Get column key for an item */
  getItemColumn: (id: string) => string;
  /** Called when item should move to a column */
  onMoveItem?: (itemId: string, toColumn: string) => void;
  /** Enable keyboard shortcuts */
  enabled?: boolean;
}

export function KeyboardNavigationProvider({
  children,
  itemIds,
  columnKeys,
  getItemColumn,
  onMoveItem,
  enabled = true,
}: KeyboardNavigationProviderProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const focusNext = useCallback(() => {
    if (!focusedId) {
      if (itemIds.length > 0) setFocusedId(itemIds[0]);
      return;
    }
    const idx = itemIds.indexOf(focusedId);
    if (idx < itemIds.length - 1) {
      setFocusedId(itemIds[idx + 1]);
    }
  }, [focusedId, itemIds]);

  const focusPrev = useCallback(() => {
    if (!focusedId) {
      if (itemIds.length > 0) setFocusedId(itemIds[itemIds.length - 1]);
      return;
    }
    const idx = itemIds.indexOf(focusedId);
    if (idx > 0) {
      setFocusedId(itemIds[idx - 1]);
    }
  }, [focusedId, itemIds]);

  const moveToNextColumn = useCallback(() => {
    if (!focusedId || !onMoveItem) return;
    const currentColumn = getItemColumn(focusedId);
    const colIdx = columnKeys.indexOf(currentColumn);
    if (colIdx < columnKeys.length - 1) {
      onMoveItem(focusedId, columnKeys[colIdx + 1]);
    }
  }, [focusedId, columnKeys, getItemColumn, onMoveItem]);

  const moveToPrevColumn = useCallback(() => {
    if (!focusedId || !onMoveItem) return;
    const currentColumn = getItemColumn(focusedId);
    const colIdx = columnKeys.indexOf(currentColumn);
    if (colIdx > 0) {
      onMoveItem(focusedId, columnKeys[colIdx - 1]);
    }
  }, [focusedId, columnKeys, getItemColumn, onMoveItem]);

  // Global keyboard handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          focusNext();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          focusPrev();
          break;
        case "ArrowRight":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            moveToNextColumn();
          }
          break;
        case "ArrowLeft":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            moveToPrevColumn();
          }
          break;
        case "Escape":
          setFocusedId(null);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, focusNext, focusPrev, moveToNextColumn, moveToPrevColumn]);

  const value = useMemo(
    () => ({
      focusedId,
      setFocusedId,
      focusNext,
      focusPrev,
      moveToNextColumn,
      moveToPrevColumn,
    }),
    [focusedId, focusNext, focusPrev, moveToNextColumn, moveToPrevColumn]
  );

  return (
    <KeyboardNavigationContext.Provider value={value}>
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

export function useKeyboardNavigation() {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error("useKeyboardNavigation must be used within KeyboardNavigationProvider");
  }
  return context;
}

// ============================================================================
// OPTIMISTIC STATE HOOK
// ============================================================================

export interface OptimisticMove<TStatus extends string> {
  itemId: string;
  fromColumn: TStatus;
  toColumn: TStatus;
}

export function useOptimisticMoves<TStatus extends string>() {
  const [pendingMoves, setPendingMoves] = useState<Map<string, OptimisticMove<TStatus>>>(
    new Map()
  );

  const addPendingMove = useCallback((move: OptimisticMove<TStatus>) => {
    setPendingMoves((prev) => {
      const next = new Map(prev);
      next.set(move.itemId, move);
      return next;
    });
  }, []);

  const removePendingMove = useCallback((itemId: string) => {
    setPendingMoves((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const getPendingColumn = useCallback(
    (itemId: string): TStatus | null => {
      return pendingMoves.get(itemId)?.toColumn ?? null;
    },
    [pendingMoves]
  );

  const hasPendingMove = useCallback(
    (itemId: string): boolean => {
      return pendingMoves.has(itemId);
    },
    [pendingMoves]
  );

  return {
    pendingMoves,
    addPendingMove,
    removePendingMove,
    getPendingColumn,
    hasPendingMove,
  };
}
