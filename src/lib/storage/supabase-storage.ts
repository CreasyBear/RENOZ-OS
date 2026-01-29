'use server'

/**
 * Supabase Storage Client
 *
 * Storage operations using Supabase Storage instead of S3/R2.
 * Designed to solve buffer issues with direct streaming.
 *
 * ⚠️ SERVER-ONLY: This module uses service role keys and Node.js APIs.
 * Never import this in client-side code.
 *
 * Key differences from R2 implementation:
 * - Uses Supabase Storage API instead of S3 SDK
 * - Handles ArrayBuffer/Blob conversion explicitly to avoid buffer issues
 * - Supports both server-side (service role) and client-side operations
 * - Better integration with Supabase Auth/RLS
 *
 * @see src/lib/storage/index.ts for barrel exports
 * @see src/lib/schemas/files/files.ts for validation schemas
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { StorageConfigError, StorageOperationError, StorageNotFoundError } from './errors';

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * Get Supabase credentials from environment (server-side only)
 */
function getSupabaseCredentials(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new StorageConfigError(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Get the default bucket name from environment or use fallback
 */
function getDefaultBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? 'attachments';
}

/**
 * Create a server-side Supabase client with service role
 * This bypasses RLS and should only be used in server functions
 */
export function createStorageClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseCredentials();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

/**
 * Options for uploading a file to Supabase Storage
 */
export interface UploadFileOptions {
  /** Storage path (key) for the file */
  path: string;
  /** File content as ArrayBuffer, Blob, or File */
  fileBody: ArrayBuffer | Blob | File;
  /** MIME type of the file */
  contentType: string;
  /** Bucket name (default: from env or 'attachments') */
  bucket?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Cache control header (default: 1 year for immutable assets) */
  cacheControl?: string;
  /**
   * Upsert behavior: if true, overwrites existing file.
   * If false, throws error if file exists.
   * @default false
   */
  upsert?: boolean;
}

/**
 * Result of a successful upload
 */
export interface UploadFileResult {
  /** Full path in storage bucket */
  path: string;
  /** Bucket name */
  bucket: string;
  /** Public URL (if bucket is public) */
  publicUrl?: string;
}

/**
 * Upload a file to Supabase Storage.
 *
 * This function explicitly handles buffer conversion to avoid the
 * "buffer is not defined" or "Body must be a Blob" errors that occur
 * when passing incompatible types to Supabase Storage.
 *
 * @example
 * ```typescript
 * // Upload from browser File
 * const result = await uploadFile({
 *   path: 'org-123/general/photo.jpg',
 *   fileBody: fileInput.files[0],
 *   contentType: 'image/jpeg',
 * });
 *
 * // Upload from ArrayBuffer (e.g., generated PDF)
 * const result = await uploadFile({
 *   path: 'org-123/reports/monthly.pdf',
 *   fileBody: pdfBuffer,
 *   contentType: 'application/pdf',
 * });
 * ```
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  const {
    path,
    fileBody,
    contentType,
    bucket = getDefaultBucket(),
    metadata,
    cacheControl = '31536000', // 1 year
    upsert = false,
  } = options;

  try {
    const supabase = createStorageClient();

    // Ensure fileBody is in a compatible format
    // Supabase Storage accepts: ArrayBuffer, Blob, File, FormData, NodeJS.ReadableStream
    let body: ArrayBuffer | Blob | File = fileBody;

    // Handle Node.js Buffer (convert to ArrayBuffer if needed)
    if (typeof Buffer !== 'undefined' && fileBody instanceof Buffer) {
      body = fileBody.buffer.slice(
        fileBody.byteOffset,
        fileBody.byteOffset + fileBody.byteLength
      );
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, body, {
        contentType,
        cacheControl,
        upsert,
        metadata,
      });

    if (error) {
      // Handle specific error cases
      if (error.message?.includes('Bucket not found')) {
        throw new StorageNotFoundError(bucket, new Error('Bucket not found'));
      }
      if (error.message?.includes('The resource already exists')) {
        throw new StorageOperationError(
          'uploadFile',
          path,
          new Error(`File already exists at path: ${path}. Use upsert: true to overwrite.`)
        );
      }
      throw new StorageOperationError('uploadFile', path, error);
    }

    // Get public URL if bucket allows public access
    let publicUrl: string | undefined;
    try {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      publicUrl = urlData.publicUrl;
    } catch {
      // Bucket might be private, that's OK
    }

    return {
      path: data.path,
      bucket,
      publicUrl,
    };
  } catch (error) {
    if (error instanceof StorageConfigError || error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'uploadFile',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// DOWNLOAD OPERATIONS
// ============================================================================

/**
 * Options for downloading a file from Supabase Storage
 */
export interface DownloadFileOptions {
  /** Storage path (key) for the file */
  path: string;
  /** Bucket name (default: from env or 'attachments') */
  bucket?: string;
  /**
   * Transform options for images (requires Supabase Image Transformations)
   * @see https://supabase.com/docs/guides/storage/image-transformations
   */
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    format?: 'origin';
    quality?: number;
  };
}

