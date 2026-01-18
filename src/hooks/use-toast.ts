/**
 * Toast Hook
 *
 * Re-exports Sonner's toast function with typed variants.
 * Use this hook for toast notifications throughout the app.
 *
 * @example
 * ```tsx
 * import { toast } from '@/hooks/use-toast'
 *
 * // Basic variants
 * toast.success('Item saved successfully!')
 * toast.error('Failed to save item')
 * toast.warning('You have unsaved changes')
 * toast.info('New update available')
 *
 * // Loading state
 * const id = toast.loading('Saving...')
 * // Later: toast.dismiss(id) or toast.success('Done!', { id })
 *
 * // With action button
 * toast('Item deleted', {
 *   action: {
 *     label: 'Undo',
 *     onClick: () => handleUndo()
 *   }
 * })
 *
 * // Custom duration
 * toast.success('Quick message', { duration: 2000 })
 *
 * // Promise-based (auto handles loading/success/error)
 * toast.promise(saveData(), {
 *   loading: 'Saving...',
 *   success: 'Data saved!',
 *   error: 'Failed to save'
 * })
 * ```
 */
import { toast as sonnerToast, type ExternalToast } from 'sonner'

// Re-export the toast function with all its methods
export const toast = sonnerToast

// Type-safe toast variants for convenience
export type ToastOptions = ExternalToast

/**
 * Show a success toast
 */
export function toastSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, options)
}

/**
 * Show an error toast
 */
export function toastError(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, options)
}

/**
 * Show a warning toast
 */
export function toastWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, options)
}

/**
 * Show an info toast
 */
export function toastInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, options)
}

/**
 * Show a loading toast (returns ID for dismissal)
 */
export function toastLoading(message: string, options?: ToastOptions) {
  return sonnerToast.loading(message, options)
}

/**
 * Promise-based toast that auto-transitions through loading/success/error
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return sonnerToast.promise(promise, messages)
}

/**
 * Dismiss a toast by ID, or all toasts if no ID provided
 */
export function dismissToast(id?: string | number) {
  return sonnerToast.dismiss(id)
}
