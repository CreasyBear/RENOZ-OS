/**
 * Warranty Certificate Utilities
 *
 * Shared utilities for opening warranty certificates in new windows.
 * Provides consistent error handling and popup blocking detection.
 */

import { toast } from '@/lib/toast';

export const WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE =
  'Warranty certificate could not be opened. Please refresh and try again.';

export const WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE =
  'Popup blocked. Please allow popups for this site and try again.';

/**
 * Options for opening certificate window
 */
export interface OpenCertificateOptions {
  /** Callback when window fails to open */
  onError?: (error: Error) => void;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return null;
}

export function formatWarrantyCertificateWindowError(error: unknown): string {
  const message = extractMessage(error);
  if (!message) return WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE;

  const normalized = message.toLowerCase();
  if (normalized.includes('popup blocked') || normalized.includes('allow popups')) {
    return WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE;
  }

  return WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE;
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
 *   openCertificateWindow(certificateUrl);
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
      throw new Error(WARRANTY_CERTIFICATE_POPUP_BLOCKED_MESSAGE);
    }
  } catch (error) {
    const normalizedError = new Error(formatWarrantyCertificateWindowError(error));
    
    toast.error(
      WARRANTY_CERTIFICATE_OPEN_FAILED_MESSAGE,
      {
        description: normalizedError.message,
      }
    );
    
    options?.onError?.(normalizedError);
    throw normalizedError;
  }
}
