/**
 * Storage URL Utilities
 *
 * Helpers for Supabase Storage public URL handling.
 * Used by avatar and organization logo upload/remove flows.
 *
 * @see avatar.ts
 * @see organization-logo.ts
 */

function getSupabaseStorageBase(): string | undefined {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!url) return undefined;
  // Normalize: remove trailing slash
  return url.replace(/\/$/, "");
}

/**
 * Check if URL is from our Supabase Storage public bucket.
 *
 * Only returns true when the URL contains our project's Supabase URL
 * and the storage public path pattern.
 */
export function isOurStorageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const base = getSupabaseStorageBase();
  if (!base) return false;
  // Must contain our Supabase URL and the storage public object path
  return (
    url.startsWith(base) && url.includes("/storage/v1/object/public/")
  );
}

/**
 * Extract storage path from our public URL for use with bucket.remove().
 *
 * The URL format is: .../storage/v1/object/public/{bucket}/{path}
 * For remove() we need the path within the bucket, e.g. "avatars/user-123.jpg".
 *
 * @param url - The public storage URL
 * @param bucket - Bucket name (e.g. "public") - used to strip the bucket prefix from the path
 * @returns Path suitable for storage.from(bucket).remove([path]), or null for external URLs
 *
 * @example
 * // Our URL: https://xxx.supabase.co/storage/v1/object/public/public/avatars/user-123.jpg
 * extractStoragePathFromPublicUrl(url, "public") // => "avatars/user-123.jpg"
 *
 * // External URL
 * extractStoragePathFromPublicUrl("https://example.com/logo.png", "public") // => null
 */
export function extractStoragePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string
): string | null {
  if (!isOurStorageUrl(url)) return null;
  const match = url!.match(/\/storage\/v1\/object\/public\/(.+)$/);
  if (!match) return null;
  const fullPath = match[1];
  // fullPath is "bucket/path" - strip bucket prefix to get path within bucket
  const prefix = bucket + "/";
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
}
