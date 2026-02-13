/**
 * CSAT Response Server Functions
 *
 * Server functions for managing customer satisfaction feedback
 * including internal entry and metrics.
 *
 * @see drizzle/schema/support/csat-responses.ts
 * @see src/lib/schemas/support/csat-responses.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-005a
 */

import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, desc, asc, gte, lte, count, avg, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { csatResponses } from 'drizzle/schema/support/csat-responses';
import { issues } from 'drizzle/schema/support/issues';
import { users } from 'drizzle/schema/users';
import { customers } from 'drizzle/schema/customers';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ConflictError, ValidationError, RateLimitError, ServerError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { nanoid } from 'nanoid';
import {
  submitInternalFeedbackSchema,
  getIssueFeedbackSchema,
  listFeedbackSchema,
  listFeedbackCursorSchema,
  getCsatMetricsSchema,
  generateFeedbackTokenSchema,
  type CsatResponseResponse,
  type ListFeedbackResponse,
  type CsatMetricsResponse,
  type GenerateFeedbackTokenResponse,
} from '@/lib/schemas/support/csat-responses';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { customersLogger } from '@/lib/logger';

// ============================================================================
// HELPERS
// ============================================================================

function toCsatResponseResponse(row: {
  id: string;
  organizationId: string;
  issueId: string;
  rating: number;
  comment: string | null;
  source: string;
  submittedAt: Date;
  submittedByUserId: string | null;
  submittedByCustomerId: string | null;
  submittedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  issueTitle?: string | null;
  issueNumber?: string | null;
  issueStatus?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}): CsatResponseResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    rating: row.rating,
    comment: row.comment,
    source: row.source as CsatResponseResponse['source'],
    submittedAt: row.submittedAt,
    submittedByUserId: row.submittedByUserId,
    submittedByCustomerId: row.submittedByCustomerId,
    submittedByEmail: row.submittedByEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    issue: row.issueTitle
      ? {
          id: row.issueId,
          title: row.issueTitle,
          issueNumber: row.issueNumber ?? '',
          status: row.issueStatus ?? '',
        }
      : undefined,
    submittedByUser: row.submittedByUserId
      ? {
          id: row.submittedByUserId,
          name: row.userName ?? null,
          email: row.userEmail ?? '',
        }
      : null,
    submittedByCustomer: row.submittedByCustomerId
      ? {
          id: row.submittedByCustomerId,
          name: row.customerName ?? '',
          email: row.customerEmail ?? null,
        }
      : null,
  };
}

// ============================================================================
// SUBMIT INTERNAL FEEDBACK
// ============================================================================

export const submitInternalFeedback = createServerFn({ method: 'POST' })
  .inputValidator(submitInternalFeedbackSchema)
  .handler(async ({ data }): Promise<CsatResponseResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.create });

    try {
      return await db.transaction(async (tx) => {
      // Verify issue exists and belongs to organization
      const [issue] = await tx
        .select({
          id: issues.id,
          organizationId: issues.organizationId,
          title: issues.title,
          issueNumber: issues.issueNumber,
          status: issues.status,
        })
        .from(issues)
        .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
        .limit(1);

      if (!issue) {
        setResponseStatus(404);
        throw new NotFoundError('Issue not found', 'issue');
      }

      // M06: Check if feedback already exists (add orgId for tenant isolation)
      const [existing] = await tx
        .select({ id: csatResponses.id })
        .from(csatResponses)
        .where(
          and(
            eq(csatResponses.issueId, data.issueId),
            eq(csatResponses.organizationId, ctx.organizationId),
          )
        )
        .limit(1);

      if (existing) {
        setResponseStatus(409);
        throw new ConflictError('Feedback already submitted for this issue');
      }

      // Insert feedback
      const [feedback] = await tx
        .insert(csatResponses)
        .values({
          organizationId: ctx.organizationId,
          issueId: data.issueId,
          rating: data.rating,
          comment: data.comment ?? null,
          source: 'internal_entry',
          submittedByUserId: ctx.user.id,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Get user details
      const [user] = await tx
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      return toCsatResponseResponse({
        ...feedback,
        issueTitle: issue.title,
        issueNumber: issue.issueNumber,
        issueStatus: issue.status,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
      });
    });
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        setResponseStatus(409);
        throw new ConflictError('Failed to submit feedback - duplicate submission');
      }
      customersLogger.error('submitInternalFeedback DB error', error);
      setResponseStatus(500);
      throw new ServerError('Failed to submit feedback', 500, 'INTERNAL_ERROR');
    }
  });

