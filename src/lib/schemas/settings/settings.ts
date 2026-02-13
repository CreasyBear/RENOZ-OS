/**
 * Settings Domain Zod Schemas
 *
 * Comprehensive validation schemas for the settings domain:
 * - Organization settings
 * - System settings
 * - Business hours and holidays
 * - Custom fields
 * - Data exports
 *
 * @see drizzle/schema/system-settings.ts
 * @see drizzle/schema/custom-fields.ts
 * @see drizzle/schema/data-exports.ts
 */

import { z } from "zod";
import { paginationSchema } from "../_shared/patterns";

// ============================================================================
// ORGANIZATION SETTINGS
// ============================================================================
// NOTE: Core organization schemas (Organization, OrganizationSettings, etc.)
// are defined in lib/schemas/auth to avoid duplication. This file contains
// settings-domain specific schemas.

/**
 * Organization settings section data types.
 * Used by settings-sections.tsx for General, Address, Regional, Financial, Branding.
 */
export interface GeneralSettingsData {
  name: string;
  email: string;
  phone: string;
  abn: string;
  website: string;
}

export interface AddressSettingsData {
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export interface FinancialSettingsData {
  fiscalYearStart: number;
  defaultPaymentTerms: number;
  defaultTaxRate: number;
}

export interface BrandingSettingsData {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  websiteUrl: string;
}

/**
 * Explicit type for organization settings API response.
 * Matches getOrganizationSettings and updateOrganizationSettings return shape.
 * @see SCHEMA-TRACE.md §4 ServerFn boundary
 */
export interface OrganizationSettingsResponse {
  timezone: string;
  locale: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  numberFormat: "1,234.56" | "1.234,56" | "1 234,56";
  fiscalYearStart: number;
  weekStartDay: number;
  defaultTaxRate: number;
  defaultPaymentTerms: number;
  portalBranding: { [key: string]: object };
}

// ============================================================================
// ORGANIZATION SECTION ZOD SCHEMAS (validation)
// ============================================================================

export const generalSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255),
  email: z.union([z.string().email("Invalid email"), z.literal("")]),
  phone: z.string().max(50),
  abn: z.string().max(50),
  website: z.union([z.string().url("Invalid URL"), z.literal("")]),
});

export const addressSettingsSchema = z.object({
  addressLine1: z.string().max(255),
  addressLine2: z.string().max(255),
  suburb: z.string().max(100),
  state: z.string().max(100),
  postcode: z.string().max(20),
  country: z.string().max(100),
});

/** Parses and validates week start day (0-6). Returns 1 if invalid. */
export function parseWeekStartDay(v: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const n = parseInt(v, 10);
  return (n >= 0 && n <= 6 ? n : 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export const regionalSettingsSchema = z.object({
  timezone: z.string().max(100),
  locale: z.string().max(20),
  currency: z.string().length(3),
  dateFormat: z.string().max(50),
  timeFormat: z.enum(["12h", "24h"]),
  weekStartDay: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  numberFormat: z.enum(["1,234.56", "1.234,56", "1 234,56"]),
});

export const financialSettingsSchema = z.object({
  fiscalYearStart: z.number().int().min(1).max(12),
  defaultPaymentTerms: z.number().int().min(0).max(365),
  defaultTaxRate: z.number().min(0).max(100),
});

export const brandingSettingsSchema = z.object({
  logoUrl: z.union([z.string().url(), z.literal("")]),
  primaryColor: z
    .string()
    .transform((v) => v.trim())
    .refine(
      (v) => v === "" || /^#[0-9A-Fa-f]{6}$/.test(v),
      "Must be a valid hex color (e.g. #1F4B99) or empty"
    ),
  secondaryColor: z
    .string()
    .transform((v) => v.trim())
    .refine(
      (v) => v === "" || /^#[0-9A-Fa-f]{6}$/.test(v),
      "Must be a valid hex color (e.g. #1F4B99) or empty"
    ),
  websiteUrl: z.union([z.string().url(), z.literal("")]),
});

/**
 * Extended settings section data types.
 * Used by settings-sections-extended.tsx.
 */
export interface PreferencesSettingsData {
  theme: string;
  accentColor: string;
  density: string;
  notifications_email: boolean;
  notifications_inApp: boolean;
  notifications_sound: boolean;
  tablePageSize: string;
  stickyHeaders: boolean;
  reduceMotion: boolean;
}

export interface EmailSettingsData {
  defaultFromName: string;
  defaultFromEmail: string;
  replyToEmail: string;
  bccEmail: string;
  emailSignature: string;
}

export interface SecuritySettingsData {
  twoFactorEnabled: boolean;
  sessionTimeout: string;
  requirePasswordChange: boolean;
  passwordExpiryDays: string;
}

export interface ApiToken {
  id: string;
  name: string;
  lastUsed: string | null;
  expiresAt: string | null;
  scopes: string[];
}

export interface SettingsCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  childCount: number;
}

export interface TargetsSettingsData {
  salesTarget: number;
  leadTarget: number;
  conversionTarget: number;
  revenueTarget: number;
}

export interface SettingsWinLossReason {
  id: string;
  label: string;
  type: 'win' | 'loss';
  isActive: boolean;
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

export const settingTypeValues = ['string', 'number', 'boolean', 'json'] as const;
export const settingTypeSchema = z.enum(settingTypeValues);
export type SettingType = z.infer<typeof settingTypeSchema>;

export const getSystemSettingsSchema = z.object({
  category: z.string().min(1).max(50).optional(),
});

export const getSystemSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
});

