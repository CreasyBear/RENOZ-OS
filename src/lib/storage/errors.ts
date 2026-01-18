/**
 * Storage Error Classes
 *
 * Custom errors for R2 storage operations with proper error handling.
 */

/**
 * Base storage error class
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * File not found in storage
 */
export class StorageNotFoundError extends StorageError {
  constructor(key: string, cause?: Error) {
    super(`File not found: ${key}`, "NOT_FOUND", cause);
    this.name = "StorageNotFoundError";
  }
}

/**
 * Access denied to storage resource
 */
export class StorageAccessDeniedError extends StorageError {
  constructor(key: string, cause?: Error) {
    super(`Access denied to file: ${key}`, "ACCESS_DENIED", cause);
    this.name = "StorageAccessDeniedError";
  }
}

/**
 * Storage operation failed
 */
export class StorageOperationError extends StorageError {
  constructor(operation: string, key: string, cause?: Error) {
    super(`Storage operation failed: ${operation} on ${key}`, "OPERATION_FAILED", cause);
    this.name = "StorageOperationError";
  }
}

/**
 * Storage configuration error
 */
export class StorageConfigError extends StorageError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "StorageConfigError";
  }
}
