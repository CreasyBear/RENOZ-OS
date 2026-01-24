/**
 * Error Handling Utilities - Gold Standard from Midday
 *
 * Centralized error handling, logging, and user feedback patterns.
 * Provides consistent error processing across the application.
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  stack?: string;
  timestamp: Date;
  context?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR CREATION
// ============================================================================

/**
 * Create a standardized application error
 */
export function createAppError(message: string, code?: string, context?: ErrorContext): AppError {
  return {
    message,
    code,
    timestamp: new Date(),
    context: context?.component,
    details: context?.metadata,
  };
}

/**
 * Convert unknown errors to AppError format
 */
export function normalizeError(error: unknown, context?: ErrorContext): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createAppError(error.message, 'UNKNOWN_ERROR', {
      ...context,
      metadata: {
        ...context?.metadata,
        originalStack: error.stack,
        originalName: error.name,
      },
    });
  }

  if (typeof error === 'string') {
    return createAppError(error, 'STRING_ERROR', context);
  }

  return createAppError('An unknown error occurred', 'UNKNOWN_ERROR', context);
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'timestamp' in error &&
    typeof (error as AppError).message === 'string'
  );
}

// ============================================================================
// ERROR HANDLING HOOKS
// ============================================================================

/**
 * Hook for consistent API error handling
 */
export function useErrorHandler() {
  return {
    handleError: (error: unknown, context?: ErrorContext) => {
      const normalizedError = normalizeError(error, context);

      // Log error
      console.error(`[${context?.component || 'Unknown'}] ${normalizedError.message}`, {
        error: normalizedError,
        context,
      });

      // Here you could send to error reporting service
      // if (process.env.NODE_ENV === 'production') {
      //   errorReporting.captureException(normalizedError);
      // }

      return normalizedError;
    },

    handleMutationError: (error: unknown, context?: ErrorContext) => {
      const normalizedError = normalizeError(error, context);

      // Show user-friendly message
      const userMessage = getUserFriendlyMessage(normalizedError);

      return {
        error: normalizedError,
        userMessage,
        shouldRetry: isRetryableError(normalizedError),
      };
    },
  };
}

// ============================================================================
// USER-FRIENDLY MESSAGES
// ============================================================================

/**
 * Convert technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error: AppError): string {
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.statusCode === 0) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (error.statusCode === 401 || error.code === 'UNAUTHORIZED') {
    return 'Your session has expired. Please sign in again.';
  }

  if (error.statusCode === 403 || error.code === 'FORBIDDEN') {
    return "You don't have permission to perform this action.";
  }

  // Validation errors
  if (error.statusCode === 400 || error.code?.includes('VALIDATION')) {
    return 'Please check your input and try again.';
  }

  // Not found errors
  if (error.statusCode === 404) {
    return 'The requested item could not be found.';
  }

  // Server errors
  if (error.statusCode && error.statusCode >= 500) {
    return 'Something went wrong on our end. Please try again later.';
  }

  // Conflict errors
  if (error.statusCode === 409 || error.code === 'CONFLICT') {
    return 'This action conflicts with existing data. Please refresh and try again.';
  }

  // Rate limiting
  if (error.statusCode === 429 || error.code === 'RATE_LIMITED') {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Default fallback
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Determine if an error should trigger a retry
 */
function isRetryableError(error: AppError): boolean {
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.statusCode === 0) {
    return true;
  }

  // Server errors (might be temporary)
  if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // Rate limiting (after backoff)
  if (error.statusCode === 429) {
    return true;
  }

  // Don't retry client errors
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  // Don't retry authentication errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    return false;
  }

  // Retry unknown errors
  return true;
}

// ============================================================================
// ERROR BOUNDARY UTILITIES
// ============================================================================

/**
 * Standard error boundary error handler
 */
export function handleBoundaryError(
  error: Error,
  errorInfo: { componentStack: string },
  context: ErrorContext
) {
  const appError = createAppError(error.message, 'BOUNDARY_ERROR', {
    ...context,
    metadata: {
      componentStack: errorInfo.componentStack,
      originalStack: error.stack,
    },
  });

  console.error('Error Boundary caught error:', appError);

  // Here you could send to error reporting
  // errorReporting.captureException(appError);

  return appError;
}

// ============================================================================
// ASYNC ERROR HANDLING
// ============================================================================

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const normalizedError = normalizeError(error, context);
      console.error(`Async error in ${context?.component || 'unknown'}:`, normalizedError);
      throw normalizedError;
    }
  };
}

// ============================================================================
// TOAST INTEGRATION
// ============================================================================

/**
 * Show error toast with proper formatting
 */
export function showErrorToast(error: unknown, context?: ErrorContext) {
  const { handleError } = useErrorHandler();
  const normalizedError = handleError(error, context);

  // Import toast functions dynamically to avoid circular dependencies
  import('@/hooks').then(({ toastError }) => {
    const userMessage = getUserFriendlyMessage(normalizedError);
    toastError(userMessage, {
      description: context?.action ? `Failed to ${context.action}` : undefined,
    });
  });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, description?: string) {
  import('@/hooks').then(({ toastSuccess }) => {
    toastSuccess(message, description ? { description } : undefined);
  });
}