// ============================================================================
// GET FEEDBACK FOR ISSUE
// ============================================================================

export const getIssueFeedback = createServerFn({ method: 'GET' })
  .inputValidator(getIssueFeedbackSchema)
  .handler(async ({ data }): Promise<CsatResponseResponse | null> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.read });

    const [result] = await db
      .select({
        id: csatResponses.id,
        organizationId: csatResponses.organizationId,
        issueId: csatResponses.issueId,
        rating: csatResponses.rating,
        comment: csatResponses.comment,
        source: csatResponses.source,
        submittedAt: csatResponses.submittedAt,
        submittedByUserId: csatResponses.submittedByUserId,
        submittedByCustomerId: csatResponses.submittedByCustomerId,
        submittedByEmail: csatResponses.submittedByEmail,
        createdAt: csatResponses.createdAt,
        updatedAt: csatResponses.updatedAt,
        issueTitle: issues.title,
        issueNumber: issues.issueNumber,
        issueStatus: issues.status,
        userName: users.name,
        userEmail: users.email,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(csatResponses)
      .innerJoin(issues, eq(csatResponses.issueId, issues.id))
      .leftJoin(users, eq(csatResponses.submittedByUserId, users.id))
      // C39: Add soft-delete filter on customers JOIN
      .leftJoin(customers, and(
        eq(csatResponses.submittedByCustomerId, customers.id),
        isNull(customers.deletedAt),
      ))
      .where(
        and(
          eq(csatResponses.issueId, data.issueId),
          eq(csatResponses.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!result) {
      return null;
    }

    return toCsatResponseResponse(result);
  });

// ============================================================================
// LIST FEEDBACK
// ============================================================================

export const listFeedback = createServerFn({ method: 'GET' })
  .inputValidator(listFeedbackSchema)
  .handler(async ({ data }): Promise<ListFeedbackResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.read });

    // Build conditions
    const conditions = [eq(csatResponses.organizationId, ctx.organizationId)];

    if (data.issueId) {
      conditions.push(eq(csatResponses.issueId, data.issueId));
    }
    if (data.rating !== undefined) {
      conditions.push(eq(csatResponses.rating, data.rating));
    }
    if (data.minRating !== undefined) {
      conditions.push(gte(csatResponses.rating, data.minRating));
    }
    if (data.maxRating !== undefined) {
      conditions.push(lte(csatResponses.rating, data.maxRating));
    }
    if (data.source) {
      conditions.push(eq(csatResponses.source, data.source));
    }
    if (data.startDate) {
      conditions.push(gte(csatResponses.submittedAt, new Date(data.startDate)));
    }
    if (data.endDate) {
      conditions.push(lte(csatResponses.submittedAt, new Date(data.endDate)));
    }

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(csatResponses)
      .where(and(...conditions));

    const totalCount = countResult?.total ?? 0;

    // Calculate pagination
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get order
    const sortBy = data.sortBy ?? 'submittedAt';
    const sortOrder = data.sortOrder ?? 'desc';
    const orderColumn =
      sortBy === 'rating'
        ? csatResponses.rating
        : sortBy === 'createdAt'
          ? csatResponses.createdAt
          : csatResponses.submittedAt;
    const order = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    // Fetch results
    const results = await db
      .select({
        id: csatResponses.id,
        organizationId: csatResponses.organizationId,
        issueId: csatResponses.issueId,
        rating: csatResponses.rating,
        comment: csatResponses.comment,
        source: csatResponses.source,
        submittedAt: csatResponses.submittedAt,
        submittedByUserId: csatResponses.submittedByUserId,
        submittedByCustomerId: csatResponses.submittedByCustomerId,
        submittedByEmail: csatResponses.submittedByEmail,
        createdAt: csatResponses.createdAt,
        updatedAt: csatResponses.updatedAt,
        issueTitle: issues.title,
        issueNumber: issues.issueNumber,
        issueStatus: issues.status,
        userName: users.name,
        userEmail: users.email,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(csatResponses)
      .innerJoin(issues, eq(csatResponses.issueId, issues.id))
      .leftJoin(users, eq(csatResponses.submittedByUserId, users.id))
      // C39: Add soft-delete filter on customers JOIN
      .leftJoin(customers, and(
        eq(csatResponses.submittedByCustomerId, customers.id),
        isNull(customers.deletedAt),
      ))
      .where(and(...conditions))
      .orderBy(order)
      .limit(pageSize)
      .offset(offset);

    return {
      data: results.map(toCsatResponseResponse),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });

// ============================================================================
// LIST FEEDBACK (CURSOR)
// ============================================================================

export const listFeedbackCursor = createServerFn({ method: 'GET' })
  .inputValidator(listFeedbackCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', issueId, rating, minRating, maxRating, source, startDate, endDate } = data;

    const conditions = [eq(csatResponses.organizationId, ctx.organizationId)];
    if (issueId) conditions.push(eq(csatResponses.issueId, issueId));
    if (rating !== undefined) conditions.push(eq(csatResponses.rating, rating));
    if (minRating !== undefined) conditions.push(gte(csatResponses.rating, minRating));
    if (maxRating !== undefined) conditions.push(lte(csatResponses.rating, maxRating));
    if (source) conditions.push(eq(csatResponses.source, source));
    if (startDate) conditions.push(gte(csatResponses.submittedAt, new Date(startDate)));
    if (endDate) conditions.push(lte(csatResponses.submittedAt, new Date(endDate)));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(csatResponses.createdAt, csatResponses.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const results = await db
      .select({
        id: csatResponses.id,
        organizationId: csatResponses.organizationId,
        issueId: csatResponses.issueId,
        rating: csatResponses.rating,
        comment: csatResponses.comment,
        source: csatResponses.source,
        submittedAt: csatResponses.submittedAt,
        submittedByUserId: csatResponses.submittedByUserId,
        submittedByCustomerId: csatResponses.submittedByCustomerId,
        submittedByEmail: csatResponses.submittedByEmail,
        createdAt: csatResponses.createdAt,
        updatedAt: csatResponses.updatedAt,
        issueTitle: issues.title,
        issueNumber: issues.issueNumber,
        issueStatus: issues.status,
        userName: users.name,
        userEmail: users.email,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(csatResponses)
      .innerJoin(issues, eq(csatResponses.issueId, issues.id))
      .leftJoin(users, eq(csatResponses.submittedByUserId, users.id))
      .leftJoin(customers, and(eq(csatResponses.submittedByCustomerId, customers.id), isNull(customers.deletedAt)))
      .where(and(...conditions))
      .orderBy(orderDir(csatResponses.createdAt), orderDir(csatResponses.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results.map(toCsatResponseResponse), pageSize);
  });

// ============================================================================
// GET CSAT METRICS
// ============================================================================

export const getCsatMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getCsatMetricsSchema)
  .handler(async ({ data }): Promise<CsatMetricsResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.read });

    // Build date conditions
    const conditions = [eq(csatResponses.organizationId, ctx.organizationId)];

    // Default to last 30 days if no dates provided
    const endDate = data.endDate ? new Date(data.endDate) : new Date();
    const startDate = data.startDate
      ? new Date(data.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    conditions.push(gte(csatResponses.submittedAt, startDate));
    conditions.push(lte(csatResponses.submittedAt, endDate));

    // Get average rating and total
    const [avgResult] = await db
      .select({
        avgRating: avg(csatResponses.rating),
        total: count(),
      })
      .from(csatResponses)
      .where(and(...conditions));

    const averageRating = avgResult?.avgRating ? parseFloat(String(avgResult.avgRating)) : 0;
    const totalResponses = avgResult?.total ?? 0;

    // Get rating distribution
    const distribution = await db
      .select({
        rating: csatResponses.rating,
        count: count(),
      })
      .from(csatResponses)
      .where(and(...conditions))
      .groupBy(csatResponses.rating)
      .orderBy(asc(csatResponses.rating));

    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => {
      const found = distribution.find((d) => d.rating === rating);
      const countVal = found?.count ?? 0;
      return {
        rating,
        count: countVal,
        percentage: totalResponses > 0 ? (countVal / totalResponses) * 100 : 0,
      };
    });

    // Get previous period for trend
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const [prevResult] = await db
      .select({
        avgRating: avg(csatResponses.rating),
      })
      .from(csatResponses)
      .where(
        and(
          eq(csatResponses.organizationId, ctx.organizationId),
          gte(csatResponses.submittedAt, previousStartDate),
          lte(csatResponses.submittedAt, previousEndDate)
        )
      );

    const previousAvg = prevResult?.avgRating ? parseFloat(String(prevResult.avgRating)) : 0;
    const change = averageRating - previousAvg;
    const changePercent = previousAvg > 0 ? ((averageRating - previousAvg) / previousAvg) * 100 : 0;

    // Get recent low ratings (1-2 stars)
    const lowRatings = await db
      .select({
        id: csatResponses.id,
        organizationId: csatResponses.organizationId,
        issueId: csatResponses.issueId,
        rating: csatResponses.rating,
        comment: csatResponses.comment,
        source: csatResponses.source,
        submittedAt: csatResponses.submittedAt,
        submittedByUserId: csatResponses.submittedByUserId,
        submittedByCustomerId: csatResponses.submittedByCustomerId,
        submittedByEmail: csatResponses.submittedByEmail,
        createdAt: csatResponses.createdAt,
        updatedAt: csatResponses.updatedAt,
        issueTitle: issues.title,
        issueNumber: issues.issueNumber,
        issueStatus: issues.status,
        userName: users.name,
        userEmail: users.email,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(csatResponses)
      .innerJoin(issues, eq(csatResponses.issueId, issues.id))
      .leftJoin(users, eq(csatResponses.submittedByUserId, users.id))
      // C39: Add soft-delete filter on customers JOIN
      .leftJoin(customers, and(
        eq(csatResponses.submittedByCustomerId, customers.id),
        isNull(customers.deletedAt),
      ))
      .where(
        and(eq(csatResponses.organizationId, ctx.organizationId), lte(csatResponses.rating, 2))
      )
      .orderBy(desc(csatResponses.submittedAt))
      .limit(5);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalResponses,
      ratingDistribution,
      trend: {
        currentPeriod: Math.round(averageRating * 10) / 10,
        previousPeriod: Math.round(previousAvg * 10) / 10,
        change: Math.round(change * 10) / 10,
        changePercent: Math.round(changePercent * 10) / 10,
      },
      recentLowRatings: lowRatings.map(toCsatResponseResponse),
    };
  });

// ============================================================================
// GENERATE FEEDBACK TOKEN
// ============================================================================

export const generateFeedbackToken = createServerFn({ method: 'POST' })
  .inputValidator(generateFeedbackTokenSchema)
  .handler(async ({ data }): Promise<GenerateFeedbackTokenResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.support.update });

    // Verify issue exists and belongs to organization
    const [issue] = await db
      .select({ id: issues.id })
      .from(issues)
      .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!issue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    // Generate token
    const token = nanoid(32);
    const expiresInDays = data.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Create pending feedback entry with token
    await db.insert(csatResponses).values({
      organizationId: ctx.organizationId,
      issueId: data.issueId,
      rating: 0, // Placeholder until submitted
      source: 'email_link',
      token,
      tokenExpiresAt: expiresAt,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    });

    // Build feedback URL (will be configured per environment)
    const baseUrl = process.env.PUBLIC_URL || 'https://app.renoz.com.au';
    const feedbackUrl = `${baseUrl}/feedback/${token}`;

    return {
      token,
      expiresAt,
      feedbackUrl,
    };
  });

