/**
 * CSAT Response Validation Schemas
 *
 * Zod schemas for CSAT (Customer Satisfaction) operations.
 *
 * @see drizzle/schema/support/csat-responses.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const csatSourceSchema = z.enum(['email_link', 'internal_entry', 'public_form']);
export type CsatSource = z.infer<typeof csatSourceSchema>;

// ============================================================================
// SUBMIT INTERNAL FEEDBACK
// ============================================================================

export const submitInternalFeedbackSchema = z.object({
  issueId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
});
export type SubmitInternalFeedbackInput = z.infer<typeof submitInternalFeedbackSchema>;

// ============================================================================
// SUBMIT PUBLIC FEEDBACK (Token-based)
// ============================================================================

export const submitPublicFeedbackSchema = z.object({
  token: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
  email: z.string().email().nullable().optional(), // For tracking who submitted
});
export type SubmitPublicFeedbackInput = z.infer<typeof submitPublicFeedbackSchema>;

// ============================================================================
// GENERATE FEEDBACK TOKEN
// ============================================================================

export const generateFeedbackTokenSchema = z.object({
  issueId: z.string().uuid(),
  expiresInDays: z.number().int().min(1).max(30).optional().default(7),
});
export type GenerateFeedbackTokenInput = z.infer<typeof generateFeedbackTokenSchema>;

// ============================================================================
// GET FEEDBACK FOR ISSUE
// ============================================================================

export const getIssueFeedbackSchema = z.object({
  issueId: z.string().uuid(),
});
export type GetIssueFeedbackInput = z.infer<typeof getIssueFeedbackSchema>;

// ============================================================================
// LIST FEEDBACK
// ============================================================================

export const listFeedbackSchema = z.object({
  // Filters
  issueId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  source: csatSourceSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Pagination
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),

  // Sorting
  sortBy: z.enum(['submittedAt', 'rating', 'createdAt']).optional().default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type ListFeedbackInput = z.infer<typeof listFeedbackSchema>;

// ============================================================================
// CSAT METRICS
// ============================================================================

export const getCsatMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type GetCsatMetricsInput = z.infer<typeof getCsatMetricsSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface CsatResponseResponse {
  id: string;
  organizationId: string;
  issueId: string;
  rating: number;
  comment: string | null;
  source: CsatSource;
  submittedAt: Date;
  submittedByUserId: string | null;
  submittedByCustomerId: string | null;
  submittedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  issue?: {
    id: string;
    title: string;
    issueNumber: string;
    status: string;
  };
  submittedByUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  submittedByCustomer?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export interface ListFeedbackResponse {
  data: CsatResponseResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface CsatMetricsResponse {
  averageRating: number;
  totalResponses: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  trend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    changePercent: number;
  };
  recentLowRatings: CsatResponseResponse[];
}

export interface GenerateFeedbackTokenResponse {
  token: string;
  expiresAt: Date;
  feedbackUrl: string;
}

// ============================================================================
// VALIDATE FEEDBACK TOKEN (Public)
// ============================================================================

export const validateFeedbackTokenSchema = z.object({
  token: z.string().min(1),
});
export type ValidateFeedbackTokenInput = z.infer<typeof validateFeedbackTokenSchema>;

export interface ValidateFeedbackTokenResponse {
  valid: boolean;
  error?: string;
  expired?: boolean;
  alreadySubmitted?: boolean;
  issue?: {
    id: string;
    title: string;
    issueNumber: string;
  };
}

// ============================================================================
// SUBMIT PUBLIC FEEDBACK RESPONSE
// ============================================================================

export interface SubmitPublicFeedbackResponse {
  success: boolean;
  message: string;
  rating: number;
}
