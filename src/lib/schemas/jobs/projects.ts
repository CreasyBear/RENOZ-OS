/**
 * Projects Zod Schemas
 *
 * Validation schemas for project domain operations.
 *
 * @see drizzle/schema/jobs/projects.ts for database schema
 */

import { z } from "zod";

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const projectStatusSchema = z.enum([
  "quoting",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
]);

export const projectTypeSchema = z.enum([
  "solar",
  "battery",
  "solar_battery",
  "service",
  "warranty",
  "inspection",
  "commissioning",
]);

export const projectPrioritySchema = z.enum([
  "urgent",
  "high",
  "medium",
  "low",
]);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectPriority = z.infer<typeof projectPrioritySchema>;

// ============================================================================
// ADDRESS SCHEMA
// ============================================================================

export const siteAddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default("Australia"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

export type SiteAddress = z.infer<typeof siteAddressSchema>;

// ============================================================================
// SCOPE & FEATURES SCHEMAS
// ============================================================================

export const projectScopeSchema = z.object({
  inScope: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
});

export const projectKeyFeaturesSchema = z.object({
  p0: z.array(z.string()).default([]), // Must have
  p1: z.array(z.string()).default([]), // Should have
  p2: z.array(z.string()).default([]), // Nice to have
});

export type ProjectScope = z.infer<typeof projectScopeSchema>;
export type ProjectKeyFeatures = z.infer<typeof projectKeyFeaturesSchema>;

// ============================================================================
// PROJECT CRUD SCHEMAS
// ============================================================================

export const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectType: projectTypeSchema.default("solar_battery"),
  priority: projectPrioritySchema.default("medium"),
  customerId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  siteAddress: siteAddressSchema,
  scope: projectScopeSchema.default({ inScope: [], outOfScope: [] }),
  outcomes: z.array(z.string()).default([]),
  keyFeatures: projectKeyFeaturesSchema.default({ p0: [], p1: [], p2: [] }),
  startDate: z.string().date().optional(),
  targetCompletionDate: z.string().date().optional(),
  estimatedTotalValue: z.number().positive().optional(),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  projectType: projectTypeSchema.optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  siteAddress: siteAddressSchema.optional(),
  scope: projectScopeSchema.optional(),
  outcomes: z.array(z.string()).optional(),
  keyFeatures: projectKeyFeaturesSchema.optional(),
  startDate: z.string().date().optional(),
  targetCompletionDate: z.string().date().optional(),
  actualCompletionDate: z.string().date().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  estimatedTotalValue: z.number().positive().optional(),
});

export const projectListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "title", "status", "priority", "targetCompletionDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: projectStatusSchema.optional(),
  projectType: projectTypeSchema.optional(),
  priority: projectPrioritySchema.optional(),
  customerId: z.string().uuid().optional(),
});

export const projectCursorQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: projectStatusSchema.optional(),
  projectType: projectTypeSchema.optional(),
  priority: projectPrioritySchema.optional(),
  customerId: z.string().uuid().optional(),
});

// ============================================================================
// PROJECT COMPLETION SCHEMA
// ============================================================================

export const completeProjectSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["completed", "cancelled", "on_hold"]),
  actualCompletionDate: z.string().date(),
  actualTotalCost: z.number().positive().optional(),
  customerSatisfactionRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
  generateHandoverPack: z.boolean().default(true),
});

export type CompleteProjectInput = z.infer<typeof completeProjectSchema>;

// ============================================================================
// PROJECT MEMBER SCHEMAS
// ============================================================================

export const projectMemberRoleSchema = z.enum(["owner", "manager", "member"]);

export const addProjectMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: projectMemberRoleSchema.default("member"),
});

export const removeProjectMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type ProjectMemberRole = z.infer<typeof projectMemberRoleSchema>;

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type ProjectIdInput = z.infer<typeof projectIdSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type ProjectCursorQuery = z.infer<typeof projectCursorQuerySchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberSchema>;
