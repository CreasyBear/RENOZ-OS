/**
 * Auth Zod Schemas
 *
 * Validation schemas for authentication, users, and organizations.
 */

import { z } from 'zod';
import {
  emailSchema,
  optionalEmailSchema,
  phoneSchema,
  urlSchema,
  addressSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from '../_shared/patterns';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const userRoleValues = [
  'owner',
  'admin',
  'manager',
  'sales',
  'operations',
  'support',
  'viewer',
] as const;

export const userStatusValues = ['active', 'invited', 'suspended', 'deactivated'] as const;

export const userTypeValues = ['staff', 'installer'] as const;

export const userRoleSchema = z.enum(userRoleValues);
export const userStatusSchema = z.enum(userStatusValues);
export const userTypeSchema = z.enum(userTypeValues);

// ============================================================================
// LOGIN / REGISTER
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type Login = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    name: z.string().min(1, 'Name is required').max(255),
    organizationName: z.string().min(1, 'Organization name is required').max(255),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type Register = z.infer<typeof registerSchema>;

// ============================================================================
// USER PROFILE
// ============================================================================

export const userProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: phoneSchema,
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  avatarUrl: urlSchema,
  bio: z.string().max(500).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ============================================================================
// USER PREFERENCES
// ============================================================================

export const userPreferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
      })
      .optional(),
    dashboard: z
      .object({
        layout: z.string().optional(),
        widgets: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow additional properties to match Drizzle's UserPreferences interface

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// ============================================================================
// CREATE USER (invite)
// ============================================================================

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(255),
  role: userRoleSchema.default('viewer'),
  type: userTypeSchema.optional(),
  profile: userProfileSchema.default({}),
});

export type CreateUser = z.infer<typeof createUserSchema>;

// ============================================================================
// UPDATE USER
// ============================================================================

export const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  type: userTypeSchema.optional(),
  profile: userProfileSchema.optional(),
  preferences: userPreferencesSchema.optional(),
});

export type UpdateUser = z.infer<typeof updateUserSchema>;

// ============================================================================
// USER (output)
// ============================================================================

export const userSchema = z.object({
  id: z.string().uuid(),
  authId: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  status: userStatusSchema,
  type: userTypeSchema.nullable(),
  profile: userProfileSchema,
  preferences: userPreferencesSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// ============================================================================
// USER FILTERS
// ============================================================================

export const userFilterSchema = filterSchema.extend({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  type: userTypeSchema.optional(),
});

export type UserFilter = z.infer<typeof userFilterSchema>;

// ============================================================================
// USER LIST QUERY
// ============================================================================

export const userListQuerySchema = paginationSchema.merge(userFilterSchema);

export type UserListQuery = z.infer<typeof userListQuerySchema>;

// ============================================================================
// ORGANIZATION SETTINGS
// ============================================================================

export const organizationSettingsSchema = z.object({
  timezone: z.string().default('Australia/Sydney'),
  locale: z.string().default('en-AU'),
  currency: z.string().default('AUD'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  defaultPaymentTerms: z.number().int().nonnegative().optional(),
  portalBranding: z
    .object({
      logoUrl: urlSchema,
      primaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
        .optional(),
      secondaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
        .optional(),
      websiteUrl: urlSchema,
    })
    .partial()
    .optional(),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

// ============================================================================
// ORGANIZATION BRANDING
// ============================================================================

export const organizationBrandingSchema = z.object({
  logoUrl: urlSchema,
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  websiteUrl: urlSchema,
});

export type OrganizationBranding = z.infer<typeof organizationBrandingSchema>;

// ============================================================================
// CREATE ORGANIZATION
// ============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  abn: z
    .string()
    .regex(/^\d{11}$/, 'ABN must be 11 digits')
    .optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: urlSchema,
  address: addressSchema.partial().optional(),
  settings: organizationSettingsSchema.optional(),
  branding: organizationBrandingSchema.optional(),
});

export type CreateOrganization = z.infer<typeof createOrganizationSchema>;

// ============================================================================
// UPDATE ORGANIZATION
// ============================================================================

export const updateOrganizationSchema = createOrganizationSchema.partial().omit({ slug: true }); // Slug cannot be changed

export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

// ============================================================================
// ORGANIZATION (output)
// ============================================================================

export const organizationSchema = createOrganizationSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  plan: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Organization = z.infer<typeof organizationSchema>;

// ============================================================================
// PARAMS
// ============================================================================

export const userParamsSchema = idParamSchema;
export type UserParams = z.infer<typeof userParamsSchema>;

export const organizationParamsSchema = idParamSchema;
export type OrganizationParams = z.infer<typeof organizationParamsSchema>;

// ============================================================================
// PASSWORD CHANGE
// ============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ChangePassword = z.infer<typeof changePasswordSchema>;
