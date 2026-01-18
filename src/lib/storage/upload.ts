/**
 * Presigned Upload URL Generation
 *
 * Generate presigned PUT URLs for direct client-side uploads to R2.
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getDefaultBucket } from "./r2-client";
import { StorageOperationError } from "./errors";

/**
 * Default URL expiration in seconds (1 hour)
 */
const DEFAULT_EXPIRES_IN = 3600;

/**
 * Options for generating presigned upload URL
 */
export interface GeneratePresignedUploadUrlOptions {
  /** Storage key (path) for the file */
  key: string;
  /** MIME type of the file */
  mimeType: string;
  /** URL expiration in seconds (default: 3600) */
  expiresIn?: number;
  /** Bucket name (default: R2_BUCKET_NAME env var) */
  bucket?: string;
}

/**
 * Result of generating presigned upload URL
 */
export interface PresignedUploadUrlResult {
  /** Presigned PUT URL for uploading */
  uploadUrl: string;
  /** Expiration timestamp */
  expiresAt: Date;
}

/**
 * Generate a presigned URL for uploading a file directly to R2
 *
 * @param options - Upload URL options
 * @returns Presigned upload URL and expiration
 * @throws StorageOperationError if URL generation fails
 *
 * @example
 * ```typescript
 * const { uploadUrl, expiresAt } = await generatePresignedUploadUrl({
 *   key: "org-123/general/abc-photo.jpg",
 *   mimeType: "image/jpeg",
 * });
 *
 * // Client uploads directly to R2
 * await fetch(uploadUrl, {
 *   method: "PUT",
 *   body: file,
 *   headers: { "Content-Type": "image/jpeg" },
 * });
 * ```
 */
export async function generatePresignedUploadUrl(
  options: GeneratePresignedUploadUrlOptions
): Promise<PresignedUploadUrlResult> {
  const {
    key,
    mimeType,
    expiresIn = DEFAULT_EXPIRES_IN,
    bucket = getDefaultBucket(),
  } = options;

  try {
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { uploadUrl, expiresAt };
  } catch (error) {
    throw new StorageOperationError(
      "generatePresignedUploadUrl",
      key,
      error instanceof Error ? error : undefined
    );
  }
}
