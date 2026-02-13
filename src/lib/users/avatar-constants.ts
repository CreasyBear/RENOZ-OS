/**
 * Avatar Upload Constants
 *
 * Centralized constants for avatar upload validation.
 * Eliminates DRY violations across avatar upload components.
 *
 * @lastReviewed 2026-02-10
 */

/**
 * Allowed MIME types for avatar uploads
 */
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AvatarMimeType = typeof AVATAR_ALLOWED_TYPES[number];

/**
 * Maximum file size for avatar uploads (2MB)
 */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Check if a MIME type is allowed for avatar uploads
 */
export function isAllowedAvatarType(mimeType: string): mimeType is AvatarMimeType {
  return AVATAR_ALLOWED_TYPES.includes(mimeType as AvatarMimeType);
}
