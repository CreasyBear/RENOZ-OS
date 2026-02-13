/**
 * Action Plans Validation Schemas
 *
 * Zod schemas for customer action plan CRUD operations.
 */

import { z } from 'zod';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS
// ============================================================================

export const actionPlanPrioritySchema = z.enum(['high', 'medium', 'low']);
export const actionPlanCategorySchema = z.enum([
  'recency',
  'frequency',
  'monetary',
  'engagement',
  'general',
]);

// ============================================================================
// CREATE SCHEMA
// ============================================================================

export const createActionPlanSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: actionPlanPrioritySchema,
  category: actionPlanCategorySchema,
  dueDate: z.date().optional(),
  metadata: z
    .object({
      healthFactor: z.string().optional(),
      recommendationId: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type CreateActionPlanInput = z.infer<typeof createActionPlanSchema>;

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateActionPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  priority: actionPlanPrioritySchema.optional(),
  category: actionPlanCategorySchema.optional(),
  dueDate: z.date().optional().nullable(),
  isCompleted: z.boolean().optional(),
  metadata: z
    .object({
      healthFactor: z.string().optional(),
      recommendationId: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type UpdateActionPlanInput = z.infer<typeof updateActionPlanSchema>;

// ============================================================================
// LIST SCHEMA
// ============================================================================

export const listActionPlansSchema = z.object({
  customerId: z.string().uuid().optional(),
  isCompleted: z.boolean().optional(),
  priority: actionPlanPrioritySchema.optional(),
  category: actionPlanCategorySchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListActionPlansInput = z.infer<typeof listActionPlansSchema>;

/** Cursor pagination for list action plans (uses createdAt + id for stable sort) */
export const listActionPlansCursorSchema = cursorPaginationSchema.merge(
  z.object({
    customerId: z.string().uuid().optional(),
    isCompleted: z.boolean().optional(),
    priority: actionPlanPrioritySchema.optional(),
    category: actionPlanCategorySchema.optional(),
  })
);
export type ListActionPlansCursorInput = z.infer<typeof listActionPlansCursorSchema>;

// ============================================================================
// GET SCHEMA
// ============================================================================

export const getActionPlanSchema = z.object({
  id: z.string().uuid(),
});

export type GetActionPlanInput = z.infer<typeof getActionPlanSchema>;

// ============================================================================
// DELETE SCHEMA
// ============================================================================

export const deleteActionPlanSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteActionPlanInput = z.infer<typeof deleteActionPlanSchema>;

// ============================================================================
// COMPLETE SCHEMA
// ============================================================================

export const completeActionPlanSchema = z.object({
  id: z.string().uuid(),
});

export type CompleteActionPlanInput = z.infer<typeof completeActionPlanSchema>;