/**
 * Result of a successful download
 */
export interface DownloadFileResult {
  /** File content as ArrayBuffer */
  data: ArrayBuffer;
  /** MIME type */
  contentType: string;
  /** File size in bytes */
  size: number;
  /** Original filename (if available in metadata) */
  filename?: string;
}

/**
 * Download a file from Supabase Storage.
 *
 * Returns the file as an ArrayBuffer to avoid buffer compatibility issues
 * between Node.js and browser environments.
 *
 * @example
 * ```typescript
 * const { data, contentType } = await downloadFile({
 *   path: 'org-123/general/photo.jpg',
 * });
 *
 * // Create Blob for browser download
 * const blob = new Blob([data], { type: contentType });
 * ```
 */
export async function downloadFile(
  options: DownloadFileOptions
): Promise<DownloadFileResult> {
  const { path, bucket = getDefaultBucket(), transform } = options;

  try {
    const supabase = createStorageClient();

    let result;
    if (transform) {
      // Download with image transformations
      result = await supabase.storage.from(bucket).download(path, { transform });
    } else {
      result = await supabase.storage.from(bucket).download(path);
    }

    const { data, error } = result;

    if (error) {
      if (error.message?.includes('Object not found')) {
        throw new StorageNotFoundError(path, new Error('File not found'));
      }
      throw new StorageOperationError('downloadFile', path, error);
    }

    // Convert Blob to ArrayBuffer for consistent cross-platform handling
    const arrayBuffer = await data.arrayBuffer();

    return {
      data: arrayBuffer,
      contentType: data.type || 'application/octet-stream',
      size: arrayBuffer.byteLength,
    };
  } catch (error) {
    if (error instanceof StorageNotFoundError || error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'downloadFile',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// URL GENERATION
// ============================================================================

/**
 * Options for creating a signed URL
 */
export interface CreateSignedUrlOptions {
  /** Storage path (key) for the file */
  path: string;
  /** Bucket name (default: from env or 'attachments') */
  bucket?: string;
  /** URL expiration in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /**
   * Transform options for images (requires Supabase Image Transformations)
   */
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    format?: 'origin';
    quality?: number;
  };
  /**
   * Download behavior: if true, sets Content-Disposition to attachment
   * with the provided filename
   */
  download?: boolean | string;
}

/**
 * Result of creating a signed URL
 */
export interface SignedUrlResult {
  /** Signed URL for accessing the file */
  signedUrl: string;
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Path in storage */
  path: string;
}

/**
 * Create a signed URL for temporary access to a private file.
 *
 * This is the Supabase Storage equivalent of presigned URLs in S3.
 *
 * @example
 * ```typescript
 * // Create signed URL for download
 * const { signedUrl } = await createSignedUrl({
 *   path: 'org-123/private/document.pdf',
 *   expiresIn: 3600, // 1 hour
 * });
 *
 * // Create signed URL with download header
 * const { signedUrl } = await createSignedUrl({
 *   path: 'org-123/private/document.pdf',
 *   download: 'my-document.pdf',
 * });
 * ```
 */
export async function createSignedUrl(
  options: CreateSignedUrlOptions
): Promise<SignedUrlResult> {
  const {
    path,
    bucket = getDefaultBucket(),
    expiresIn = 3600,
    transform,
    download,
  } = options;

  try {
    const supabase = createStorageClient();

    let result;
    if (transform) {
      // Create signed URL with image transformations
      result = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn, { transform, download });
    } else {
      result = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn, { download });
    }

    const { data, error } = result;

    if (error) {
      if (error.message?.includes('Object not found')) {
        throw new StorageNotFoundError(path, new Error('File not found'));
      }
      throw new StorageOperationError('createSignedUrl', path, error);
    }

    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      path,
    };
  } catch (error) {
    if (error instanceof StorageNotFoundError || error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'createSignedUrl',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create multiple signed URLs in a single request.
 *
 * More efficient than calling createSignedUrl multiple times.
 *
 * @example
 * ```typescript
 * const results = await createSignedUrls({
 *   paths: ['file1.jpg', 'file2.jpg'],
 *   expiresIn: 3600,
 * });
 * ```
 */
export async function createSignedUrls(options: {
  paths: string[];
  bucket?: string;
  expiresIn?: number;
}): Promise<Record<string, SignedUrlResult>> {
  const { paths, bucket = getDefaultBucket(), expiresIn = 3600 } = options;

  if (paths.length === 0) {
    return {};
  }

  try {
    const supabase = createStorageClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, expiresIn);

    if (error) {
      throw new StorageOperationError('createSignedUrls', paths.join(', '), error);
    }

    const results: Record<string, SignedUrlResult> = {};
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    for (const item of data) {
      if (item.error) {
        console.warn(`Failed to create signed URL for ${item.path}:`, item.error);
        continue;
      }
      if (!item.path) continue;
      results[item.path] = {
        signedUrl: item.signedUrl,
        expiresAt,
        path: item.path,
      };
    }

    return results;
  } catch (error) {
    if (error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'createSignedUrls',
      paths.join(', '),
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get the public URL for a file in a public bucket.
 *
 * This does not create a signed URL - it returns the permanent public URL.
 * Only works for files in public buckets.
 *
 * @example
 * ```typescript
 * const { publicUrl } = getPublicUrl({
 *   path: 'org-123/general/photo.jpg',
 * });
 * ```
 */
export function getPublicUrl(options: {
  path: string;
  bucket?: string;
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    format?: 'origin';
    quality?: number;
  };
}): { publicUrl: string } {
  const { path, bucket = getDefaultBucket(), transform } = options;

  try {
    const supabase = createStorageClient();

    const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
      transform,
    });

    return { publicUrl: data.publicUrl };
  } catch (error) {
    throw new StorageOperationError(
      'getPublicUrl',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// METADATA OPERATIONS
// ============================================================================

/**
 * Get metadata for a file without downloading it.
 */
export async function getFileMetadata(options: {
  path: string;
  bucket?: string;
}): Promise<{
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string>;
}> {
  const { path, bucket = getDefaultBucket() } = options;

  try {
    const supabase = createStorageClient();

    const { data, error } = await supabase.storage.from(bucket).info(path);

    if (error) {
      if (error.message?.includes('Object not found')) {
        throw new StorageNotFoundError(path, new Error('File not found'));
      }
      throw new StorageOperationError('getFileMetadata', path, error);
    }

    return {
      size: data.size ?? 0,
      mimeType: data.contentType || 'application/octet-stream',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      metadata: data.metadata as Record<string, string> | undefined,
    };
  } catch (error) {
    if (error instanceof StorageNotFoundError || error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'getFileMetadata',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(options: {
  path: string;
  bucket?: string;
}): Promise<void> {
  const { path, bucket = getDefaultBucket() } = options;

  try {
    const supabase = createStorageClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      if (error.message?.includes('Object not found')) {
        // File doesn't exist, which is fine for idempotent delete
        return;
      }
      throw new StorageOperationError('deleteFile', path, error);
    }
  } catch (error) {
    if (error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'deleteFile',
      path,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete multiple files from Supabase Storage.
 */
export async function deleteFiles(options: {
  paths: string[];
  bucket?: string;
}): Promise<{ deleted: string[]; errors: Array<{ path: string; error: Error }> }> {
  const { paths, bucket = getDefaultBucket() } = options;

  if (paths.length === 0) {
    return { deleted: [], errors: [] };
  }

  try {
    const supabase = createStorageClient();

    const { data, error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw new StorageOperationError('deleteFiles', paths.join(', '), error);
    }

    // Supabase returns the paths that were successfully deleted
    const deleted = data?.map((item) => item.name) ?? [];
    const deletedSet = new Set(deleted);

    // Find paths that weren't deleted
    const errors: Array<{ path: string; error: Error }> = [];
    for (const path of paths) {
      if (!deletedSet.has(path)) {
        errors.push({
          path,
          error: new Error(`Failed to delete ${path}`),
        });
      }
    }

    return { deleted, errors };
  } catch (error) {
    if (error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'deleteFiles',
      paths.join(', '),
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

/**
 * List files in a bucket prefix.
 */
export async function listFiles(options: {
  prefix?: string;
  bucket?: string;
  limit?: number;
  offset?: number;
  sortBy?: { column: 'name' | 'created_at' | 'updated_at' | 'last_accessed_at' | 'size'; order: 'asc' | 'desc' };
}): Promise<{
  files: Array<{
    name: string;
    id: string;
    size: number;
    mimeType: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, string>;
  }>;
  nextOffset?: number;
}> {
  const {
    prefix = '',
    bucket = getDefaultBucket(),
    limit = 100,
    offset = 0,
    sortBy = { column: 'created_at', order: 'desc' },
  } = options;

  try {
    const supabase = createStorageClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy,
      });

    if (error) {
      throw new StorageOperationError('listFiles', prefix || bucket, error);
    }

    const files = data.map((item) => ({
      name: item.name,
      id: item.id,
      size: item.metadata?.size ? parseInt(item.metadata.size, 10) : 0,
      mimeType: item.metadata?.mimetype || 'application/octet-stream',
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      metadata: item.metadata as Record<string, string> | undefined,
    }));

    return {
      files,
      nextOffset: data.length === limit ? offset + limit : undefined,
    };
  } catch (error) {
    if (error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'listFiles',
      prefix || bucket,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// BUCKET OPERATIONS (Admin)
// ============================================================================

/**
 * Ensure a bucket exists. Creates it if it doesn't.
 * Requires service role key.
 */
export async function ensureBucket(options: {
  bucket: string;
  isPublic?: boolean;
  allowedMimeTypes?: string[];
  fileSizeLimit?: number; // in bytes
}): Promise<void> {
  const { bucket, isPublic = false, allowedMimeTypes, fileSizeLimit } = options;

  try {
    const supabase = createStorageClient();

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucket);

    if (exists) {
      return;
    }

    // Create bucket
    const { error } = await supabase.storage.createBucket(bucket, {
      public: isPublic,
      allowedMimeTypes,
      fileSizeLimit,
    });

    if (error) {
      throw new StorageOperationError('ensureBucket', bucket, error);
    }
  } catch (error) {
    if (error instanceof StorageOperationError) {
      throw error;
    }
    throw new StorageOperationError(
      'ensureBucket',
      bucket,
      error instanceof Error ? error : undefined
    );
  }
}
