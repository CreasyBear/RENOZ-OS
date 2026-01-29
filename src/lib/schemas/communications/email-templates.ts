/**
 * Email Templates Schemas
 *
 * Validation schemas for email template server functions.
 *
 * @see DOM-COMMS-007
 */
import { z } from 'zod'

export const templateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  defaultValue: z.string().optional(),
  type: z.enum(['text', 'date', 'number', 'currency']).optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum([
    'quotes',
    'orders',
    'installations',
    'warranty',
    'support',
    'marketing',
    'follow_up',
    'custom',
  ]),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body is required'),
  variables: z.array(templateVariableSchema).default([]),
})

export const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      'quotes',
      'orders',
      'installations',
      'warranty',
      'support',
      'marketing',
      'follow_up',
      'custom',
    ])
    .optional(),
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  variables: z.array(templateVariableSchema).optional(),
  isActive: z.boolean().optional(),
  createVersion: z.boolean().default(false),
})

export const getTemplatesSchema = z.object({
  category: z
    .enum([
      'quotes',
      'orders',
      'installations',
      'warranty',
      'support',
      'marketing',
      'follow_up',
      'custom',
    ])
    .optional(),
  activeOnly: z.boolean().default(true),
})

export const getTemplateSchema = z.object({
  id: z.string().uuid(),
})

export const deleteTemplateSchema = z.object({
  id: z.string().uuid(),
})

export const cloneTemplateSchema = z.object({
  id: z.string().uuid(),
  newName: z.string().min(1, 'Name is required'),
})

export const getVersionHistorySchema = z.object({
  templateId: z.string().uuid(),
})

export const restoreVersionSchema = z.object({
  versionId: z.string().uuid(),
})

export type TemplateVariable = z.infer<typeof templateVariableSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type GetTemplatesInput = z.infer<typeof getTemplatesSchema>
export type GetTemplateInput = z.infer<typeof getTemplateSchema>
export type DeleteTemplateInput = z.infer<typeof deleteTemplateSchema>
export type CloneTemplateInput = z.infer<typeof cloneTemplateSchema>
export type GetVersionHistoryInput = z.infer<typeof getVersionHistorySchema>
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>
