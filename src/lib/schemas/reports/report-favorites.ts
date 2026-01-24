/**
 * Report Favorites Validation Schemas
 *
 * Zod schemas for user report favorites CRUD operations.
 *
 * @see drizzle/schema/reports/report-favorites.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const reportTypeValues = ['scheduled', 'custom', 'dashboard'] as const;

export const reportTypeSchema = z.enum(reportTypeValues);

export type ReportType = z.infer<typeof reportTypeSchema>;

// ============================================================================
// CREATE REPORT FAVORITE
// ============================================================================

export const createReportFavoriteSchema = z.object({
  reportType: reportTypeSchema,
  reportId: z.string().uuid().optional(), // Optional for dashboard favorites
});

export type CreateReportFavoriteInput = z.infer<typeof createReportFavoriteSchema>;

// ============================================================================
// LIST REPORT FAVORITES
// ============================================================================

export const listReportFavoritesSchema = z.object({
  reportType: reportTypeSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export type ListReportFavoritesInput = z.infer<typeof listReportFavoritesSchema>;

// ============================================================================
// DELETE REPORT FAVORITE
// ============================================================================

export const deleteReportFavoriteSchema = z.object({
  reportType: reportTypeSchema,
  reportId: z.string().uuid().optional(),
});

export type DeleteReportFavoriteInput = z.infer<typeof deleteReportFavoriteSchema>;

// ============================================================================
// REPORT FAVORITE OUTPUT
// ============================================================================

export const reportFavoriteSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  reportType: reportTypeSchema,
  reportId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export type ReportFavorite = z.infer<typeof reportFavoriteSchema>;

// ============================================================================
// REPORT FAVORITE WITH DETAILS
// ============================================================================

export const reportFavoriteWithDetailsSchema = reportFavoriteSchema.extend({
  reportName: z.string().optional(), // From the referenced report
  reportDescription: z.string().nullable().optional(),
});

export type ReportFavoriteWithDetails = z.infer<typeof reportFavoriteWithDetailsSchema>;

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkDeleteReportFavoritesSchema = z.object({
  favorites: z.array(deleteReportFavoriteSchema).min(1).max(50),
});

export type BulkDeleteReportFavoritesInput = z.infer<typeof bulkDeleteReportFavoritesSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface ReportFavoritesFiltersState {
  reportType: ReportType | null;
}

export const defaultReportFavoritesFilters: ReportFavoritesFiltersState = {
  reportType: null,
};
