/**
 * Toast Notification Provider
 *
 * Provides global toast notifications using Sonner.
 * Add this to the root layout for app-wide toast support.
 *
 * @example
 * ```tsx
 * // In root layout
 * <ToastProvider />
 *
 * // In any component
 * import { toast } from '@/hooks/use-toast'
 * toast.success('Item saved!')
 * ```
 */
import { Toaster } from 'sonner'

interface ToastProviderProps {
  /**
   * Position of toast notifications
   * @default 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  /**
   * Whether to expand toasts by default
   * @default false
   */
  expand?: boolean
  /**
   * Whether to show rich colors for different toast types
   * @default true
   */
  richColors?: boolean
  /**
   * Default duration in milliseconds
   * @default 4000
   */
  duration?: number
}

export function ToastProvider({
  position = 'bottom-right',
  expand = false,
  richColors = true,
  duration = 4000,
}: ToastProviderProps) {
  return (
    <Toaster
      position={position}
      expand={expand}
      richColors={richColors}
      duration={duration}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'group toast',
          title: 'text-sm font-medium',
          description: 'text-sm text-gray-500',
          actionButton: 'bg-gray-900 text-white text-xs px-2 py-1 rounded',
          cancelButton: 'bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded',
          closeButton: 'bg-white border border-gray-200',
        },
      }}
    />
  )
}
