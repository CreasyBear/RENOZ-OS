/**
 * Storage Head Operations
 *
 * Check if files exist and get metadata from R2.
 */

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getDefaultBucket } from "./r2-client";
import { StorageOperationError } from "./errors";

/**
 * Options for head object request
 */
export interface HeadObjectOptions {
  /** Storage key (path) for the file */
  key: string;
  /** Bucket name (default: R2_BUCKET_NAME env var) */
  bucket?: string;
}

/**
 * Result of head object request
 */
export interface HeadObjectResult {
  /** File size in bytes */
  contentLength: number;
  /** MIME type of the file */
  contentType: string;
}

/**
 * Get metadata for a file in R2 storage
 *
 * Returns null if the file does not exist.
 *
 * @param options - Head object options
 * @returns File metadata or null if not found
 * @throws StorageOperationError if operation fails (other than not found)
 *
 * @example
 * ```typescript
 * const result = await headObject({
 *   key: "org-123/general/abc-photo.jpg",
 * });
 *
 * if (result) {
 *   console.log(`File size: ${result.contentLength} bytes`);
 *   console.log(`Content type: ${result.contentType}`);
 * } else {
 *   console.log("File does not exist");
 * }
 * ```
 */
export async function headObject(
  options: HeadObjectOptions
): Promise<HeadObjectResult | null> {
  const { key, bucket = getDefaultBucket() } = options;

  try {
    const client = getR2Client();

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    // Check if it's a "not found" error
    if (
      error instanceof Error &&
      (error.name === "NotFound" ||
        error.name === "NoSuchKey" ||
        (error as any).$metadata?.httpStatusCode === 404)
    ) {
      return null;
    }

    throw new StorageOperationError(
      "headObject",
      key,
      error instanceof Error ? error : undefined
    );
  }
}
