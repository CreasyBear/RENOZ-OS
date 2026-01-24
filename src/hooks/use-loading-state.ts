/**
 * Loading State Management Hook - Gold Standard Pattern
 *
 * Centralized loading state management with consistent patterns.
 * Eliminates scattered loading state logic throughout components.
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number; // 0-100
  error?: string;
}

export interface LoadingOptions {
  message?: string;
  showProgress?: boolean;
  timeout?: number; // Auto-resolve after timeout
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Centralized loading state management
 * Provides consistent loading UX patterns across the app
 */
export function useLoadingState(initialLoading = false) {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
  });

  const startLoading = useCallback((options: LoadingOptions = {}) => {
    const { message, showProgress, timeout } = options;

    setState({
      isLoading: true,
      message: message || 'Loading...',
      progress: showProgress ? 0 : undefined,
      error: undefined,
    });

    // Auto-resolve after timeout if specified
    if (timeout) {
      setTimeout(() => {
        setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      }, timeout);
    }
  }, []);

  const stopLoading = useCallback(() => {
    setState({
      isLoading: false,
      message: undefined,
      progress: undefined,
      error: undefined,
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error,
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      message,
    }));
  }, []);

  // Computed values for common patterns
  const loadingStates = useMemo(
    () => ({
      // Basic loading
      isLoading: state.isLoading,

      // With progress
      isLoadingWithProgress: state.isLoading && typeof state.progress === 'number',

      // With message
      isLoadingWithMessage: state.isLoading && !!state.message,

      // Error state
      hasError: !!state.error,

      // Combined states
      isIdle: !state.isLoading && !state.error,
      isActive: state.isLoading || !!state.error,
    }),
    [state]
  );

  return {
    // State
    ...state,
    ...loadingStates,

    // Actions
    startLoading,
    stopLoading,
    updateProgress,
    setError,
    setMessage,

    // Reset to initial state
    reset: stopLoading,
  };
}

// ============================================================================
// SPECIALIZED LOADING HOOKS
// ============================================================================

/**
 * Hook for async operations with automatic loading management
 */
export function useAsyncLoading() {
  const loading = useLoadingState();

  const executeAsync = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: LoadingOptions & {
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        successMessage?: string;
      } = {}
    ): Promise<T | undefined> => {
      const { onSuccess, onError, successMessage, ...loadingOptions } = options;

      loading.startLoading(loadingOptions);

      try {
        const result = await operation();

        loading.stopLoading();

        if (onSuccess) {
          onSuccess(result);
        }

        if (successMessage) {
          // Import toast dynamically to avoid circular dependencies
          import('@/lib/toast').then(({ toast }) => {
            toast.success(successMessage);
          });
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        loading.setError(errorMessage);

        if (onError) {
          onError(error as Error);
        }

        // Show error toast
        import('@/lib/toast').then(({ toast }) => {
          toast.error('Operation failed', { description: errorMessage });
        });

        return undefined;
      }
    },
    [loading]
  );

  return {
    ...loading,
    executeAsync,
  };
}

/**
 * Hook for file upload operations with progress tracking
 */
export function useFileUploadLoading() {
  const loading = useLoadingState();

  const uploadFile = useCallback(
    async (
      file: File,
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<any>,
      options: {
        onSuccess?: (result: any) => void;
        onError?: (error: Error) => void;
      } = {}
    ) => {
      loading.startLoading({
        message: `Uploading ${file.name}...`,
        showProgress: true,
      });

      try {
        const result = await uploadFn(file, loading.updateProgress);
        loading.stopLoading();

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        import('@/lib/toast').then(({ toast }) => {
          toast.success('File uploaded successfully');
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        loading.setError(errorMessage);

        if (options.onError) {
          options.onError(error as Error);
        }

        import('@/lib/toast').then(({ toast }) => {
          toast.error('Upload failed', { description: errorMessage });
        });

        return undefined;
      }
    },
    [loading]
  );

  return {
    ...loading,
    uploadFile,
  };
}

/**
 * Hook for bulk operations with progress tracking
 */
export function useBulkOperationLoading() {
  const loading = useLoadingState();

  const executeBulkOperation = useCallback(
    async <T>(
      items: T[],
      operation: (item: T, index: number) => Promise<any>,
      options: {
        itemName?: string;
        onProgress?: (completed: number, total: number) => void;
        onSuccess?: (results: any[]) => void;
        onError?: (error: Error, failedItem: T) => void;
        continueOnError?: boolean;
      } = {}
    ) => {
      const { itemName = 'item', onProgress, onSuccess, onError, continueOnError = true } = options;

      loading.startLoading({
        message: `Processing ${items.length} ${itemName}s...`,
        showProgress: true,
      });

      const results: any[] = [];
      let completed = 0;

      for (const [index, item] of items.entries()) {
        try {
          const result = await operation(item, index);
          results.push(result);
          completed++;

          const progress = (completed / items.length) * 100;
          loading.updateProgress(progress);

          if (onProgress) {
            onProgress(completed, items.length);
          }
        } catch (error) {
          if (!continueOnError) {
            loading.setError(`Failed to process ${itemName} ${index + 1}`);
            if (onError) {
              onError(error as Error, item);
            }
            return results;
          }

          console.warn(`Failed to process ${itemName} ${index + 1}:`, error);
          if (onError) {
            onError(error as Error, item);
          }
        }
      }

      loading.stopLoading();

      if (onSuccess) {
        onSuccess(results);
      }

      import('@/lib/toast').then(({ toast }) => {
        const successCount = results.length;
        const totalCount = items.length;

        if (successCount === totalCount) {
          toast.success(`Successfully processed all ${totalCount} ${itemName}s`);
        } else {
          toast.warning(`Processed ${successCount} of ${totalCount} ${itemName}s`, {
            description: `${totalCount - successCount} failed`,
          });
        }
      });

      return results;
    },
    [loading]
  );

  return {
    ...loading,
    executeBulkOperation,
  };
}
