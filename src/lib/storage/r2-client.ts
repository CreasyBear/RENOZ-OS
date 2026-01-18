/**
 * Cloudflare R2 Client Configuration
 *
 * S3-compatible client configured for Cloudflare R2.
 * Uses AWS SDK v3 with R2-specific endpoint.
 *
 * @see https://developers.cloudflare.com/r2/api/s3/api/
 */

import { S3Client } from "@aws-sdk/client-s3";
import { StorageConfigError } from "./errors";

/**
 * Get the R2 endpoint URL from environment
 */
function getR2Endpoint(): string {
  const accountId = process.env.R2_ACCOUNT_ID;
  const customEndpoint = process.env.R2_ENDPOINT;

  if (customEndpoint) {
    return customEndpoint;
  }

  if (!accountId) {
    throw new StorageConfigError(
      "R2_ACCOUNT_ID environment variable is required"
    );
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/**
 * Get R2 credentials from environment
 */
function getR2Credentials(): { accessKeyId: string; secretAccessKey: string } {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new StorageConfigError(
      "R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables are required"
    );
  }

  return { accessKeyId, secretAccessKey };
}

/**
 * Get the default bucket name from environment
 */
export function getDefaultBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) {
    throw new StorageConfigError(
      "R2_BUCKET_NAME environment variable is required"
    );
  }

  return bucket;
}

/**
 * Lazily initialized S3Client for Cloudflare R2
 */
let _r2Client: S3Client | null = null;

/**
 * Get the configured R2 client instance
 *
 * @returns Configured S3Client for Cloudflare R2
 * @throws StorageConfigError if required environment variables are missing
 */
export function getR2Client(): S3Client {
  if (_r2Client) {
    return _r2Client;
  }

  const endpoint = getR2Endpoint();
  const credentials = getR2Credentials();

  _r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials,
    // Explicit retry and timeout configuration (FIX-011)
    maxAttempts: 3, // Retry transient failures up to 3 times
    // Note: Request timeout is handled by the underlying HTTP handler.
    // For Node.js, consider @aws-sdk/node-http-handler if finer control is needed.
  });

  return _r2Client;
}

/**
 * Reset the R2 client (useful for testing)
 */
export function resetR2Client(): void {
  _r2Client = null;
}