// ============================================================================
// VALIDATE FEEDBACK TOKEN (Public - No Auth)
// ============================================================================

import {
  validateFeedbackTokenSchema,
  submitPublicFeedbackSchema,
  type ValidateFeedbackTokenResponse,
  type SubmitPublicFeedbackResponse,
} from '@/lib/schemas/support/csat-responses';

export const validateFeedbackToken = createServerFn({ method: 'GET' })
  .inputValidator(validateFeedbackTokenSchema)
  .handler(async ({ data }): Promise<ValidateFeedbackTokenResponse> => {
    // No auth required - public endpoint

    // Find the token
    const [feedback] = await db
      .select({
        id: csatResponses.id,
        rating: csatResponses.rating,
        tokenExpiresAt: csatResponses.tokenExpiresAt,
        tokenUsedAt: csatResponses.tokenUsedAt,
        issueId: csatResponses.issueId,
        issueTitle: issues.title,
        issueNumber: issues.issueNumber,
        organizationId: csatResponses.organizationId,
      })
      .from(csatResponses)
      .innerJoin(issues, eq(csatResponses.issueId, issues.id))
      .where(eq(csatResponses.token, data.token))
      .limit(1);

    if (!feedback) {
      return {
        valid: false,
        error: 'Invalid feedback link',
      };
    }

    // Check if already used
    if (feedback.tokenUsedAt || feedback.rating > 0) {
      return {
        valid: false,
        error: 'Feedback has already been submitted',
        alreadySubmitted: true,
      };
    }

    // Check if expired
    if (feedback.tokenExpiresAt && new Date() > feedback.tokenExpiresAt) {
      return {
        valid: false,
        error: 'This feedback link has expired',
        expired: true,
      };
    }

    return {
      valid: true,
      issue: {
        id: feedback.issueId,
        title: feedback.issueTitle,
        issueNumber: feedback.issueNumber,
      },
    };
  });

