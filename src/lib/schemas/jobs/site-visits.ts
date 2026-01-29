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

// ============================================================================
// LOCATION SCHEMA
// ============================================================================

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  timestamp: z.string().optional(),
});

export type LocationData = z.infer<typeof locationSchema>;

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
  startLocation: locationSchema.optional(),
  completeLocation: locationSchema.optional(),
});

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
  location: locationSchema.optional(),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  siteVisitId: z.string().uuid(),
  location: locationSchema.optional(),
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

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type SiteVisitIdInput = z.infer<typeof siteVisitIdSchema>;
export type CreateSiteVisitInput = z.infer<typeof createSiteVisitSchema>;
export type UpdateSiteVisitInput = z.infer<typeof updateSiteVisitSchema>;
export type SiteVisitListQuery = z.infer<typeof siteVisitListQuerySchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CustomerSignOffInput = z.infer<typeof customerSignOffSchema>;
