/**
 * Knowledge Base Validation Schemas
 *
 * Zod schemas for KB articles and categories CRUD operations.
 *
 * @see drizzle/schema/support/knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007a
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const kbArticleStatusSchema = z.enum(['draft', 'published', 'archived']);
export type KbArticleStatus = z.infer<typeof kbArticleStatusSchema>;

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const getCategorySchema = z.object({
  categoryId: z.string().uuid(),
});
export type GetCategoryInput = z.infer<typeof getCategorySchema>;

export const listCategoriesSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  includeArticleCount: z.boolean().optional().default(false),
});
export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;

export const deleteCategorySchema = z.object({
  categoryId: z.string().uuid(),
});
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

// ============================================================================
// ARTICLE SCHEMAS
// ============================================================================

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9-]+$/),
  summary: z.string().max(500).nullable().optional(),
  content: z.string().min(1),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  status: kbArticleStatusSchema.optional().default('draft'),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(200).nullable().optional(),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
  articleId: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  slug: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  summary: z.string().max(500).nullable().optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: kbArticleStatusSchema.optional(),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(200).nullable().optional(),
});
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const getArticleSchema = z.object({
  articleId: z.string().uuid(),
  incrementViews: z.boolean().optional().default(false),
});
export type GetArticleInput = z.infer<typeof getArticleSchema>;

export const listArticlesSchema = z.object({
  // Filters
  categoryId: z.string().uuid().optional(),
  status: kbArticleStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),

  // Pagination
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),

  // Sorting
  sortBy: z
    .enum(['title', 'createdAt', 'updatedAt', 'viewCount', 'publishedAt'])
    .optional()
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type ListArticlesInput = z.infer<typeof listArticlesSchema>;

export const deleteArticleSchema = z.object({
  articleId: z.string().uuid(),
});
export type DeleteArticleInput = z.infer<typeof deleteArticleSchema>;

export const recordArticleFeedbackSchema = z.object({
  articleId: z.string().uuid(),
  helpful: z.boolean(),
});
export type RecordArticleFeedbackInput = z.infer<typeof recordArticleFeedbackSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface KbCategoryResponse {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Aggregates
  articleCount?: number;
  children?: KbCategoryResponse[];
}

export interface KbArticleResponse {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  categoryId: string | null;
  tags: string[];
  status: KbArticleStatus;
  publishedAt: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  // Joined
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface ListArticlesResponse {
  data: KbArticleResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
