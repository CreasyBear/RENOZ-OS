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

// ============================================================================
// PROJECT CREATE FORM SCHEMA (UI → API transform)
// ============================================================================

/** Form schema for project create dialog. Uses text fields for scope/outcomes; transforms to arrays on submit. */
export const createProjectFormSchema = z.object({
  templateId: z.union([z.string().uuid(), z.literal('')]).optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  projectType: projectTypeSchema,
  priority: projectPrioritySchema,
  siteAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string(),
  }),
  scopeInScope: z.string().optional(),
  scopeOutOfScope: z.string().optional(),
  outcomesText: z.string().optional(),
  startDate: z.date().optional().nullable(),
  targetCompletionDate: z.date().optional().nullable(),
  estimatedTotalValue: z.number().min(0).optional().nullable(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

/** Parses newline-separated text into trimmed non-empty array */
function parseLines(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Transforms form values to createProjectSchema shape for API */
export function transformCreateProjectFormToApi(
  values: CreateProjectFormValues
): z.infer<typeof createProjectSchema> {
  return {
    title: values.title,
    description: values.description,
    projectType: values.projectType,
    priority: values.priority,
    customerId: values.customerId,
    siteAddress: values.siteAddress,
    scope: {
      inScope: parseLines(values.scopeInScope),
      outOfScope: parseLines(values.scopeOutOfScope),
    },
    outcomes: parseLines(values.outcomesText),
    keyFeatures: { p0: [], p1: [], p2: [] },
    startDate: values.startDate ? values.startDate.toISOString().slice(0, 10) : undefined,
    targetCompletionDate: values.targetCompletionDate
      ? values.targetCompletionDate.toISOString().slice(0, 10)
      : undefined,
    estimatedTotalValue: values.estimatedTotalValue ?? undefined,
  };
}

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
// PROJECT COMPLETION SCHEMAS
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

/**
 * Completion validation data - used to block "completed" status when tasks/BOM incomplete.
 * @see docs/pre_deployment_audit/2026-02-04-projects-remediation-plan.md §12
 */
export interface CompletionValidation {
  completedTasks: number;
  totalTasks: number;
  installedBomItems: number;
  totalBomItems: number;
}

/**
 * Form schema for project completion dialog.
 * Separated from completeProjectSchema for UI-specific fields (overrideReason).
 */
export const projectCompletionFormSchema = z.object({
  status: z.enum(["completed", "cancelled", "on_hold"]),
  actualCompletionDate: z.string().date(),
  actualTotalCost: z.number().positive().optional(),
  customerSatisfactionRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
  /** Required when completion validation blocks - UI gate only, not sent to server */
  overrideReason: z.string().optional(),
  generateHandoverPack: z.boolean().default(true),
});

export type ProjectCompletionFormValues = z.infer<typeof projectCompletionFormSchema>;

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

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Pagination info for list responses
 */
export interface ProjectPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Project item from list API (may include customer when joined)
 */
export interface ProjectListItem extends Project {
  customer?: { id: string; name: string } | null;
}

/**
 * List response from getProjects
 */
export interface ProjectListResponse {
  items: ProjectListItem[];
  pagination: ProjectPagination;
}

/**
 * Projects dashboard view mode
 */
export type ProjectViewMode = 'grid' | 'list';

/**
 * Projects dashboard date filter
 */
export type ProjectDateFilter = 'all' | 'overdue' | 'today' | 'this-week' | 'this-month';

/**
 * Projects list URL search params (DOMAIN-LANDING Zone 2: URL-synced filters)
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */
export const projectsSearchSchema = z.object({
  search: z.string().optional().default(''),
  installerId: z.string().uuid().optional(),
  status: z
    .enum(['all', 'quoting', 'approved', 'in_progress', 'completed', 'on_hold', 'cancelled'])
    .optional()
    .default('all'),
  priority: z
    .enum(['all', 'urgent', 'high', 'medium', 'low'])
    .optional()
    .default('all'),
  dateFilter: z
    .enum(['all', 'overdue', 'today', 'this-week', 'this-month'])
    .optional()
    .default('all'),
  viewMode: z.enum(['grid', 'list']).optional().default('grid'),
});

export type ProjectsSearchParams = z.infer<typeof projectsSearchSchema>;

/**
 * Triage item for Projects domain landing (DOMAIN-LANDING Zone 3).
 * variant distinguishes critical sub-types for icon selection.
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */
export interface ProjectsTriageItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  /** Critical sub-type: 'budget' = DollarSign, 'overdue' = AlertTriangle */
  variant?: 'budget' | 'overdue';
  title: string;
  description: string;
  projectId: string;
  projectNumber: string;
}

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Project metadata interface.
 * Client-safe version from drizzle/schema.
 */
export interface ProjectMetadata {
  salesRepId?: string;
  quoteNumber?: string;
  contractSignedDate?: string;
  estimatedSavings?: {
    annualKwh: number;
    annualCostSavings: number;
    paybackPeriodYears: number;
  };
  systemSpecs?: {
    panelCount?: number;
    panelCapacityW?: number;
    batteryCapacityKwh?: number;
    inverterCapacityKw?: number;
  };
  customFields?: Record<string, string | number | boolean | null>;
}

/**
 * Raw project shape from getProject (db.query.projects.findFirst).
 * Used as input to transformToProjectDetailData.
 */
export type GetProjectRawInput = Record<string, unknown>;

/**
 * Project entity.
 * Client-safe version of Project from drizzle/schema.
 *
 * @see drizzle/schema/jobs/projects.ts for database definition
 */
export interface Project {
  id: string;
  organizationId: string;
  projectNumber: string;
  title: string;
  description: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  customerId: string;
  orderId: string | null;
  siteAddress: SiteAddress;
  scope: ProjectScope | null;
  outcomes: string[] | null;
  keyFeatures: ProjectKeyFeatures | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  progressPercent: number;
  estimatedTotalValue: string | null;
  actualTotalCost: string | null;
  metadata: ProjectMetadata | null;
  customerSatisfactionRating: number | null;
  customerFeedback: string | null;
  handoverPackUrl: string | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  updatedBy: string | null;
}
