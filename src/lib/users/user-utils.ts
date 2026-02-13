/**
 * User Utilities
 *
 * Shared utility functions for user-related operations.
 * Extracted from components to eliminate DRY violations.
 *
 * @lastReviewed 2026-02-10
 * @source ProfileForm component
 * @source AvatarUpload component
 */

import { getInitials as getCustomerInitials } from "@/lib/customer-utils";

/**
 * Get user initials from name
 * Reuses customer-utils implementation for consistency
 *
 * @param name - User's full name or null
 * @returns Initials string (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string | null): string {
  if (!name) return "U";
  return getCustomerInitials(name);
}

/**
 * Extract avatar URL from user profile JSONB
 * Type-safe extraction without assertions
 *
 * @param profile - User profile JSONB object
 * @returns Avatar URL string or undefined
 */
export function extractAvatarUrl(
  profile: unknown
): string | undefined {
  if (!profile || typeof profile !== "object") {
    return undefined;
  }

  if ("avatarUrl" in profile) {
    const avatarUrl = profile.avatarUrl;
    if (typeof avatarUrl === "string") {
      return avatarUrl;
    }
  }

  return undefined;
}
