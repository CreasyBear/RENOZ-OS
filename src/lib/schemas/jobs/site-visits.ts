/**
 * Site Visits Zod Schemas
 *
 * Validation schemas for site visit operations.
 *
 * @see drizzle/schema/jobs/site-visits.ts for database schema
 */

import { z } from "zod";

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const siteVisitStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

export const siteVisitTypeSchema = z.enum([
  "assessment",
  "installation",
  "commissioning",
  "service",
  "warranty",
  "inspection",
  "maintenance",
]);

export type SiteVisitStatus = z.infer<typeof siteVisitStatusSchema>;
export type SiteVisitType = z.infer<typeof siteVisitTypeSchema>;

/**
 * Site visit metadata (client-safe mirror of drizzle SiteVisitMetadata).
 * Index signature uses {} for TanStack Start serialization compatibility.
 * @see drizzle/schema/jobs/site-visits.ts
 */
export interface SiteVisitMetadata {
  [key: string]: string | number | boolean | string[] | null | undefined | Record<string, string | number | boolean | null | undefined>;
  weatherConditions?: string;
  accessNotes?: string;
  safetyIncidents?: string[];
  equipmentUsed?: string[];
  checkInMethod?: "manual" | "geofence" | "qr_code" | "nfc";
  checkOutMethod?: "manual" | "geofence" | "qr_code" | "nfc";
  customerSatisfaction?: number;
  customFields?: Record<string, string | number | boolean | null>;
}

// ============================================================================
// LOCATION SCHEMA (GPS coordinates for site visits)
// ============================================================================

export const siteVisitLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  timestamp: z.string().optional(),
});

export type SiteVisitLocationData = z.infer<typeof siteVisitLocationSchema>;

// ============================================================================
// SITE VISIT CRUD SCHEMAS
// ============================================================================

export const siteVisitIdSchema = z.object({
  siteVisitId: z.string().uuid(),
});