// ============================================================================
// SUBMIT PUBLIC FEEDBACK (Token-Based, No Auth)
// ============================================================================

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export const submitPublicFeedback = createServerFn({ method: 'POST' })
  .inputValidator(submitPublicFeedbackSchema)
  .handler(async ({ data }): Promise<SubmitPublicFeedbackResponse> => {
    // No auth required - public endpoint

    // Rate limit by token
    if (!checkRateLimit(data.token)) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    // Find the token
    const [existing] = await db
      .select({
        id: csatResponses.id,
        rating: csatResponses.rating,
        tokenExpiresAt: csatResponses.tokenExpiresAt,
        tokenUsedAt: csatResponses.tokenUsedAt,
        issueId: csatResponses.issueId,
        organizationId: csatResponses.organizationId,
      })
      .from(csatResponses)
      .where(eq(csatResponses.token, data.token))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Invalid feedback link', 'feedbackToken');
    }

    // Check if already used
    if (existing.tokenUsedAt || existing.rating > 0) {
      throw new ConflictError('Feedback has already been submitted');
    }

    // Check if expired
    if (existing.tokenExpiresAt && new Date() > existing.tokenExpiresAt) {
      throw new ValidationError('This feedback link has expired');
    }

    // Try to match email to customer
    let customerId: string | null = null;
    if (data.email) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, existing.organizationId),
            eq(customers.email, data.email)
          )
        )
        .limit(1);
      customerId = customer?.id ?? null;
    }

    // Update the feedback record
    const [updated] = await db
      .update(csatResponses)
      .set({
        rating: data.rating,
        comment: data.comment ?? null,
        source: 'public_form',
        submittedAt: new Date(),
        tokenUsedAt: new Date(),
        submittedByCustomerId: customerId,
        submittedByEmail: data.email ?? null,
        updatedAt: new Date(),
      })
      .where(eq(csatResponses.id, existing.id))
      .returning();

    return {
      success: true,
      message: 'Thank you for your feedback!',
      rating: updated.rating,
    };
  });
