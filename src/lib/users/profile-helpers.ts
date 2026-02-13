/**
 * Profile Helpers
 *
 * Type-safe helpers for accessing user profile JSONB fields.
 * Eliminates type assertions and provides single source of truth for profile field access.
 *
 * @lastReviewed 2026-02-10
 * @see SCHEMA-TRACE.md for type flow patterns
 */

import type { UserProfile } from "@/lib/schemas/auth/auth";

/**
 * Profile fields that may exist in JSONB but aren't in canonical schema
 */
export interface ExtendedProfileFields {
  timezone?: string;
  language?: string;
  title?: string; // Legacy field name (use jobTitle instead)
}

/**
 * Complete profile type including extended fields
 */
export type ProfileData = Partial<UserProfile> & ExtendedProfileFields;

/**
 * Type guard to check if profile is an object
 */
function isProfileObject(profile: unknown): profile is Record<string, unknown> {
  return profile !== null && typeof profile === "object";
}

/**
 * Safely extract a string field from profile JSONB
 */
function getProfileField(
  profile: unknown,
  field: keyof ProfileData
): string | undefined {
  if (!isProfileObject(profile)) {
    return undefined;
  }

  const value = profile[field];
  return typeof value === "string" ? value : undefined;
}

/**
 * Get phone from profile JSONB
 *
 * @param profile - User profile JSONB object
 * @returns Phone number or undefined
 */
export function getProfilePhone(profile: unknown): string | undefined {
  return getProfileField(profile, "phone");
}

/**
 * Get jobTitle from profile (handles legacy "title" field)
 *
 * @param profile - User profile JSONB object
 * @returns Job title (prefers canonical "jobTitle", falls back to legacy "title")
 */
export function getProfileJobTitle(profile: unknown): string | undefined {
  if (!isProfileObject(profile)) {
    return undefined;
  }

  // Prefer canonical field, fallback to legacy
  return (
    getProfileField(profile, "jobTitle") || getProfileField(profile, "title")
  );
}

/**
 * Get department from profile
 */
export function getProfileDepartment(profile: unknown): string | undefined {
  return getProfileField(profile, "department");
}

/**
 * Get bio from profile
 */
export function getProfileBio(profile: unknown): string | undefined {
  return getProfileField(profile, "bio");
}

/**
 * Get timezone from profile
 */
export function getProfileTimezone(profile: unknown): string {
  return getProfileField(profile, "timezone") || "Australia/Sydney";
}

/**
 * Get language from profile
 */
export function getProfileLanguage(profile: unknown): string {
  return getProfileField(profile, "language") || "en";
}

/**
 * Extract all profile fields for form initialization
 */
export function extractProfileFields(profile: unknown): {
  phone: string;
  jobTitle: string;
  department: string;
  bio: string;
  timezone: string;
  language: string;
} {
  return {
    phone: getProfilePhone(profile) || "",
    jobTitle: getProfileJobTitle(profile) || "",
    department: getProfileDepartment(profile) || "",
    bio: getProfileBio(profile) || "",
    timezone: getProfileTimezone(profile),
    language: getProfileLanguage(profile),
  };
}

/**
 * Merge form values into existing profile JSONB
 * Preserves existing fields and updates only changed ones
 *
 * @param existingProfile - Current profile JSONB object
 * @param formValues - Form values to merge
 * @returns Merged profile object ready for database update
 */
export function mergeProfileUpdate(
  existingProfile: unknown,
  formValues: {
    phone?: string;
    jobTitle?: string;
    department?: string;
    bio?: string;
    timezone?: string;
    language?: string;
  }
): Record<string, unknown> {
  const profileUpdate: Record<string, unknown> = {};
  
  // Preserve existing profile fields
  if (existingProfile && typeof existingProfile === "object") {
    Object.assign(profileUpdate, existingProfile);
  }

  // Update with form values (only if defined)
  if (formValues.phone !== undefined) profileUpdate.phone = formValues.phone;
  if (formValues.jobTitle !== undefined) profileUpdate.jobTitle = formValues.jobTitle;
  if (formValues.department !== undefined) profileUpdate.department = formValues.department;
  if (formValues.bio !== undefined) profileUpdate.bio = formValues.bio;
  if (formValues.timezone !== undefined) profileUpdate.timezone = formValues.timezone;
  if (formValues.language !== undefined) profileUpdate.language = formValues.language;

  return profileUpdate;
}

/**
 * Calculate profile completeness percentage
 * 
 * Required fields (weighted):
 * - Name: 30% (required)
 * - Phone: 20% (recommended)
 * - Job Title: 15% (recommended)
 * - Department: 10% (optional)
 * - Bio: 10% (optional)
 * - Avatar: 15% (recommended)
 * 
 * @param user - User object with name and profile JSONB
 * @returns Completeness percentage (0-100) and missing fields
 */
export function calculateProfileCompleteness(user: {
  name: string | null;
  profile: unknown;
}): {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
} {
  const missingFields: string[] = [];
  let score = 0;

  // Name (30% - required)
  if (user.name && user.name.trim().length > 0) {
    score += 30;
  } else {
    missingFields.push("Full Name");
  }

  // Phone (20% - recommended)
  if (getProfilePhone(user.profile)) {
    score += 20;
  } else {
    missingFields.push("Phone Number");
  }

  // Job Title (15% - recommended)
  if (getProfileJobTitle(user.profile)) {
    score += 15;
  } else {
    missingFields.push("Job Title");
  }

  // Department (10% - optional)
  if (getProfileDepartment(user.profile)) {
    score += 10;
  }

  // Bio (10% - optional)
  if (getProfileBio(user.profile)) {
    score += 10;
  }

  // Avatar (15% - recommended)
  if (isProfileObject(user.profile) && user.profile.avatarUrl && typeof user.profile.avatarUrl === "string") {
    score += 15;
  } else {
    missingFields.push("Profile Photo");
  }

  return {
    percentage: Math.min(100, score),
    missingFields,
    isComplete: score >= 70, // Consider complete if 70%+ (name + phone + job title + avatar)
  };
}
