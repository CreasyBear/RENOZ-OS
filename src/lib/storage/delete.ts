/**
 * Storage Delete Operations
 *
 * Delete files from R2 storage.
 */

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getDefaultBucket } from "./r2-client";
import { StorageOperationError } from "./errors";

/**
 * Options for deleting a file
 */
export interface DeleteObjectOptions {
  /** Storage key (path) for the file */
  key: string;
  /** Bucket name (default: R2_BUCKET_NAME env var) */
  bucket?: string;
}

/**
 * Delete a file from R2 storage
 *
 * @param options - Delete options
 * @throws StorageOperationError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteObject({
 *   key: "org-123/general/abc-photo.jpg",
 * });
 * ```
 */
export async function deleteObject(options: DeleteObjectOptions): Promise<void> {
  const { key, bucket = getDefaultBucket() } = options;

  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  } catch (error) {
    throw new StorageOperationError(
      "deleteObject",
      key,
      error instanceof Error ? error : undefined
    );
  }
}
