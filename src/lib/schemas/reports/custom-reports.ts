/**
 * Custom Reports Validation Schemas
 *
 * Zod schemas for user-defined reports CRUD operations.
 *
 * @see drizzle/schema/reports/custom-reports.ts
 */

import { z } from 'zod';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ReportDefinition {
  columns: string[];
  filters?: Record<string, string | number | boolean>;
  groupBy?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ReportDefinitionInput {
  columns: string[];
  filters?: Record<string, string | number | boolean>;
  groupBy?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// ============================================================================
// CREATE CUSTOM REPORT
// ============================================================================

export const reportDefinitionSchema = z.object({
  columns: z.array(z.string()).min(1, 'At least one column is required'),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const createCustomReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  isShared: z.boolean().default(false),
  definition: reportDefinitionSchema,
});

export type CreateCustomReportInput = z.infer<typeof createCustomReportSchema>;

// ============================================================================
// UPDATE CUSTOM REPORT
// ============================================================================

export const updateCustomReportSchema = createCustomReportSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateCustomReportInput = z.infer<typeof updateCustomReportSchema>;

// ============================================================================
// LIST CUSTOM REPORTS
// ============================================================================

export const listCustomReportsSchema = z.object({
  isShared: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type ListCustomReportsInput = z.infer<typeof listCustomReportsSchema>;

// ============================================================================
// GET CUSTOM REPORT
// ============================================================================

export const getCustomReportSchema = z.object({
  id: z.string().uuid(),
});

export type GetCustomReportInput = z.infer<typeof getCustomReportSchema>;

// ============================================================================
// EXECUTE REPORT
// ============================================================================

export const executeCustomReportSchema = z.object({
  id: z.string().uuid(),
  // Additional runtime parameters
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
});

export type ExecuteCustomReportInput = z.infer<typeof executeCustomReportSchema>;

// ============================================================================
// CUSTOM REPORT OUTPUT
// ============================================================================

export const customReportSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isShared: z.boolean(),
  definition: reportDefinitionSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type CustomReport = z.infer<typeof customReportSchema>;

// ============================================================================
// REPORT RESULT
// ============================================================================

export const reportResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
  totalCount: z.number().int(),
  generatedAt: z.coerce.date(),
});

export type ReportResult = z.infer<typeof reportResultSchema>;

// ============================================================================
// FILTER STATE
// ============================================================================

export interface CustomReportsFiltersState {
  isShared: boolean | null;
  search: string;
}

export const defaultCustomReportsFilters: CustomReportsFiltersState = {
  isShared: null,
  search: '',
};
