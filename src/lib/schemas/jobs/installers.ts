/**
 * Installers Zod Schemas
 *
 * Validation schemas for installer management operations.
 *
 * @see drizzle/schema/jobs/installers.ts for database schema
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const installerStatusSchema = z.enum([
  'active',
  'busy',
  'away',
  'suspended',
  'inactive',
]);

export const certificationTypeSchema = z.enum([
  'solar_accredited',
  'electrical_license',
  'battery_certified',
  'roofing_certified',
  'first_aid',
  'working_at_heights',
]);

export const installerSkillSchema = z.enum([
  'solar_panels',
  'battery_systems',
  'electrical_work',
  'roof_work',
  'conduit_install',
  'commissioning',
  'diagnostics',
  'customer_training',
]);

export const vehicleTypeSchema = z.enum([
  'none',
  'ute',
  'van',
  'truck',
  'trailer',
]);

export type InstallerStatus = z.infer<typeof installerStatusSchema>;
export type CertificationType = z.infer<typeof certificationTypeSchema>;
export type InstallerSkill = z.infer<typeof installerSkillSchema>;
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

// ============================================================================
// WORKING HOURS SCHEMA
// ============================================================================

const dayScheduleSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  working: z.boolean(),
});

export const workingHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

export type WorkingHours = z.infer<typeof workingHoursSchema>;

// ============================================================================
// INSTALLER PROFILE SCHEMAS
// ============================================================================

export const createInstallerProfileSchema = z.object({
  userId: z.string().uuid(),
  status: installerStatusSchema.default('active'),
  yearsExperience: z.number().int().min(0).default(0),
  vehicleType: vehicleTypeSchema.default('none'),
  vehicleReg: z.string().max(50).optional(),
  equipment: z.array(z.string()).default([]),
  maxJobsPerDay: z.number().int().min(1).max(10).default(2),
  maxTravelKm: z.number().int().min(1).optional(),
  workingHours: workingHoursSchema.optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const updateInstallerProfileSchema = z.object({
  id: z.string().uuid(),
  status: installerStatusSchema.optional(),
  yearsExperience: z.number().int().min(0).optional(),
  vehicleType: vehicleTypeSchema.optional(),
  vehicleReg: z.string().max(50).optional(),
  equipment: z.array(z.string()).optional(),
  maxJobsPerDay: z.number().int().min(1).max(10).optional(),
  maxTravelKm: z.number().int().min(1).optional().nullable(),
  workingHours: workingHoursSchema.optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export type CreateInstallerProfileInput = z.infer<typeof createInstallerProfileSchema>;
export type UpdateInstallerProfileInput = z.infer<typeof updateInstallerProfileSchema>;

// ============================================================================
// CERTIFICATION SCHEMAS
// ============================================================================

export const createCertificationSchema = z.object({
  installerId: z.string().uuid(),
  certificationType: certificationTypeSchema,
  licenseNumber: z.string().max(255).optional(),
  issuingAuthority: z.string().max(255).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  documentUrl: z.string().url().optional(),
});

export const updateCertificationSchema = z.object({
  id: z.string().uuid(),
  certificationType: certificationTypeSchema.optional(),
  licenseNumber: z.string().max(255).optional(),
  issuingAuthority: z.string().max(255).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  isVerified: z.boolean().optional(),
  documentUrl: z.string().url().optional().nullable(),
});

export const verifyCertificationSchema = z.object({
  id: z.string().uuid(),
  isVerified: z.boolean(),
});

export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;

// ============================================================================
// SKILL SCHEMAS
// ============================================================================

export const createSkillSchema = z.object({
  installerId: z.string().uuid(),
  skill: installerSkillSchema,
  proficiencyLevel: z.number().int().min(1).max(5).default(3),
  yearsExperience: z.number().int().min(0).default(0),
  projectsCompleted: z.number().int().min(0).default(0),
});

export const updateSkillSchema = z.object({
  id: z.string().uuid(),
  proficiencyLevel: z.number().int().min(1).max(5).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  projectsCompleted: z.number().int().min(0).optional(),
  isVerified: z.boolean().optional(),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

// ============================================================================
// TERRITORY SCHEMAS
// ============================================================================

export const createTerritorySchema = z.object({
  installerId: z.string().uuid(),
  postcode: z.string().min(1).max(20),
  suburb: z.string().max(255).optional(),
  state: z.string().max(50).optional(),
  priority: z.number().int().min(1).default(1),
});

export const updateTerritorySchema = z.object({
  id: z.string().uuid(),
  postcode: z.string().min(1).max(20).optional(),
  suburb: z.string().max(255).optional(),
  state: z.string().max(50).optional(),
  priority: z.number().int().min(1).optional(),
});

export type CreateTerritoryInput = z.infer<typeof createTerritorySchema>;
export type UpdateTerritoryInput = z.infer<typeof updateTerritorySchema>;

// ============================================================================
// BLOCKOUT SCHEMAS
// ============================================================================

export const createBlockoutSchema = z.object({
  installerId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  reason: z.string().max(255).optional(),
  blockoutType: z.enum(['vacation', 'sick', 'training', 'other']).optional(),
});

export const updateBlockoutSchema = z.object({
  id: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().max(255).optional(),
  blockoutType: z.enum(['vacation', 'sick', 'training', 'other']).optional(),
});

export type CreateBlockoutInput = z.infer<typeof createBlockoutSchema>;
export type UpdateBlockoutInput = z.infer<typeof updateBlockoutSchema>;

// ============================================================================
// LIST QUERY SCHEMAS
// ============================================================================

export const installerListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'status', 'yearsExperience', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  status: installerStatusSchema.optional(),
  skills: z.array(installerSkillSchema).optional(),
  postcode: z.string().optional(),
  availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  availableTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type InstallerListQuery = z.infer<typeof installerListQuerySchema>;

// ============================================================================
// AVAILABILITY CHECK SCHEMAS
// ============================================================================

export const checkAvailabilitySchema = z.object({
  installerId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

export const suggestInstallersSchema = z.object({
  postcode: z.string(),
  requiredSkills: z.array(installerSkillSchema).optional(),
  preferredSkills: z.array(installerSkillSchema).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type SuggestInstallersInput = z.infer<typeof suggestInstallersSchema>;

// ============================================================================
// INSTALLER ID PARAMS
// ============================================================================

export const installerIdSchema = z.object({
  id: z.string().uuid(),
});

export const certificationIdSchema = z.object({
  id: z.string().uuid(),
});

export const skillIdSchema = z.object({
  id: z.string().uuid(),
});

export const territoryIdSchema = z.object({
  id: z.string().uuid(),
});

export const blockoutIdSchema = z.object({
  id: z.string().uuid(),
});
