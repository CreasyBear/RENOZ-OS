/**
 * Project Detail Schema
 *
 * Canonical type definitions for project detail view data.
 * Single source of truth - all consumers should import from here.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.4
 * @see STANDARDS.md §4 Type Definitions
 */

import { z } from 'zod';
import type { ProjectStatus, ProjectPriority } from './projects';

// ============================================================================
// TEAM MEMBER
// ============================================================================

export const projectTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.string().nullable().optional(),
});

export type ProjectTeamMember = z.infer<typeof projectTeamMemberSchema>;

/**
 * Project Member (nested user structure)
 * Used in project detail view components
 */
export interface ProjectMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string;
  };
  role: 'owner' | 'manager' | 'member';
}

// ============================================================================
// SITE ADDRESS
// ============================================================================

export const siteAddressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
}).nullable();

export type SiteAddress = z.infer<typeof siteAddressSchema>;

// ============================================================================
// PROJECT SCOPE
// ============================================================================

export const projectScopeSchema = z.object({
  inScope: z.array(z.string()),
  outOfScope: z.array(z.string()),
}).nullable();

export type ProjectScope = z.infer<typeof projectScopeSchema>;

// ============================================================================
// KEY FEATURES
// ============================================================================

export const keyFeaturesSchema = z.object({
  p0: z.array(z.string()),
  p1: z.array(z.string()),
  p2: z.array(z.string()),
}).nullable();

export type KeyFeatures = z.infer<typeof keyFeaturesSchema>;

// ============================================================================
// CUSTOMER SUMMARY
// ============================================================================

export const customerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  companyName: z.string().optional(),
}).nullable();

export type CustomerSummary = z.infer<typeof customerSummarySchema>;

// ============================================================================
// PROJECT DETAIL DATA
// ============================================================================

/**
 * Canonical ProjectDetailData type.
 *
 * Used by:
 * - useProjectDetailData hook (data transformation)
 * - useProjectDetail hook (composite)
 * - ProjectDetailView component (presenter)
 * - ProjectDetailContainer component (container)
 */
export const projectDetailDataSchema = z.object({
  // Identity
  id: z.string().uuid(),
  title: z.string(),
  projectNumber: z.string(),
  description: z.string().nullable(),

  // Status & Progress
  status: z.enum(['quoting', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  progressPercent: z.number().min(0).max(100).default(0),
  projectType: z.string(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),

  // Dates
  startDate: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
  actualCompletionDate: z.string().nullable(),

  // Financial
  estimatedTotalValue: z.union([z.string(), z.number()]).nullable(),
  actualTotalCost: z.union([z.string(), z.number()]).nullable(),

  // Location
  siteAddress: siteAddressSchema,

  // Scope & Features
  scope: projectScopeSchema,
  outcomes: z.array(z.string()).nullable(),
  keyFeatures: keyFeaturesSchema,

  // Relations
  customer: customerSummarySchema,
  members: z.array(projectTeamMemberSchema),
  /** Order ID for cross-entity navigation (WORKFLOW-CONTINUITY P3) */
  orderId: z.string().uuid().nullable().optional(),

  // Audit
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  createdByName: z.string().nullable().optional(),
  updatedByName: z.string().nullable().optional(),
  version: z.number().optional(),
});

export type ProjectDetailData = z.infer<typeof projectDetailDataSchema>;

// ============================================================================
// DERIVED STATE TYPES
// ============================================================================

export type ScheduleStatus = 'on-track' | 'at-risk' | 'overdue';
export type BudgetStatus = 'under' | 'on-target' | 'over';

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isProjectDetailData(data: unknown): data is ProjectDetailData {
  return projectDetailDataSchema.safeParse(data).success;
}

// ============================================================================
// PROJECT TAB DATA (Tab-specific view model - SCHEMA-TRACE.md §4)
// ============================================================================

/**
 * Project shape for tab components (Overview, Workstreams, Visits, etc.).
 * Uses address format: street/postalCode (tab UI) vs addressLine1/postcode (detail).
 */
export interface ProjectTabData {
  id: string;
  title: string;
  projectNumber: string;
  description: string | null;
  status: 'quoting' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  progressPercent: number;
  projectType: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  estimatedTotalValue: string | number | null;
  actualTotalCost: string | number | null;
  /** Order ID for Import from Order (BOM tab) */
  orderId?: string | null;
  siteAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  scope: ProjectScope;
  outcomes: string[] | null;
  keyFeatures: KeyFeatures;
}

/**
 * Site visit shape for tab components (Overview, Visits).
 * Enriched with installerName for display; installerId for cross-entity Link.
 */
export interface ProjectTabVisit {
  id: string;
  visitNumber: string;
  visitType: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string | null;
  installerId?: string | null;
  installerName?: string;
}

/**
 * Normalize SiteVisitItem (or enriched variant) to ProjectTabVisit at boundary.
 * Use in container when passing to tab renderers. Per SCHEMA-TRACE §8.
 */
export function toProjectTabVisit(
  v: { id: string; visitNumber: string; visitType: string; status: string; scheduledDate: string; scheduledTime?: string | null; installerId?: string | null; installerName?: string }
): ProjectTabVisit {
  return {
    id: v.id,
    visitNumber: v.visitNumber,
    visitType: v.visitType,
    status: v.status,
    scheduledDate: v.scheduledDate,
    scheduledTime: v.scheduledTime ?? null,
    installerId: v.installerId ?? null,
    installerName: v.installerName,
  };
}

/**
 * Timeline task for Overview tab Gantt.
 */
export interface ProjectTimelineTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  assignee?: { name: string; avatar?: string };
  workstreamName?: string;
  /** When from a site visit, enables navigation to visit detail */
  visitId?: string;
  /** When from a job task, enables navigation to task */
  isTask?: boolean;
}

/**
 * Map job task status to Gantt status.
 */
function toGanttStatus(
  status: string
): 'todo' | 'in_progress' | 'completed' | 'blocked' {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    default:
      return 'todo';
  }
}

