/**
 * Presigned Download URL Generation
 *
 * Generate presigned GET URLs for secure file downloads from R2.
 */

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getDefaultBucket } from "./r2-client";
import { StorageOperationError } from "./errors";

/**
 * Default URL expiration in seconds (1 hour)
 */
const DEFAULT_EXPIRES_IN = 3600;

/**
 * Options for generating presigned download URL
 */
export interface GeneratePresignedDownloadUrlOptions {
  /** Storage key (path) for the file */
  key: string;
  /** URL expiration in seconds (default: 3600) */
  expiresIn?: number;
  /** Bucket name (default: R2_BUCKET_NAME env var) */
  bucket?: string;
}

/**
 * Result of generating presigned download URL
 */
export interface PresignedDownloadUrlResult {
  /** Presigned GET URL for downloading */
  downloadUrl: string;
  /** Expiration timestamp */
  expiresAt: Date;
}

/**
 * Generate a presigned URL for downloading a file from R2
 *
 * @param options - Download URL options
 * @returns Presigned download URL and expiration
 * @throws StorageOperationError if URL generation fails
 *
 * @example
 * ```typescript
 * const { downloadUrl, expiresAt } = await generatePresignedDownloadUrl({
 *   key: "org-123/general/abc-photo.jpg",
 * });
 *
 * // Client downloads via presigned URL
 * window.open(downloadUrl, "_blank");
 * ```
 */
export async function generatePresignedDownloadUrl(
  options: GeneratePresignedDownloadUrlOptions
): Promise<PresignedDownloadUrlResult> {
  const {
    key,
    expiresIn = DEFAULT_EXPIRES_IN,
    bucket = getDefaultBucket(),
  } = options;

  try {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { downloadUrl, expiresAt };
  } catch (error) {
    throw new StorageOperationError(
      "generatePresignedDownloadUrl",
      key,
      error instanceof Error ? error : undefined
    );
  }
}
