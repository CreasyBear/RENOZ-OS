/**
 * Warranty Certificate Utilities
 *
 * Shared utilities for opening warranty certificates in new windows.
 * Provides consistent error handling and popup blocking detection.
 */

import { toast } from '@/lib/toast';

/**
 * Options for opening certificate window
 */
export interface OpenCertificateOptions {
  /** Callback when window fails to open */
  onError?: (error: Error) => void;
  /** Custom error message for toast */
  errorMessage?: string;
}

/**
 * Open a certificate URL in a new window with proper error handling.
 *
 * @param url - The certificate URL to open
 * @param options - Optional error handling configuration
 * @throws Error if window fails to open or popup is blocked
 *
 * @example
 * ```ts
 * try {
 *   await openCertificateWindow(certificateUrl);
 * } catch (error) {
 *   // Error already handled with toast
 * }
 * ```
 */
export function openCertificateWindow(
  url: string,
  options?: OpenCertificateOptions
): void {
  try {
    const windowRef = window.open(url, '_blank', 'noopener,noreferrer');
    
    if (!windowRef) {
      const error = new Error('Popup blocked. Please allow popups for this site.');
      toast.error(
        options?.errorMessage ?? 'Failed to open certificate',
        {
          description: 'Popup blocked. Please allow popups for this site.',
        }
      );
      options?.onError?.(error);
      throw error;
    }
  } catch (error) {
    const normalizedError = error instanceof Error 
      ? error 
      : new Error('Failed to open certificate');
    
    toast.error(
      options?.errorMessage ?? 'Failed to open certificate',
      {
        description: normalizedError.message,
      }
    );
    
    options?.onError?.(normalizedError);
    throw normalizedError;
  }
}
