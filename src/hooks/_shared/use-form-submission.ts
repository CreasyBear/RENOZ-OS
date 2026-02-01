/**
 * Form Submission Hook
 *
 * Integrates TanStack Form with server functions, providing:
 * - Automatic cache invalidation
 * - Toast notifications on success/error
 * - Loading state management
 * - Error handling
 *
 * @example
 * ```tsx
 * const { submit, isSubmitting, error, reset } = useFormSubmission({
 *   serverFn: createCustomer,
 *   invalidateKeys: [queryKeys.customers.lists()],
 *   successMessage: 'Customer created successfully',
 *   onSuccess: (result) => {
 *     form.reset()
 *     navigate(`/customers/${result.id}`)
 *   },
 * })
 *
 * // In form submit handler
 * form.handleSubmit(async ({ value }) => {
 *   await submit(value)
 * })
 * ```
 */

import { useState, useCallback } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface UseFormSubmissionOptions<TInput, TOutput> {
  /** Server function to call */
  serverFn: (args: { data: TInput }) => Promise<TOutput>
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[]
  /** Success toast message (skipped if not provided) */
  successMessage?: string
  /** Error toast message prefix (defaults to 'Failed to save') */
  errorMessagePrefix?: string
  /** Callback on successful submission */
  onSuccess?: (result: TOutput) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean
  /** Whether to show success toast (default: true if successMessage provided) */
  showSuccessToast?: boolean
}

export interface UseFormSubmissionResult<TInput, TOutput> {
  /** Submit function to call with form values */
  submit: (data: TInput) => Promise<TOutput | undefined>
  /** Whether a submission is in progress */
  isSubmitting: boolean
  /** Error from the last submission */
  error: Error | null
  /** Reset error state */
  reset: () => void
  /** Last successful result */
  result: TOutput | undefined
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling form submissions to server functions.
 *
 * Features:
 * - Automatic TanStack Query cache invalidation
 * - Built-in toast notifications
 * - Proper loading state management
 * - Error handling with retry capability
 *
 * @param options - Configuration options
 * @returns Submission handler and state
 */
export function useFormSubmission<TInput, TOutput>({
  serverFn,
  invalidateKeys = [],
  successMessage,
  errorMessagePrefix = 'Failed to save',
  onSuccess,
  onError,
  showErrorToast = true,
  showSuccessToast = true,
}: UseFormSubmissionOptions<TInput, TOutput>): UseFormSubmissionResult<TInput, TOutput> {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<TOutput | undefined>(undefined)

  const submit = useCallback(
    async (data: TInput): Promise<TOutput | undefined> => {
      setIsSubmitting(true)
      setError(null)

      try {
        const response = await serverFn({ data })

        // Invalidate specified query keys
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        )

        // Show success toast
        if (showSuccessToast && successMessage) {
          toast.success(successMessage)
        }

        setResult(response)
        onSuccess?.(response)
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)

        // Show error toast
        if (showErrorToast) {
          toast.error(`${errorMessagePrefix}: ${error.message}`)
        }

        onError?.(error)
        return undefined
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      serverFn,
      invalidateKeys,
      queryClient,
      successMessage,
      errorMessagePrefix,
      onSuccess,
      onError,
      showErrorToast,
      showSuccessToast,
    ]
  )

  const reset = useCallback(() => {
    setError(null)
    setResult(undefined)
  }, [])

  return {
    submit,
    isSubmitting,
    error,
    reset,
    result,
  }
}

// ============================================================================
// COMPOSABLE VARIANT FOR MUTATIONS
// ============================================================================

export interface UseFormMutationOptions<TInput, TOutput> {
  /** Mutation function */
  mutationFn: (data: TInput) => Promise<TOutput>
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[]
  /** Success message */
  successMessage?: string
  /** Callbacks */
  onSuccess?: (result: TOutput) => void
  onError?: (error: Error) => void
}

/**
 * Alternative hook that wraps a mutation function directly.
 * Useful when you already have a mutation function without the server fn wrapper.
 */
export function useFormMutation<TInput, TOutput>({
  mutationFn,
  invalidateKeys = [],
  successMessage,
  onSuccess,
  onError,
}: UseFormMutationOptions<TInput, TOutput>) {
  return useFormSubmission({
    serverFn: async ({ data }: { data: TInput }) => mutationFn(data),
    invalidateKeys,
    successMessage,
    onSuccess,
    onError,
  })
}
