/**
 * Structured Error Classes for Email Provider Operations
 *
 * Type-safe error handling for email provider integrations (Gmail/Outlook).
 * Based on Midday's error patterns.
 *
 * @see _reference/.midday-reference/packages/inbox/src/errors.ts
 */

/**
 * Error codes for authentication-related errors.
 */
export type EmailAuthErrorCode =
  | "token_expired"
  | "token_invalid"
  | "refresh_token_expired"
  | "refresh_token_invalid"
  | "unauthorized"
  | "forbidden"
  | "consent_required"
  | "mfa_required";

/**
 * Error codes for sync-related errors.
 */
export type EmailSyncErrorCode =
  | "fetch_failed"
  | "rate_limited"
  | "network_error"
  | "provider_error"
  | "quota_exceeded";

/**
 * Supported email providers.
 */
export type EmailProvider = "google_workspace" | "microsoft_365";

/**
 * Options for constructing an EmailAuthError.
 */
interface EmailAuthErrorOptions {
  code: EmailAuthErrorCode;
  provider: EmailProvider;
  message: string;
  requiresReauth: boolean;
  cause?: Error;
}

/**
 * Structured error for authentication and authorization issues.
 */
export class EmailAuthError extends Error {
  readonly code: EmailAuthErrorCode;
  readonly provider: EmailProvider;
  readonly requiresReauth: boolean;

  constructor(options: EmailAuthErrorOptions) {
    super(options.message);
    this.name = "EmailAuthError";
    this.code = options.code;
    this.provider = options.provider;
    this.requiresReauth = options.requiresReauth;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, EmailAuthError.prototype);
  }

  isReauthRequired(): boolean {
    return this.requiresReauth;
  }
}

/**
 * Options for constructing an EmailSyncError.
 */
interface EmailSyncErrorOptions {
  code: EmailSyncErrorCode;
  provider: EmailProvider;
  message: string;
  retryAfter?: number; // Seconds to wait before retry
  cause?: Error;
}

/**
 * Structured error for sync-related issues (non-authentication).
 */
export class EmailSyncError extends Error {
  readonly code: EmailSyncErrorCode;
  readonly provider: EmailProvider;
  readonly retryAfter?: number;

  constructor(options: EmailSyncErrorOptions) {
    super(options.message);
    this.name = "EmailSyncError";
    this.code = options.code;
    this.provider = options.provider;
    this.retryAfter = options.retryAfter;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, EmailSyncError.prototype);
  }

  isRetryable(): boolean {
    return this.code === "network_error" || this.code === "rate_limited" || this.code === "quota_exceeded";
  }
}

/**
 * Type guard to check if an error is an EmailAuthError.
 */
export function isEmailAuthError(error: unknown): error is EmailAuthError {
  return error instanceof EmailAuthError;
}

/**
 * Type guard to check if an error is an EmailSyncError.
 */
export function isEmailSyncError(error: unknown): error is EmailSyncError {
  return error instanceof EmailSyncError;
}