/**
 * Convert TaskResponse[] to ProjectTimelineTask[] for Gantt.
 * Uses dueDate for start/end; falls back to today if null.
 */
export function tasksToProjectTimelineTasks(
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate?: Date | string | null;
    assignee?: { name: string | null } | null;
    workstreamId?: string | null;
  }>,
  workstreamNames?: Record<string, string>
): ProjectTimelineTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks
    .filter((t) => t.dueDate != null)
    .map((t) => {
      const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate as string);
      d.setHours(0, 0, 0, 0);
      return {
        id: t.id,
        title: t.title,
        startDate: d,
        endDate: d,
        status: toGanttStatus(t.status),
        progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
        assignee: t.assignee?.name ? { name: t.assignee.name } : undefined,
        workstreamName: (t.workstreamId && workstreamNames?.[t.workstreamId]) ?? undefined,
        isTask: true,
      };
    });
}

/**
 * Convert ProjectTabVisit[] or SiteVisitItem[] to ProjectTimelineTask[] for Gantt.
 * Uses scheduledDate; same-day visits get 1-day bar width for visibility.
 * Title includes visitType when available (e.g. "Install - V001").
 */
export function visitsToProjectTimelineTasks(
  visits: Array<{
    id: string;
    visitNumber: string;
    visitType?: string;
    status: string;
    scheduledDate: string;
    installerName?: string;
  }>
): ProjectTimelineTask[] {
  return visits.map((v) => {
    const start = new Date(v.scheduledDate);
    start.setHours(0, 0, 0, 0);
    const title = v.visitType
      ? `${v.visitType} - ${v.visitNumber}`
      : v.visitNumber;
    return {
      id: v.id,
      title,
      startDate: start,
      endDate: new Date(start),
      status:
        v.status === 'completed'
          ? 'completed'
          : v.status === 'in_progress'
            ? 'in_progress'
            : 'todo',
      progress: v.status === 'completed' ? 100 : v.status === 'in_progress' ? 50 : 0,
      assignee: v.installerName ? { name: v.installerName } : undefined,
      visitId: v.id,
    };
  });
}

/**
 * Transform ProjectDetailData to tab format.
 * Address: addressLine1/postcode → street/postalCode.
 * Single source for tab project shape - eliminates duplication.
 */
