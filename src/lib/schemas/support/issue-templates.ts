/**
 * Issue Template Validation Schemas
 *
 * Zod schemas for issue template CRUD operations.
 *
 * @see drizzle/schema/support/issue-templates.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const issueTypeSchema = z.enum([
  'hardware_fault',
  'software_firmware',
  'installation_defect',
  'performance_degradation',
  'connectivity',
  'other',
]);
export type IssueType = z.infer<typeof issueTypeSchema>;

export const issuePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type IssuePriority = z.infer<typeof issuePrioritySchema>;

// ============================================================================
// NESTED SCHEMAS
// ============================================================================

export const templateRequiredFieldsSchema = z.object({
  customerId: z.boolean().optional(),
  serialNumber: z.boolean().optional(),
  batteryModel: z.boolean().optional(),
  inverterErrorCode: z.boolean().optional(),
  installedDate: z.boolean().optional(),
  customFields: z.array(z.string()).optional(),
});
export type TemplateRequiredFields = z.infer<typeof templateRequiredFieldsSchema>;

export const templateDefaultsSchema = z.object({
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type TemplateDefaults = z.infer<typeof templateDefaultsSchema>;

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

export const createIssueTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  type: issueTypeSchema,
  defaultPriority: issuePrioritySchema.optional().default('medium'),
  defaultAssigneeId: z.string().uuid().nullable().optional(),
  titleTemplate: z.string().max(500).nullable().optional(),
  descriptionPrompt: z.string().max(2000).nullable().optional(),
  requiredFields: templateRequiredFieldsSchema.nullable().optional(),
  defaults: templateDefaultsSchema.nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateIssueTemplateInput = z.infer<typeof createIssueTemplateSchema>;

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

export const updateIssueTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  type: issueTypeSchema.optional(),
  defaultPriority: issuePrioritySchema.optional(),
  defaultAssigneeId: z.string().uuid().nullable().optional(),
  titleTemplate: z.string().max(500).nullable().optional(),
  descriptionPrompt: z.string().max(2000).nullable().optional(),
  requiredFields: templateRequiredFieldsSchema.nullable().optional(),
  defaults: templateDefaultsSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateIssueTemplateInput = z.infer<typeof updateIssueTemplateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const getIssueTemplateSchema = z.object({
  templateId: z.string().uuid(),
});
export type GetIssueTemplateInput = z.infer<typeof getIssueTemplateSchema>;

export const listIssueTemplatesSchema = z.object({
  // Filters
  type: issueTypeSchema.optional(),
  isActive: z.boolean().optional(),

  // Search
  search: z.string().max(100).optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(['name', 'usageCount', 'createdAt']).default('usageCount'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListIssueTemplatesInput = z.infer<typeof listIssueTemplatesSchema>;

export const deleteIssueTemplateSchema = z.object({
  templateId: z.string().uuid(),
});
export type DeleteIssueTemplateInput = z.infer<typeof deleteIssueTemplateSchema>;

export const incrementTemplateUsageSchema = z.object({
  templateId: z.string().uuid(),
});
export type IncrementTemplateUsageInput = z.infer<typeof incrementTemplateUsageSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface IssueTemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: IssueType;
  defaultPriority: IssuePriority;
  defaultAssigneeId: string | null;
  titleTemplate: string | null;
  descriptionPrompt: string | null;
  requiredFields: TemplateRequiredFields | null;
  defaults: TemplateDefaults | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  // Joined data
  defaultAssignee?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface ListIssueTemplatesResponse {
  data: IssueTemplateResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
