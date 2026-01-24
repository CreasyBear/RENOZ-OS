/**
 * Checklists Zod Schemas
 *
 * Validation schemas for checklist template and job checklist operations.
 * Used by server functions in src/server/functions/checklists.ts
 *
 * @see drizzle/schema/checklists.ts for database schema
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004b
 */

import { z } from 'zod';

// ============================================================================
// TEMPLATE ITEM SCHEMA
// ============================================================================

/**
 * Schema for a checklist template item.
 */
export const checklistTemplateItemSchema = z.object({
  id: z.string(), // Not UUID - generated ID within template
  text: z.string().min(1, 'Item text is required').max(500),
  description: z.string().max(2000).optional(),
  requiresPhoto: z.boolean().default(false),
  position: z.number().int().min(0),
});

export type ChecklistTemplateItemInput = z.infer<typeof checklistTemplateItemSchema>;

// ============================================================================
// LIST CHECKLIST TEMPLATES
// ============================================================================

/**
 * Schema for listing checklist templates.
 */
export const listChecklistTemplatesSchema = z.object({
  includeInactive: z.boolean().default(false),
});

export type ListChecklistTemplatesInput = z.infer<typeof listChecklistTemplatesSchema>;

// ============================================================================
// CREATE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Schema for creating a checklist template.
 */
export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  items: z.array(checklistTemplateItemSchema).min(1, 'At least one item is required'),
  isActive: z.boolean().default(true),
});

export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>;

// ============================================================================
// UPDATE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Schema for updating a checklist template.
 */
export const updateChecklistTemplateSchema = z.object({
  templateId: z.string().uuid('Invalid template ID format'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  items: z.array(checklistTemplateItemSchema).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateChecklistTemplateInput = z.infer<typeof updateChecklistTemplateSchema>;

// ============================================================================
// DELETE CHECKLIST TEMPLATE
// ============================================================================

/**
 * Schema for deleting a checklist template.
 */
export const deleteChecklistTemplateSchema = z.object({
  templateId: z.string().uuid('Invalid template ID format'),
});

export type DeleteChecklistTemplateInput = z.infer<typeof deleteChecklistTemplateSchema>;

// ============================================================================
// GET CHECKLIST TEMPLATE
// ============================================================================

/**
 * Schema for getting a single checklist template.
 */
export const getChecklistTemplateSchema = z.object({
  templateId: z.string().uuid('Invalid template ID format'),
});

export type GetChecklistTemplateInput = z.infer<typeof getChecklistTemplateSchema>;

// ============================================================================
// APPLY CHECKLIST TO JOB
// ============================================================================

/**
 * Schema for applying a checklist template to a job.
 */
export const applyChecklistToJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  templateId: z.string().uuid('Invalid template ID format'),
});

export type ApplyChecklistToJobInput = z.infer<typeof applyChecklistToJobSchema>;

// ============================================================================
// UPDATE CHECKLIST ITEM
// ============================================================================

/**
 * Schema for updating a checklist item.
 */
export const updateChecklistItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID format'),
  isCompleted: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

// ============================================================================
// GET JOB CHECKLIST
// ============================================================================

/**
 * Schema for getting a job's checklist.
 */
export const getJobChecklistSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

export type GetJobChecklistInput = z.infer<typeof getJobChecklistSchema>;

// ============================================================================
// GET CHECKLIST ITEM
// ============================================================================

/**
 * Schema for getting a single checklist item.
 */
export const getChecklistItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID format'),
});

export type GetChecklistItemInput = z.infer<typeof getChecklistItemSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Checklist template response.
 */
export interface ChecklistTemplateResponse {
  id: string;
  name: string;
  description: string | null;
  items: ChecklistTemplateItemInput[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Checklist item response with completion details.
 */
export interface ChecklistItemResponse {
  id: string;
  checklistId: string;
  itemText: string;
  itemDescription: string | null;
  requiresPhoto: boolean;
  position: number;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: string | null;
  completedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job checklist response with all items.
 */
export interface JobChecklistResponse {
  id: string;
  jobId: string;
  templateId: string | null;
  templateName: string | null;
  items: ChecklistItemResponse[];
  /** Completion stats */
  stats: {
    total: number;
    completed: number;
    remaining: number;
    percentComplete: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}