export const setSystemSettingSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.unknown(),
  type: settingTypeSchema.optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export type SetSystemSetting = z.infer<typeof setSystemSettingSchema>;

export const setSystemSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        category: z.string().min(1).max(50),
        key: z.string().min(1).max(100),
        value: z.unknown(),
        type: settingTypeSchema.optional(),
      })
    )
    .min(1)
    .max(50),
});

export type SetSystemSettings = z.infer<typeof setSystemSettingsSchema>;

export const systemSettingSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  key: z.string(),
  value: z.unknown(),
  type: settingTypeSchema,
  description: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SystemSetting = z.infer<typeof systemSettingSchema>;

// ============================================================================
// BUSINESS HOURS
// ============================================================================

export const dayScheduleSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  })
  .refine((data) => data.start < data.end, {
    message: 'End time must be after start time',
  });

export type DaySchedule = z.infer<typeof dayScheduleSchema>;

export const weeklyScheduleSchema = z.object({
  monday: dayScheduleSchema.nullable().optional(),
  tuesday: dayScheduleSchema.nullable().optional(),
  wednesday: dayScheduleSchema.nullable().optional(),
  thursday: dayScheduleSchema.nullable().optional(),
  friday: dayScheduleSchema.nullable().optional(),
  saturday: dayScheduleSchema.nullable().optional(),
  sunday: dayScheduleSchema.nullable().optional(),
});

export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;

export const createBusinessHoursSchema = z.object({
  name: z.string().min(1).max(100),
  weeklySchedule: weeklyScheduleSchema,
  timezone: z.string().max(100).default('Australia/Sydney'),
  isDefault: z.boolean().default(false),
});

export type CreateBusinessHours = z.infer<typeof createBusinessHoursSchema>;

export const updateBusinessHoursSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  weeklySchedule: weeklyScheduleSchema.optional(),
  timezone: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateBusinessHours = z.infer<typeof updateBusinessHoursSchema>;

export const businessHoursSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  weeklySchedule: weeklyScheduleSchema,
  timezone: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BusinessHours = z.infer<typeof businessHoursSchema>;

// ============================================================================
// HOLIDAYS
// ============================================================================

export const createHolidaySchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  isRecurring: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

export type CreateHoliday = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  date: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export type UpdateHoliday = z.infer<typeof updateHolidaySchema>;

export const listHolidaysSchema = paginationSchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  includeRecurring: z.boolean().optional().default(true),
});

export type ListHolidaysQuery = z.infer<typeof listHolidaysSchema>;

export const holidaySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  date: z.string(), // Date string
  isRecurring: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Holiday = z.infer<typeof holidaySchema>;

// ============================================================================
// CUSTOM FIELDS
// ============================================================================

export const customFieldTypeValues = [
  'text',
  'number',
  'date',
  'select',
  'checkbox',
  'textarea',
  'email',
  'url',
  'phone',
  'multiselect',
] as const;
export const customFieldTypeSchema = z.enum(customFieldTypeValues);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const customFieldEntityTypeValues = [
  'customer',
  'contact',
  'order',
  'product',
  'supplier',
  'opportunity',
  'issue',
  'job',
] as const;
export const customFieldEntityTypeSchema = z.enum(customFieldEntityTypeValues);
export type CustomFieldEntityType = z.infer<typeof customFieldEntityTypeSchema>;

/** Audit log entity types for settings/data-exports/documents (used by logAuditEvent) */
export const auditEntityTypeValues = ['setting', 'export', 'custom_field'] as const;
export const auditEntityTypeSchema = z.enum(auditEntityTypeValues);
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>;

