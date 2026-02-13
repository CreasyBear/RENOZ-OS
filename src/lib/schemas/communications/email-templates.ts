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

// ============================================================================
// URL SEARCH PARAMS SCHEMA (for route validation)
// ============================================================================

/**
 * Search params schema for templates route URL state sync.
 * Follows FILTER-STANDARDS.md pattern.
 */
export const templatesSearchSchema = z.object({
  search: z.string().optional().default(''),
  category: z.enum([
    'all',
    'quotes',
    'orders',
    'installations',
    'warranty',
    'support',
    'marketing',
    'follow_up',
    'custom',
  ]).optional().default('all'),
  // Note: status filter not yet implemented server-side
  // status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
})

// ============================================================================
// INPUT TYPES (from Zod schemas)
// ============================================================================

export type TemplateVariable = z.infer<typeof templateVariableSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type GetTemplatesInput = z.infer<typeof getTemplatesSchema>
export type GetTemplateInput = z.infer<typeof getTemplateSchema>
export type DeleteTemplateInput = z.infer<typeof deleteTemplateSchema>
export type CloneTemplateInput = z.infer<typeof cloneTemplateSchema>
export type GetVersionHistoryInput = z.infer<typeof getVersionHistorySchema>
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>

// ============================================================================
// OUTPUT TYPES (from Drizzle schema - what server functions return)
// ============================================================================

import type { EmailTemplate, EmailTemplateVersion, TemplateCategory } from '../../../../drizzle/schema/communications/email-templates'

// Re-export TemplateCategory for use in components
export type { TemplateCategory }

/**
 * Template output type - matches what getEmailTemplates returns
 * Server functions return EmailTemplate[] directly from Drizzle
 */
export type Template = EmailTemplate

/**
 * Template version output type - matches what getTemplateVersionHistory returns
 */
export type TemplateVersion = Pick<EmailTemplateVersion, 'id' | 'name' | 'version' | 'createdAt' | 'createdBy'>

/**
 * Template form values for UI components
 * Used in TemplatesList component for create/edit forms
 */
export interface TemplateFormValues {
  name: string
  description?: string
  category: TemplateCategory
  subject: string
  bodyHtml: string
  isActive: boolean
  createVersion: boolean
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for TemplateEditor component
 */
export interface TemplateEditorProps {
  template?: {
    id: string
    name: string
    description?: string | null
    category: TemplateCategory
    subject: string
    bodyHtml: string
    isActive: boolean
    version: number
  }
  onSave?: () => void
  onCancel?: () => void
  onViewHistory?: () => void
  className?: string
}

/**
 * Props for TemplateVariableMenu component
 */
export interface TemplateVariableMenuProps {
  onInsert: (variable: string) => void
  categories?: string[]
  className?: string
}

/**
 * Props for TemplatesList presenter component
 * All data is passed from the container route.
 * Filters are URL-synced via DomainFilterBar following FILTER-STANDARDS.md.
 */
export interface TemplatesListProps {
  /** @source useTemplates() in container */
  templates: Template[]
  /** @source useTemplates().isLoading in container */
  isLoading: boolean
  /** @source useFilterUrlState() in container - URL-synced filter state */
  filters: {
    search: string
    category: TemplateCategory | 'all'
  }
  /** @source useFilterUrlState().setFilters in container */
  onFiltersChange: (filters: {
    search: string
    category: TemplateCategory | 'all'
  }) => void
  /** @source useCreateTemplate() in container */
  onCreate: (values: TemplateFormValues) => Promise<void>
  /** @source useUpdateTemplate() in container */
  onUpdate: (id: string, values: TemplateFormValues) => Promise<void>
  /** @source useDeleteTemplate() in container */
  onDelete: (id: string) => Promise<void>
  /** @source useCloneTemplate() in container */
  onClone: (id: string, newName: string) => Promise<void>
  /** @source useTemplateVersions() in container */
  versions: TemplateVersion[]
  versionsLoading: boolean
  onFetchVersions: (templateId: string) => void
  isDeleting?: boolean
  isCloning?: boolean
  isSaving?: boolean
  className?: string
}
