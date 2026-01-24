/**
 * Job Materials Zod Schemas
 *
 * Validation schemas for job BOM (Bill of Materials) operations.
 * Used by server functions in src/server/functions/job-materials.ts
 *
 * @see drizzle/schema/job-materials.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002b
 */

import { z } from 'zod';
import { quantitySchema, currencySchema } from '../_shared/patterns';

// ============================================================================
// LIST JOB MATERIALS
// ============================================================================

/**
 * Schema for listing materials for a job.
 */
export const listJobMaterialsSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export type ListJobMaterialsInput = z.infer<typeof listJobMaterialsSchema>;

// ============================================================================
// ADD JOB MATERIAL
// ============================================================================

/**
 * Schema for adding a material to a job's BOM.
 */
export const addJobMaterialSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  quantityRequired: quantitySchema.min(0),
  unitCost: currencySchema,
  notes: z.string().max(2000).optional().nullable(),
});

export type AddJobMaterialInput = z.infer<typeof addJobMaterialSchema>;

// ============================================================================
// UPDATE JOB MATERIAL
// ============================================================================

/**
 * Schema for updating a job material entry.
 * Can update quantityRequired, quantityUsed, unitCost, or notes.
 */
export const updateJobMaterialSchema = z.object({
  materialId: z.string().uuid('Invalid material ID format'),
  quantityRequired: quantitySchema.min(0).optional(),
  quantityUsed: quantitySchema.min(0).optional(),
  unitCost: currencySchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateJobMaterialInput = z.infer<typeof updateJobMaterialSchema>;

// ============================================================================
// REMOVE JOB MATERIAL
// ============================================================================

/**
 * Schema for removing a material from a job's BOM.
 */
export const removeJobMaterialSchema = z.object({
  materialId: z.string().uuid('Invalid material ID format'),
});

export type RemoveJobMaterialInput = z.infer<typeof removeJobMaterialSchema>;

// ============================================================================
// RESERVE JOB STOCK
// ============================================================================

/**
 * Schema for reserving inventory for a job's materials.
 * This creates inventory reservations for the BOM items.
 */
export const reserveJobStockSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  /** Optional: reserve only specific materials. If empty, reserves all. */
  materialIds: z.array(z.string().uuid()).optional(),
});

export type ReserveJobStockInput = z.infer<typeof reserveJobStockSchema>;

// ============================================================================
// CALCULATE JOB MATERIAL COST
// ============================================================================

/**
 * Schema for calculating total material cost for a job.
 */
export const calculateJobMaterialCostSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export type CalculateJobMaterialCostInput = z.infer<typeof calculateJobMaterialCostSchema>;

// ============================================================================
// GET JOB MATERIAL
// ============================================================================

/**
 * Schema for getting a single material entry.
 */
export const getJobMaterialSchema = z.object({
  materialId: z.string().uuid('Invalid material ID format'),
});

export type GetJobMaterialInput = z.infer<typeof getJobMaterialSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Product details embedded in material response.
 */
export interface ProductDetails {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
}

/**
 * Material response with product details.
 */
export interface MaterialResponse {
  id: string;
  jobId: string;
  productId: string;
  quantityRequired: number;
  quantityUsed: number;
  unitCost: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  product: ProductDetails;
}

/**
 * Job material cost summary.
 */
export interface JobMaterialCostSummary {
  jobId: string;
  totalMaterials: number;
  totalQuantityRequired: number;
  totalQuantityUsed: number;
  estimatedCost: number; // unitCost * quantityRequired
  actualCost: number; // unitCost * quantityUsed
  variance: number; // estimatedCost - actualCost
}
