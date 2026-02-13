/**
 * Shared constants for organization logo upload and validation.
 * Single source of truth — used by hook and server.
 *
 * @module organization-logo
 * @exports ALLOWED_MIME_TYPES - PNG and JPEG only
 * @exports MAX_SIZE_BYTES - 2MB
 * @exports LOGO_ERROR_MESSAGES - User-facing error strings
 * @exports isAllowedLogoMimeType - MIME type checker
 *
 * @see src/hooks/organizations/use-organization-logo-upload.ts
 * @see src/server/functions/settings/organization-logo.ts
 * @see docs/design-system/FILE-UPLOAD-STANDARDS.md
 */

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

export const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const LOGO_ERROR_MESSAGES = {
  invalidType:
    'Please upload PNG or JPG (max 2MB). SVG and WebP are not supported for PDF documents.',
  fileTooLarge: 'File too large. Maximum 2MB. Recommended: 400×100px for best display.',
} as const;

export function isAllowedLogoMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number]);
}
