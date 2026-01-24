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

import { z } from 'zod';
import { paginationSchema } from '../_shared/patterns';

// ============================================================================
// ORGANIZATION SETTINGS
// ============================================================================
// NOTE: Core organization schemas (Organization, OrganizationSettings, etc.)
// are defined in ./auth.ts to avoid duplication. This file contains only
// settings-domain specific schemas.

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