export const createSiteVisitSchema = z.object({
  projectId: z.string().uuid(),
  visitType: siteVisitTypeSchema.default("installation"),
  scheduledDate: z.string().date(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().int().min(15).optional(), // minutes
  installerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateSiteVisitSchema = z.object({
  siteVisitId: z.string().uuid(),
  visitType: siteVisitTypeSchema.optional(),
  status: siteVisitStatusSchema.optional(),
  scheduledDate: z.string().date().optional(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().int().min(15).optional(),
  installerId: z.string().uuid().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  actualStartTime: z.string().optional(),
  actualEndTime: z.string().optional(),
  startLocation: siteVisitLocationSchema.optional(),
  completeLocation: siteVisitLocationSchema.optional(),
});

/**
 * Form schema for schedule visit create dialog (cross-project context).
 * Uses z.date() for client-side Date picker; API expects string.
 */
export const scheduleVisitFormSchema = z.object({
  projectId: z.string().optional(),
  visitType: siteVisitTypeSchema,
  scheduledDate: z.date(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().min(15).max(480).optional().nullable(),
  installerId: z.string().optional(),
  notes: z.string().optional(),
});

export const rescheduleSiteVisitSchema = z.object({
  siteVisitId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type RescheduleSiteVisitInput = z.infer<typeof rescheduleSiteVisitSchema>;

export const siteVisitListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledDate", "status"]).default("scheduledDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  projectId: z.string().uuid().optional(),
  installerId: z.string().uuid().optional(),
  status: siteVisitStatusSchema.optional(),
  visitType: siteVisitTypeSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

// ============================================================================
// CHECK-IN/CHECK-OUT SCHEMAS
// ============================================================================

export const checkInSchema = z.object({
  siteVisitId: z.string().uuid(),
  location: siteVisitLocationSchema.optional(),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  siteVisitId: z.string().uuid(),
  location: siteVisitLocationSchema.optional(),
  notes: z.string().optional(),
});

// ============================================================================
// CUSTOMER SIGN-OFF SCHEMAS
// ============================================================================

export const customerSignOffSchema = z.object({
  siteVisitId: z.string().uuid(),
  customerName: z.string().min(1),
  customerRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
});

/** Form schema for customer sign-off dialog */
export const customerSignOffFormSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  confirmed: z.boolean().refine((val) => val === true, {
    message: 'Customer confirmation is required',
  }),
  customerRating: z.number().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
});
export type CustomerSignOffFormData = z.infer<typeof customerSignOffFormSchema>;

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type SiteVisitIdInput = z.infer<typeof siteVisitIdSchema>;
export type ScheduleVisitFormInput = z.infer<typeof scheduleVisitFormSchema>;
export type CreateSiteVisitInput = z.infer<typeof createSiteVisitSchema>;
export type UpdateSiteVisitInput = z.infer<typeof updateSiteVisitSchema>;
export type SiteVisitListQuery = z.infer<typeof siteVisitListQuerySchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CustomerSignOffInput = z.infer<typeof customerSignOffSchema>;

// ============================================================================
// RESPONSE TYPES (for hooks - explicit types matching server function returns)
// ============================================================================

/**
 * A single site visit item with project info (from list endpoint)
 */
export interface SiteVisitItem {
  id: string;
  organizationId: string;
  projectId: string;
  visitNumber: string;
  visitType: SiteVisitType;
  status: SiteVisitStatus;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedDuration: number | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  installerId: string;
  startLocation: SiteVisitLocationData | null;
  completeLocation: SiteVisitLocationData | null;
  notes: string | null;
  internalNotes: string | null;
  signatureUrl: string | null;
  signedByName: string | null;
  signOffToken: string | null;
  signOffTokenExpiresAt: string | null;
  confirmationStatus: string | null;
  confirmationToken: string | null;
  confirmedAt: string | null;
  customerSignOffName: string | null;
  customerSignOffDate: string | null;
  customerSignOffConfirmed: boolean | null;
  customerRating: number | null;
  customerFeedback: string | null;
  metadata: SiteVisitMetadata | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  // Joined fields from list query
  projectTitle: string;
  projectNumber: string;
  // Optional joined project info
  project?: {
    id: string;
    name: string;
  };
}

/**
 * Pagination info for list responses
 */
export interface SiteVisitPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * List response from getSiteVisits
 */
export interface SiteVisitListResult {
  items: SiteVisitItem[];
  pagination: SiteVisitPagination;
}

/**
 * Schedule context type: site visit with project info (same shape as SiteVisitItem).
 * Used for calendar/schedule views where projectTitle and projectNumber are displayed.
 */
export type ScheduleVisit = SiteVisitItem;

/**
 * Minimal result from site visit mutations (create, update, reschedule, check-in, check-out).
 * Used by hooks for cache invalidation. Server returns full row; hooks need id, projectId, installerId.
 */
export interface SiteVisitMutationResult {
  id: string;
  projectId: string;
  installerId: string | null;
}

/**
 * Result from recordCustomerSignOff. Used by useCustomerSignOff for cache invalidation.
 */
export interface CustomerSignOffResult {
  id: string;
  projectId: string;
}

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Site visit record.
 * Client-safe version of SiteVisit from drizzle/schema.
 *
 * @see drizzle/schema/jobs/site-visits.ts for database definition
 */
export interface SiteVisit {
  id: string;
  organizationId: string;
  projectId: string;
  visitNumber: string;
  visitType: SiteVisitType;
  status: SiteVisitStatus;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedDuration: number | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  installerId: string;
  startLocation: SiteVisitLocationData | null;
  completeLocation: SiteVisitLocationData | null;
  notes: string | null;
  internalNotes: string | null;
  signatureUrl: string | null;
  signedByName: string | null;
  signOffToken: string | null;
  signOffTokenExpiresAt: string | null;
  confirmationStatus: string | null;
  confirmationToken: string | null;
  confirmedAt: string | null;
  customerSignOffName: string | null;
  customerSignOffDate: string | null;
  customerSignOffConfirmed: boolean | null;
  customerRating: number | null;
  customerFeedback: string | null;
  metadata: SiteVisitMetadata | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  updatedBy: string | null;
}
