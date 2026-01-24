/**
 * Search & Recent Items Schemas
 *
 * Validation schemas for search APIs and recent item tracking.
 */

import { z } from 'zod';

// ============================================================================
// SEARCH INPUTS
// ============================================================================

export const searchEntityTypeValues = [
  'customer',
  'contact',
  'order',
  'opportunity',
  'product',
  'inventory',
  'supplier',
  'warranty',
  'issue',
  'user',
  'email',
  'call',
  'job',
  'job_assignment',
  'warranty_claim',
  'quote',
  'shipment',
] as const;

export const searchEntityTypeSchema = z.enum(searchEntityTypeValues);

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(200),
  entityTypes: z.array(searchEntityTypeSchema).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const quickSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(200),
  entityTypes: z.array(searchEntityTypeSchema).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export const reindexSearchSchema = z.object({
  entityTypes: z.array(searchEntityTypeSchema).optional(),
});

// ============================================================================
// SEARCH OUTPUTS
// ============================================================================

export const searchResultSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  rankBoost: z.number(),
  updatedAt: z.coerce.date(),
  relevanceScore: z.number(),
});

export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

// ============================================================================
// RECENT ITEMS
// ============================================================================

export const listRecentItemsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const trackRecentItemSchema = z.object({
  entityType: z.string().max(50),
  entityId: z.string().uuid(),
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional(),
  url: z.string().max(2000).optional(),
});
