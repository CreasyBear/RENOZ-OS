/**
 * Job Event Templates Schema
 *
 * Templates for quick job creation and scheduling
 */

import { z } from 'zod';
import { quantitySchema } from '../_shared/patterns';

// ============================================================================
// EVENT TEMPLATES
// ============================================================================

/**
 * Job event template schema
 */
export const jobEventTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  duration: z.number().int().min(15).max(480, 'Duration must be between 15 minutes and 8 hours'), // 15min to 8 hours
  jobType: z.enum(['installation', 'service', 'warranty', 'inspection', 'commissioning']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  defaultNotes: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type JobEventTemplate = z.infer<typeof jobEventTemplateSchema>;

/**
 * Create job event template input
 */
export const createJobEventTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  duration: z.number().int().min(15).max(480).default(120), // Default 2 hours
  jobType: z
    .enum(['installation', 'service', 'warranty', 'inspection', 'commissioning'])
    .default('installation'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  defaultNotes: z.string().optional(),
});

export type CreateJobEventTemplateInput = z.infer<typeof createJobEventTemplateSchema>;

/**
 * Update job event template input
 */
export const updateJobEventTemplateSchema = createJobEventTemplateSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type UpdateJobEventTemplateInput = z.infer<typeof updateJobEventTemplateSchema>;

// ============================================================================
// MULTI-DAY EVENTS
// ============================================================================

/**
 * Multi-day event configuration
 */
export const multiDayEventSchema = z.object({
  jobId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
    .optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  excludeDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type MultiDayEventConfig = z.infer<typeof multiDayEventSchema>;

// ============================================================================
// CALENDAR EXPORT
// ============================================================================

/**
 * Calendar export format options
 */
export const calendarExportFormatSchema = z.enum(['ics', 'json', 'csv']);

export type CalendarExportFormat = z.infer<typeof calendarExportFormatSchema>;

/**
 * Calendar export configuration
 */
export const calendarExportSchema = z.object({
  format: calendarExportFormatSchema.default('ics'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  installerIds: z.array(z.string().uuid()).optional(),
  statuses: z
    .array(z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']))
    .optional(),
  includeCustomerInfo: z.boolean().default(true),
  includePrivateNotes: z.boolean().default(false),
});

export type CalendarExportConfig = z.infer<typeof calendarExportSchema>;

// ============================================================================
// JOB TEMPLATES CRUD SCHEMAS
// ============================================================================

/**
 * List job templates query schema
 */
export const listJobTemplatesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export type ListJobTemplatesInput = z.infer<typeof listJobTemplatesSchema>;

/**
 * Get job template by ID schema
 */
export const getJobTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export type GetJobTemplateInput = z.infer<typeof getJobTemplateSchema>;

/**
 * Create job template input schema
 */
export const createJobTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  defaultTasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, 'Task title is required'),
        description: z.string().optional(),
        position: z.number().int().min(0),
      })
    )
    .default([]),
  defaultBOM: z
    .array(
      z.object({
        id: z.string(),
        productId: z.string().uuid(),
        quantityRequired: quantitySchema.min(0.001),
        notes: z.string().optional(),
      })
    )
    .default([]),
  checklistTemplateId: z.string().uuid().optional(),
  estimatedDuration: z.number().int().min(1).default(120), // Default 2 hours
  slaConfigurationId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateJobTemplateInput = z.infer<typeof createJobTemplateSchema>;

/**
 * Job template task input schema
 */
export const jobTemplateTaskInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  position: z.number().int().min(0),
});

export type JobTemplateTaskInput = z.infer<typeof jobTemplateTaskInputSchema>;

/**
 * Job template BOM item input schema
 */
export const jobTemplateBOMItemInputSchema = z.object({
  id: z.string(),
  productId: z.string().uuid(),
  quantityRequired: z.number().min(0.01),
  notes: z.string().optional(),
});

export type JobTemplateBOMItemInput = z.infer<typeof jobTemplateBOMItemInputSchema>;

/**
 * Update job template input schema
 */
export const updateJobTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  defaultTasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, 'Task title is required'),
        description: z.string().optional(),
        position: z.number().int().min(0),
      })
    )
    .optional(),
  defaultBOM: z
    .array(
      z.object({
        id: z.string(),
        productId: z.string().uuid(),
        quantityRequired: z.number().min(0.01),
        notes: z.string().optional(),
      })
    )
    .optional(),
  checklistTemplateId: z.string().uuid().nullable().optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  slaConfigurationId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().min(1).optional(), // For optimistic locking
});

export type UpdateJobTemplateInput = z.infer<typeof updateJobTemplateSchema>;

/**
 * Delete job template schema
 */
export const deleteJobTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export type DeleteJobTemplateInput = z.infer<typeof deleteJobTemplateSchema>;

/**
 * Create job from template schema
 */
export const createJobFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  customerId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduledTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
    .optional(),
  installerId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreateJobFromTemplateInput = z.infer<typeof createJobFromTemplateSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Job template response with expanded relations
 */
export type JobTemplateResponse = {
  id: string;
  name: string;
  description: string | null;
  defaultTasks: Array<{
    id: string;
    title: string;
    description?: string;
    position: number;
  }>;
  defaultBOM: Array<{
    id: string;
    productId: string;
    quantityRequired: number;
    notes?: string;
  }>;
  checklistTemplateId: string | null;
  checklistTemplateName: string | null;
  estimatedDuration: number;
  slaConfigurationId: string | null;
  slaConfigurationName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

/**
 * Response for listing job templates
 */
export type ListJobTemplatesResponse = {
  templates: JobTemplateResponse[];
  total: number;
};

/**
 * Response for creating a job from template
 */
export type CreateJobFromTemplateResponse = {
  success: true;
  jobId: string;
  jobNumber: string;
  tasksCreated: number;
  materialsAdded: number;
  checklistApplied: boolean;
  slaTrackingId: string | null;
};
