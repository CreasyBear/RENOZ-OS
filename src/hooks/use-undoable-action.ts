/**
 * useUndoableAction Hook
 *
 * Executes an action optimistically with the ability to undo within a time window.
 * Shows a confirmation toast during the undo window.
 *
 * @example
 * ```tsx
 * const { execute, isExecuting } = useUndoableAction({
 *   action: async (ids) => {
 *     await deleteItems(ids)
 *   },
 *   undoAction: async (ids) => {
 *     await restoreItems(ids)
 *   },
 *   getMessage: (ids) => `${ids.length} item${ids.length > 1 ? 's' : ''} deleted`,
 * })
 *
 * // In handler
 * const handleDelete = (selectedIds: string[]) => {
 *   execute(selectedIds)
 * }
 * ```
 */
import { useState, useCallback, useRef } from 'react'
import { showConfirmationToast } from '~/components/shared/notifications/confirmation-toast'
import { toast } from 'sonner'

export interface UseUndoableActionOptions<T> {
  /** The action to execute (called immediately, can be undone) */
  action: (data: T) => void | Promise<void>
  /** The undo action (reverses the main action) */
  undoAction: (data: T) => void | Promise<void>
  /** Generate message from the data */
  getMessage: (data: T) => string
  /** Get item count from data (for bulk operations) */
  getItemCount?: (data: T) => number
  /** Toast variant */
  variant?: 'destructive' | 'warning'
  /** Duration of undo window in ms */
  duration?: number
  /** Called after action is confirmed (countdown complete, no undo) */
  onConfirmed?: (data: T) => void
  /** Called after action is undone */
  onUndone?: (data: T) => void
}

export interface UseUndoableActionReturn<T> {
  /** Execute the undoable action */
  execute: (data: T) => void
  /** Whether an action is currently being processed */
  isExecuting: boolean
  /** Cancel any pending action (triggers undo if within window) */
  cancel: () => void
}

export function useUndoableAction<T>({
  action,
  undoAction,
  getMessage,
  getItemCount,
  variant = 'destructive',
  duration = 5000,
  onConfirmed,
  onUndone,
}: UseUndoableActionOptions<T>): UseUndoableActionReturn<T> {
  const [isExecuting, setIsExecuting] = useState(false)
  const currentDataRef = useRef<T | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const isUndoneRef = useRef(false)

  const execute = useCallback(async (data: T) => {
    setIsExecuting(true)
    currentDataRef.current = data
    isUndoneRef.current = false

    try {
      // Execute action immediately (optimistic)
      await action(data)

      // Show confirmation toast
      toastIdRef.current = showConfirmationToast({
        message: getMessage(data),
        itemCount: getItemCount?.(data),
        variant,
        duration,
        onUndo: async () => {
          if (isUndoneRef.current) return
          isUndoneRef.current = true
          await undoAction(data)
          onUndone?.(data)
        },
        onConfirm: () => {
          if (!isUndoneRef.current) {
            onConfirmed?.(data)
          }
        },
      })
    } catch (error) {
      toast.error('Action failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsExecuting(false)
    }
  }, [action, undoAction, getMessage, getItemCount, variant, duration, onConfirmed, onUndone])

  const cancel = useCallback(async () => {
    if (toastIdRef.current && currentDataRef.current && !isUndoneRef.current) {
      isUndoneRef.current = true
      toast.dismiss(toastIdRef.current)
      try {
        await undoAction(currentDataRef.current)
        toast.success('Action cancelled')
        if (currentDataRef.current) {
          onUndone?.(currentDataRef.current)
        }
      } catch {
        toast.error('Failed to cancel action')
      }
    }
  }, [undoAction, onUndone])

  return {
    execute,
    isExecuting,
    cancel,
  }
}

/**
 * Simpler variant for single-item deletions
 */
export function useUndoableDelete<T extends { id: string; name?: string }>({
  deleteItem,
  restoreItem,
  entityName = 'item',
  onDeleted,
  onRestored,
}: {
  deleteItem: (item: T) => Promise<void>
  restoreItem: (item: T) => Promise<void>
  entityName?: string
  onDeleted?: (item: T) => void
  onRestored?: (item: T) => void
}) {
  return useUndoableAction({
    action: deleteItem,
    undoAction: restoreItem,
    getMessage: (item) => `${item.name ?? entityName} deleted`,
    variant: 'destructive',
    onConfirmed: onDeleted,
    onUndone: onRestored,
  })
}

/**
 * Variant for bulk deletions
 */
export function useUndoableBulkDelete<T>({
  deleteItems,
  restoreItems,
  entityName = 'items',
  onDeleted,
  onRestored,
}: {
  deleteItems: (items: T[]) => Promise<void>
  restoreItems: (items: T[]) => Promise<void>
  entityName?: string
  onDeleted?: (items: T[]) => void
  onRestored?: (items: T[]) => void
}) {
  return useUndoableAction({
    action: deleteItems,
    undoAction: restoreItems,
    getMessage: () => `${entityName} deleted`,
    getItemCount: (itemList) => itemList.length,
    variant: 'destructive',
    onConfirmed: onDeleted,
    onUndone: onRestored,
  })
}