export function transformProjectForTabs(project: ProjectDetailData): ProjectTabData {
  const addr = project.siteAddress;
  const street = addr
    ? [addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ') || ''
    : '';
  const postalCode = addr?.postcode ?? '';

  return {
    id: project.id,
    title: project.title,
    projectNumber: project.projectNumber,
    description: project.description,
    status: project.status,
    progressPercent: project.progressPercent,
    projectType: project.projectType,
    priority: project.priority,
    startDate: project.startDate,
    targetCompletionDate: project.targetCompletionDate,
    actualCompletionDate: project.actualCompletionDate,
    estimatedTotalValue: project.estimatedTotalValue,
    actualTotalCost: project.actualTotalCost,
    orderId: project.orderId ?? null,
    siteAddress: addr
      ? {
          street,
          city: addr.city || '',
          state: addr.state || '',
          postalCode,
          country: addr.country || '',
        }
      : null,
    scope: project.scope,
    outcomes: project.outcomes,
    keyFeatures: project.keyFeatures,
  };
}

// ============================================================================
// PROJECT EDIT FORM (Schema-through pattern: SCHEMA-TRACE.md §4)
// ============================================================================

/**
 * Shape for project edit form.
 * Uses update schema address format (street, postalCode).
 * Single source of truth - import from schema, not component.
 */
export interface ProjectEditFormInput {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  projectType: string;
  priority: ProjectPriority;
  siteAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  startDate: string | null;
  targetCompletionDate: string | null;
  estimatedTotalValue: string | number | null;
  progressPercent: number;
  projectNumber: string;
}

/**
 * Transform ProjectDetailData to edit form input.
 * Normalizes address: addressLine1/postcode → street/postalCode.
 * Call in container before passing to ProjectEditDialog.
 */
export function toProjectEditFormInput(project: ProjectDetailData): ProjectEditFormInput {
  const addr = project.siteAddress;
  const street = addr
    ? [addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ') || ''
    : '';
  const postalCode = addr?.postcode ?? '';

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    projectType: project.projectType,
    priority: project.priority,
    siteAddress: {
      street: street || '',
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      postalCode: postalCode || '',
      country: addr?.country ?? 'Australia',
    },
    startDate: project.startDate,
    targetCompletionDate: project.targetCompletionDate,
    estimatedTotalValue: project.estimatedTotalValue,
    progressPercent: project.progressPercent,
    projectNumber: project.projectNumber,
  };
}

// ============================================================================
// TRANSFORMATION HELPERS
// ============================================================================

/**
 * Raw member shape from server (getProject returns members with nested user).
 */
const rawMemberSchema = z.object({
  user: z
    .object({
      id: z.string(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      avatarUrl: z.string().optional().nullable(),
    })
    .optional(),
  role: z.string().optional().nullable(),
});

/**
 * Schema for raw project data from getProject (db.query.projects.findFirst with relations).
 * Transforms server shape to ProjectDetailData.
 */
const rawProjectDetailInputSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    projectNumber: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    progressPercent: z.number().optional(),
    projectType: z.string(),
    priority: z.string(),
    startDate: z.string().nullable().optional(),
    targetCompletionDate: z.string().nullable().optional(),
    actualCompletionDate: z.string().nullable().optional(),
    estimatedTotalValue: z.union([z.string(), z.number()]).nullable().optional(),
    actualTotalCost: z.union([z.string(), z.number()]).nullable().optional(),
    siteAddress: siteAddressSchema.optional(),
    scope: projectScopeSchema.optional(),
    outcomes: z.array(z.string()).nullable().optional(),
    keyFeatures: keyFeaturesSchema.optional(),
    customer: customerSummarySchema.optional(),
    orderId: z.string().nullable().optional(),
    members: z.array(rawMemberSchema).optional().default([]),
    createdAt: z.union([z.string(), z.date()]),
    updatedAt: z.union([z.string(), z.date()]).nullable().optional(),
    /** DB returns UUID string; enriched queries may return { name } object */
    createdBy: z
      .union([
        z.string(),
        z.object({ name: z.string().optional() }).nullable(),
      ])
      .nullable()
      .optional(),
    updatedBy: z
      .union([
        z.string(),
        z.object({ name: z.string().optional() }).nullable(),
      ])
      .nullable()
      .optional(),
    version: z.number().optional(),
  })
  .transform((r) => ({
    id: r.id,
    title: r.title,
    projectNumber: r.projectNumber,
    description: r.description ?? null,
    status: r.status as ProjectStatus,
    progressPercent: r.progressPercent ?? 0,
    projectType: r.projectType,
    priority: r.priority as ProjectPriority,
    startDate: r.startDate ?? null,
    targetCompletionDate: r.targetCompletionDate ?? null,
    actualCompletionDate: r.actualCompletionDate ?? null,
    estimatedTotalValue: r.estimatedTotalValue ?? null,
    actualTotalCost: r.actualTotalCost ?? null,
    siteAddress: r.siteAddress ?? null,
    scope: r.scope ?? null,
    outcomes: r.outcomes ?? null,
    keyFeatures: r.keyFeatures ?? null,
    customer: r.customer ?? null,
    orderId: r.orderId ?? null,
    members: r.members.map((m) => ({
      id: m.user?.id ?? '',
      name: m.user?.name ?? m.user?.email ?? 'Unknown',
      email: m.user?.email ?? null,
      avatarUrl: m.user?.avatarUrl ?? null,
      role: m.role ?? null,
    })),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString(),
    updatedAt: r.updatedAt ? (typeof r.updatedAt === 'string' ? r.updatedAt : r.updatedAt.toISOString()) : null,
    createdByName: typeof r.createdBy === 'object' && r.createdBy?.name ? r.createdBy.name : null,
    updatedByName: typeof r.updatedBy === 'object' && r.updatedBy?.name ? r.updatedBy.name : null,
    version: r.version,
  }));

/**
 * Transform raw project query data to ProjectDetailData.
 * Uses Zod for validation and transformation (SCHEMA-TRACE.md).
 */
export function transformToProjectDetailData(raw: unknown): ProjectDetailData {
  const parsed = rawProjectDetailInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid project detail data: ${parsed.error.message}`);
  }
  return projectDetailDataSchema.parse(parsed.data);
}
