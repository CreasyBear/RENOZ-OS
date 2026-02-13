/**
 * Profile Form Schema
 *
 * Zod schema for profile form validation.
 * Used with TanStack Form for type-safe form handling.
 *
 * @lastReviewed 2026-02-10
 * @see FORM-STANDARDS.md for form implementation patterns
 */

import { z } from "zod";

/**
 * Profile form data schema
 * Matches the form fields in ProfileForm component
 */
export const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  phone: z.string().optional(),
  jobTitle: z.string().max(100, "Job title is too long").optional(),
  department: z.string().max(100, "Department is too long").optional(),
  bio: z.string().max(500, "Bio is too long").optional(),
  timezone: z.string().default("Australia/Sydney"),
  language: z.string().default("en"),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