export const customFieldOptionSchema = z.object({
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isDefault: z.boolean().optional(),
});

export type CustomFieldOption = z.infer<typeof customFieldOptionSchema>;

export const customFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().max(500).optional(),
  patternMessage: z.string().max(200).optional(),
  errorMessage: z.string().max(200).optional(),
});

export type CustomFieldValidation = z.infer<typeof customFieldValidationSchema>;

export const customFieldMetadataSchema = z.object({
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  showInList: z.boolean().optional(),
  searchable: z.boolean().optional(),
  indexed: z.boolean().optional(),
});

export type CustomFieldMetadata = z.infer<typeof customFieldMetadataSchema>;

export const createCustomFieldSchema = z.object({
  entityType: customFieldEntityTypeSchema,
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'Name must be lowercase with underscores'),
  label: z.string().min(1).max(100),
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema).max(50).optional(),
  isRequired: z.boolean().default(false),
  validationRules: customFieldValidationSchema.optional(),
  defaultValue: z.unknown().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  metadata: customFieldMetadataSchema.optional(),
});

export type CreateCustomField = z.infer<typeof createCustomFieldSchema>;

export const updateCustomFieldSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(100).optional(),
  options: z.array(customFieldOptionSchema).max(50).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  validationRules: customFieldValidationSchema.optional(),
  defaultValue: z.unknown().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  metadata: customFieldMetadataSchema.optional(),
});

export type UpdateCustomField = z.infer<typeof updateCustomFieldSchema>;

export const listCustomFieldsSchema = z.object({
  entityType: customFieldEntityTypeSchema,
  includeInactive: z.boolean().optional().default(false),
});

export type ListCustomFieldsQuery = z.infer<typeof listCustomFieldsSchema>;

export const customFieldSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  entityType: customFieldEntityTypeSchema,
  name: z.string(),
  label: z.string(),
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  validationRules: customFieldValidationSchema,
  defaultValue: z.unknown().nullable(),
  sortOrder: z.number(),
  metadata: customFieldMetadataSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export const setCustomFieldValueSchema = z.object({
  customFieldId: z.string().uuid(),
  entityId: z.string().uuid(),
  value: z.unknown(),
});

export type SetCustomFieldValue = z.infer<typeof setCustomFieldValueSchema>;

export const setCustomFieldValuesSchema = z.object({
  entityType: customFieldEntityTypeSchema,
  entityId: z.string().uuid(),
  values: z.record(z.string(), z.unknown()),
});

export type SetCustomFieldValues = z.infer<typeof setCustomFieldValuesSchema>;

// ============================================================================
// DATA EXPORTS
// ============================================================================
// NOTE: Using "dataExport" prefix to avoid conflicts with activity export schemas

export const dataExportFormatValues = ['csv', 'json', 'xlsx'] as const;
export const dataExportFormatSchema = z.enum(dataExportFormatValues);
export type DataExportFormat = z.infer<typeof dataExportFormatSchema>;

export const dataExportStatusValues = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'expired',
] as const;
export const dataExportStatusSchema = z.enum(dataExportStatusValues);
export type DataExportStatus = z.infer<typeof dataExportStatusSchema>;

export const dataExportableEntityValues = [
  'customers',
  'contacts',
  'orders',
  'products',
  'suppliers',
  'opportunities',
  'issues',
  'activities',
  'audit_logs',
] as const;
export const dataExportableEntitySchema = z.enum(dataExportableEntityValues);
export type DataExportableEntity = z.infer<typeof dataExportableEntitySchema>;

export const createDataExportSchema = z.object({
  entities: z.array(dataExportableEntitySchema).min(1).max(10),
  format: dataExportFormatSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
  dateRange: z
    .object({
      start: z.coerce.date().optional(),
      end: z.coerce.date().optional(),
    })
    .optional(),
  anonymized: z.boolean().optional().default(false),
  includedFields: z.array(z.string()).optional(),
});

export type CreateDataExport = z.infer<typeof createDataExportSchema>;

export const listDataExportsSchema = paginationSchema.extend({
  status: dataExportStatusSchema.optional(),
  format: dataExportFormatSchema.optional(),
});

export type ListDataExportsQuery = z.infer<typeof listDataExportsSchema>;

export const dataExportSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  entities: z.array(z.string()),
  format: dataExportFormatSchema,
  status: dataExportStatusSchema,
  fileUrl: z.string().nullable(),
  fileName: z.string().nullable(),
  fileSize: z.number().nullable(),
  recordCount: z.number().nullable(),
  expiresAt: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type DataExport = z.infer<typeof dataExportSchema>;
