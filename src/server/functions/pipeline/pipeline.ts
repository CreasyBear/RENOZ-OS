
/**
 * Pipeline Server Functions
 *
 * Server-side functions for opportunity lifecycle management.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * Australian B2B Context:
 * - All monetary values in AUD dollars
 * - 10% GST applied to quotes
 * - Pipeline stages: New (10%) → Qualified (30%) → Proposal (60%) → Negotiation (80%) → Won/Lost
 *
 * @see src/lib/schemas/pipeline.ts for validation schemas
 * @see drizzle/schema/pipeline.ts for database schema
 */

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, ilike, desc, asc, sql, inArray, gte, lte, isNull, isNotNull, ne, or, count, sum } from 'drizzle-orm';
import { containsPattern } from '@/lib/db/utils';
import { z } from 'zod';
import { db } from '@/lib/db';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import { pipelineLogger } from '@/lib/logger';
import {
  opportunities,
  opportunityActivities,
  quoteVersions,
  winLossReasons,
  customers,
  contacts,
  quotes,
} from 'drizzle/schema';
import { createOrder } from '@/server/functions/orders/orders';
import type { CreateOrder } from '@/lib/schemas/orders';
import type { QuoteLineItem } from '@/lib/schemas/pipeline';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
  opportunityListQuerySchema,
  opportunityCursorQuerySchema,
  opportunityParamsSchema,
  pipelineMetricsQuerySchema,
  STAGE_PROBABILITY_DEFAULTS,
  createOpportunityActivitySchema,
  opportunityActivityFilterSchema,
  opportunityActivityParamsSchema,
  type OpportunityStage,
  paginationSchema,
  percentageSchema,
} from '@/lib/schemas';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { opportunityStageSchema } from '@/lib/schemas/pipeline';
import { withAuth } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { verifyCustomerExists } from '@/server/functions/_shared/entity-verification';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// ============================================================================
// HELPERS
// ============================================================================

/** Normalize opportunity row: ensure date fields are Date | null at boundary (SCHEMA-TRACE §8) */
function normalizeOpportunityRow<
  T extends {
    expectedCloseDate?: Date | string | null;
    actualCloseDate?: Date | string | null;
    followUpDate?: Date | string | null;
  },
>(row: T): T & { expectedCloseDate: Date | null; actualCloseDate: Date | null; followUpDate: Date | null } {
  return {
    ...row,
    expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : null,
    actualCloseDate: row.actualCloseDate ? new Date(row.actualCloseDate) : null,
    followUpDate: row.followUpDate ? new Date(row.followUpDate) : null,
  };
}

/** Maximum follow-ups returned by getUpcomingFollowUps */
const MAX_FOLLOW_UPS = 1000;

/** Maximum activity timeline items returned by getActivityTimeline */
const MAX_ACTIVITY_TIMELINE_ITEMS = 500;

/**
 * Fields to exclude from activity change tracking (system-managed)
 */
const OPPORTUNITY_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'actualCloseDate',
];

// ============================================================================
// QUERY BUILDERS (DRY: Shared where clause patterns)
// ============================================================================

/**
 * Build base where clause for opportunity queries.
 * ALWAYS includes organizationId and deletedAt filters for security.
 */
function buildOpportunityBaseWhere(organizationId: string) {
  return and(
    eq(opportunities.organizationId, organizationId),
    isNull(opportunities.deletedAt)
  )!;
}

/**
 * Build where clause for opportunity by ID.
 * Includes organizationId and deletedAt filters.
 */
function buildOpportunityByIdWhere(id: string, organizationId: string) {
  return and(
    eq(opportunities.id, id),
    eq(opportunities.organizationId, organizationId),
    isNull(opportunities.deletedAt)
  )!;
}

/**
 * Build where clause for opportunity activities.
 * Includes organizationId filter.
 */
function buildActivityBaseWhere(organizationId: string) {
  return eq(opportunityActivities.organizationId, organizationId);
}

/**
 * Build where clause for activity by ID.
 * Includes organizationId filter.
 */
function buildActivityByIdWhere(id: string, organizationId: string) {
  return and(
    eq(opportunityActivities.id, id),
    eq(opportunityActivities.organizationId, organizationId)
  )!;
}

/**
 * Build where clause for quote by ID.
 * Includes organizationId and deletedAt filters.
 */
function buildQuoteByIdWhere(id: string, organizationId: string) {
  return and(
    eq(quotes.id, id),
    eq(quotes.organizationId, organizationId),
    isNull(quotes.deletedAt)
  )!;
}

/**
 * Build where clause for customer JOIN with security filters.
 * Ensures multi-tenant isolation in JOINs.
 */
function buildCustomerJoinWhere(organizationId: string) {
  return and(
    eq(customers.organizationId, organizationId),
    isNull(customers.deletedAt)
  )!;
}

/**
 * Calculate weighted value: value * probability / 100
 */
function calculateWeightedValue(value: number, probability: number | null): number {
  if (probability === null) return 0;
  return Math.round((value * probability) / 100);
}

/**
 * Type-safe stage update data.
 * Ensures type safety instead of using Record<string, unknown>.
 */
type StageUpdateData = {
  stage: OpportunityStage;
  probability: number;
  weightedValue: number;
  updatedBy: string;
  actualCloseDate?: string;
  daysInStage?: number;
  winLossReasonId?: string;
  lostNotes?: string;
  competitorName?: string;
};

/**
 * Prepare stage update data object.
 * Centralized logic for stage changes to avoid DRY violations.
 * Returns properly typed object instead of Record<string, unknown>.
 */
function prepareStageUpdateData(params: {
  stage: OpportunityStage;
  probability: number;
  value: number;
  currentStage: OpportunityStage;
  updatedBy: string;
  winLossReasonId?: string;
  lostNotes?: string;
  competitorName?: string;
}): StageUpdateData {
  const { stage, probability, value, currentStage, updatedBy, winLossReasonId, lostNotes, competitorName } = params;
  
  const weightedValue = calculateWeightedValue(value, probability);
  
  const updateData: StageUpdateData = {
    stage,
    probability,
    weightedValue,
    updatedBy,
  };

  // Set actual close date for won/lost
  if (stage === 'won' || stage === 'lost') {
    updateData.actualCloseDate = new Date().toISOString().split('T')[0];
  }

  // Reset days in stage if stage changed
  if (currentStage !== stage) {
    updateData.daysInStage = 0;
  }

  // Set win/loss specific fields
  if (winLossReasonId !== undefined) {
    updateData.winLossReasonId = winLossReasonId;
  }
  if (lostNotes !== undefined) {
    updateData.lostNotes = lostNotes;
  }
  if (competitorName !== undefined) {
    updateData.competitorName = competitorName;
  }

  return updateData;
}

/**
 * Log stage change activity.
 * Centralized activity logging for stage changes.
 */
async function logStageChangeActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    organizationId: string;
    opportunityId: string;
    previousStage: OpportunityStage;
    newStage: OpportunityStage;
    createdBy: string;
    isBulk?: boolean;
  }
): Promise<void> {
  const { organizationId, opportunityId, previousStage, newStage, createdBy, isBulk = false } = params;
  
  await tx.insert(opportunityActivities).values({
    organizationId,
    opportunityId,
    type: 'note',
    description: isBulk
      ? `Bulk stage change: ${previousStage} → ${newStage}`
      : `Stage changed from ${previousStage} to ${newStage}`,
    createdBy,
  });
}

/**
 * Get default probability for a stage
 */
function getDefaultProbability(stage: OpportunityStage): number {
  return STAGE_PROBABILITY_DEFAULTS[stage] ?? 10;
}

/**
 * Calculate conversion metrics from won/lost counts and values.
 * DRY helper to avoid repeating the same calculation pattern.
 * Accepts number | null (from Drizzle aggregates) and handles nulls properly.
 */
function calculateConversionMetrics(row: {
  wonCount: number | null;
  lostCount: number | null;
  wonValue: number | null;
  lostValue: number | null;
}): {
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
  conversionRate: number;
} {
  const wonCount = row.wonCount ?? 0;
  const lostCount = row.lostCount ?? 0;
  const total = wonCount + lostCount;
  return {
    wonCount,
    lostCount,
    wonValue: row.wonValue ?? 0,
    lostValue: row.lostValue ?? 0,
    conversionRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
  };
}

// ============================================================================
// STAGE TRANSITION VALIDATION (Business Rules)
// ============================================================================

/**
 * Valid stage transitions for opportunity workflow.
 * Based on PRD: New (10%) → Qualified (30%) → Proposal (60%) → Negotiation (80%) → Won/Lost
 */
const STAGE_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  new: ['qualified', 'won', 'lost'],
  qualified: ['proposal', 'won', 'lost'],
  proposal: ['negotiation', 'won', 'lost'],
  negotiation: ['won', 'lost'],
  won: [], // Terminal state - cannot transition from won
  lost: [], // Terminal state - cannot transition from lost
};

/**
 * Validate stage transition is allowed.
 * Prevents invalid business logic transitions (e.g., won → new).
 */
function validateStageTransition(current: OpportunityStage, next: OpportunityStage): boolean {
  return STAGE_TRANSITIONS[current]?.includes(next) ?? false;
}

// ============================================================================
// LIST OPPORTUNITIES
// ============================================================================

/**
 * List opportunities with filtering, pagination, and metrics
 */
export const listOpportunities = createServerFn({ method: 'GET' })
  .inputValidator(opportunityListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      stage,
      stages,
      customerId,
      assignedTo,
      minValue,
      maxValue,
      minProbability,
      maxProbability,
      expectedCloseDateFrom,
      expectedCloseDateTo,
      includeWonLost,
    } = data;

    // Build base where conditions using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    // Exclude won/lost by default unless includeWonLost is true
    if (!includeWonLost) {
      conditions.push(and(ne(opportunities.stage, 'won'), ne(opportunities.stage, 'lost'))!);
    }

    if (search) {
      conditions.push(ilike(opportunities.title, containsPattern(search)));
    }
    if (stage) {
      conditions.push(eq(opportunities.stage, stage));
    }
    if (stages && stages.length > 0) {
      conditions.push(inArray(opportunities.stage, stages));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }
    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (minValue !== undefined) {
      conditions.push(gte(opportunities.value, minValue));
    }
    if (maxValue !== undefined) {
      conditions.push(lte(opportunities.value, maxValue));
    }
    if (minProbability !== undefined) {
      conditions.push(gte(opportunities.probability, minProbability));
    }
    if (maxProbability !== undefined) {
      conditions.push(lte(opportunities.probability, maxProbability));
    }
    if (expectedCloseDateFrom) {
      conditions.push(
        gte(opportunities.expectedCloseDate, expectedCloseDateFrom.toISOString().split('T')[0])
      );
    }
    if (expectedCloseDateTo) {
      conditions.push(
        lte(opportunities.expectedCloseDate, expectedCloseDateTo.toISOString().split('T')[0])
      );
    }

    const whereClause = and(baseWhere, ...conditions);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(opportunities)
      .where(whereClause);
    
    // Validate count result exists
    if (!countResult[0]) {
      throw new Error('Failed to fetch opportunity count');
    }
    const totalItems = countResult[0].count ?? 0;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn =
      sortBy === 'title'
        ? opportunities.title
        : sortBy === 'value'
          ? opportunities.value
          : sortBy === 'expectedCloseDate'
            ? opportunities.expectedCloseDate
            : sortBy === 'stage'
              ? opportunities.stage
              : opportunities.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const rawItems = await db
      .select()
      .from(opportunities)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const items = rawItems.map(normalizeOpportunityRow);

    // Calculate metrics for current filter using Drizzle aggregates
    const metricsResult = await db
      .select({
        totalValue: sum(opportunities.value),
        weightedValue: sum(opportunities.weightedValue),
      })
      .from(opportunities)
      .where(whereClause);

    // Validate metrics result exists
    if (!metricsResult[0]) {
      throw new Error('Failed to fetch opportunity metrics');
    }
    // Drizzle's sum() returns number | null, ensure we convert to number safely
    const totalValueRaw = metricsResult[0].totalValue;
    const weightedValueRaw = metricsResult[0].weightedValue;
    const metrics = {
      totalValue: typeof totalValueRaw === 'number' ? totalValueRaw : Number(totalValueRaw) || 0,
      weightedValue: typeof weightedValueRaw === 'number' ? weightedValueRaw : Number(weightedValueRaw) || 0,
    };

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
      metrics,
    };
  });

/**
 * List opportunities with cursor pagination (recommended for large datasets).
 */
export const listOpportunitiesCursor = createServerFn({ method: 'GET' })
  .inputValidator(opportunityCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const {
      cursor,
      pageSize = 20,
      sortOrder = 'desc',
      search,
      stage,
      stages,
      customerId,
      assignedTo,
      minValue,
      maxValue,
      minProbability,
      maxProbability,
      expectedCloseDateFrom,
      expectedCloseDateTo,
      includeWonLost,
    } = data;

    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    if (!includeWonLost) {
      conditions.push(and(ne(opportunities.stage, 'won'), ne(opportunities.stage, 'lost'))!);
    }
    if (search) conditions.push(ilike(opportunities.title, containsPattern(search)));
    if (stage) conditions.push(eq(opportunities.stage, stage));
    if (stages?.length) conditions.push(inArray(opportunities.stage, stages));
    if (customerId) conditions.push(eq(opportunities.customerId, customerId));
    if (assignedTo) conditions.push(eq(opportunities.assignedTo, assignedTo));
    if (minValue !== undefined) conditions.push(gte(opportunities.value, minValue));
    if (maxValue !== undefined) conditions.push(lte(opportunities.value, maxValue));
    if (minProbability !== undefined) conditions.push(gte(opportunities.probability, minProbability));
    if (maxProbability !== undefined) conditions.push(lte(opportunities.probability, maxProbability));
    if (expectedCloseDateFrom) {
      conditions.push(
        gte(opportunities.expectedCloseDate, expectedCloseDateFrom.toISOString().split('T')[0])
      );
    }
    if (expectedCloseDateTo) {
      conditions.push(
        lte(opportunities.expectedCloseDate, expectedCloseDateTo.toISOString().split('T')[0])
      );
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(opportunities.createdAt, opportunities.id, cursorPosition, sortOrder)
        );
      }
    }

    const whereClause = and(baseWhere, ...conditions);
    const orderDir = sortOrder === 'asc' ? asc : desc;

    const rawItems = await db
      .select()
      .from(opportunities)
      .where(whereClause)
      .orderBy(orderDir(opportunities.createdAt), orderDir(opportunities.id))
      .limit(pageSize + 1);

    const items = rawItems.map(normalizeOpportunityRow);
    return buildStandardCursorResponse(items, pageSize);
  });

// ============================================================================
// GET OPPORTUNITY
// ============================================================================

/**
 * Cached data fetcher for getOpportunity.
 * React.cache deduplicates multiple calls with same (id, organizationId) within a request.
 */
const _getOpportunityCached = cache(
  async (id: string, organizationId: string) => {
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(buildOpportunityByIdWhere(id, organizationId))
      .limit(1);

    if (!opportunity) return null;

    const [
      customerResult,
      activities,
      versions,
      contactResult,
      winLossReasonResult,
    ] = await Promise.all([
      // Customer (required) - MUST include organizationId filter
      db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, opportunity.customerId),
            eq(customers.organizationId, organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1),
      
      // Activities (limited to prevent large payloads) - MUST include organizationId filter
      db
        .select()
        .from(opportunityActivities)
        .where(
          and(
            eq(opportunityActivities.opportunityId, id),
            eq(opportunityActivities.organizationId, organizationId)
          )
        )
        .orderBy(desc(opportunityActivities.createdAt))
        .limit(50),
      
      // Quote versions - MUST include organizationId filter
      db
        .select()
        .from(quoteVersions)
        .where(
          and(
            eq(quoteVersions.opportunityId, id),
            eq(quoteVersions.organizationId, organizationId)
          )
        )
        .orderBy(desc(quoteVersions.versionNumber))
        .limit(20),
      
      // Contact (conditional) - MUST include organizationId filter
      opportunity.contactId
        ? db
            .select()
            .from(contacts)
            .where(
              and(
                eq(contacts.id, opportunity.contactId),
                eq(contacts.organizationId, organizationId)
              )
            )
            .limit(1)
            .then(r => r[0] ?? null)
        : Promise.resolve(null),
      
      // Win/loss reason (conditional) - MUST include organizationId filter
      opportunity.winLossReasonId
        ? db
            .select()
            .from(winLossReasons)
            .where(
              and(
                eq(winLossReasons.id, opportunity.winLossReasonId),
                eq(winLossReasons.organizationId, organizationId)
              )
            )
            .limit(1)
            .then(r => r[0] ?? null)
        : Promise.resolve(null),
    ]);

    return {
      opportunity: normalizeOpportunityRow(opportunity),
      customer: customerResult[0] ?? null,
      contact: contactResult,
      activities,
      versions,
      winLossReason: winLossReasonResult,
    };
  }
);

/**
 * Get a single opportunity with full details including customer, contact, activities, and quote versions
 * 
 * PERFORMANCE: Uses React.cache for request deduplication; Promise.all for parallel query execution.
 */
export const getOpportunity = createServerFn({ method: 'GET' })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });
    const result = await _getOpportunityCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }
    return result;
  });

// ============================================================================
// CREATE OPPORTUNITY
// ============================================================================

/**
 * Create a new opportunity
 */
export const createOpportunity = createServerFn({ method: 'POST' })
  .inputValidator(createOpportunitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.create ?? 'opportunity:create',
    });
    const logger = createActivityLoggerWithContext(ctx);

    const {
      title,
      description,
      customerId,
      contactId,
      assignedTo,
      stage,
      probability,
      value,
      expectedCloseDate,
      metadata,
      tags,
    } = data;

    // Validate customer exists and belongs to organization
    await verifyCustomerExists(customerId, ctx.organizationId, {
      message: 'Customer does not exist or is not accessible',
    });

    // Use default probability for stage if not provided
    const actualProbability = probability ?? getDefaultProbability(stage);
    const weightedValue = calculateWeightedValue(value, actualProbability);

    const created = await db.transaction(async (tx) => {
      const result = await tx
        .insert(opportunities)
        .values({
          organizationId: ctx.organizationId,
          title,
          description: description ?? null,
          customerId,
          contactId: contactId ?? null,
          assignedTo: assignedTo ?? null,
          stage,
          probability: actualProbability,
          value,
          weightedValue,
          expectedCloseDate: expectedCloseDate ?? null,
          metadata: metadata ?? {},
          tags: tags ?? [],
          daysInStage: 0,
          version: 1,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'opportunity',
          entityId: result[0].id,
          action: 'upsert',
          payload: {
            title: result[0].title,
            subtitle: result[0].customerId ?? undefined,
            description: result[0].description ?? undefined,
          },
        },
        tx
      );

      return result[0] ?? null;
    });

    // Log opportunity creation
    logger.logAsync({
      entityType: 'opportunity',
      entityId: created.id,
      action: 'created',
      changes: computeChanges({
        before: null,
        after: created,
        excludeFields: OPPORTUNITY_EXCLUDED_FIELDS as never[],
      }),
      description: `Created opportunity: ${created.title} (${stage})`,
      metadata: {
        value: created.value,
        stage: created.stage,
        probability: created.probability ?? undefined,
        customerId: created.customerId,
      },
    });

    return { opportunity: created };
  });

// ============================================================================
// UPDATE OPPORTUNITY
// ============================================================================

/**
 * Update an opportunity
 */
export const updateOpportunity = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema.merge(updateOpportunitySchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    const { id, version, ...updates } = data;

    // Require version for optimistic locking — prevents stale-data overwrites
    if (version === undefined) {
      throw new ValidationError('Version is required for optimistic locking. Please refresh and try again.');
    }

    // Get current opportunity (for change tracking) using shared helper
    const current = await db
      .select()
      .from(opportunities)
      .where(buildOpportunityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const before = current[0];

    // Prepare update data (version will be incremented atomically in SQL)
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.customerId !== undefined) {
      // Validate customer exists before updating
      await verifyCustomerExists(updates.customerId, ctx.organizationId, {
        message: 'Customer does not exist or is not accessible',
      });
      updateData.customerId = updates.customerId;
    }
    if (updates.contactId !== undefined) updateData.contactId = updates.contactId;
    if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo;
    if (updates.value !== undefined) {
      updateData.value = updates.value;
      // Recalculate weighted value
      const prob = updates.probability ?? current[0].probability;
      updateData.weightedValue = calculateWeightedValue(updates.value, prob);
    }
    if (updates.probability !== undefined) {
      updateData.probability = updates.probability;
      // Recalculate weighted value
      const val = updates.value ?? current[0].value;
      updateData.weightedValue = calculateWeightedValue(val, updates.probability);
    }
    if (updates.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = updates.expectedCloseDate ?? null;
    }
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const updated = await db.transaction(async (tx) => {
      // Atomic optimistic locking: version check in WHERE clause + increment in SET
      const result = await tx
        .update(opportunities)
        .set({
          ...updateData,
          version: sql`${opportunities.version} + 1`,
        })
        .where(
          and(
            eq(opportunities.id, id),
            eq(opportunities.version, version)
          )
        )
        .returning();

      // If no rows updated, another user modified the record
      if (result.length === 0) {
        throw new ConflictError(
          'Opportunity has been modified by another user. Please refresh and try again.'
        );
      }

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'opportunity',
          entityId: result[0].id,
          action: 'upsert',
          payload: {
            title: result[0].title,
            subtitle: result[0].customerId ?? undefined,
            description: result[0].description ?? undefined,
          },
        },
        tx
      );

      return result[0] ?? null;
    });

    // Log opportunity update
    const changes = computeChanges({
      before,
      after: updated,
      excludeFields: OPPORTUNITY_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'opportunity',
        entityId: updated.id,
        action: 'updated',
        changes,
        description: `Updated opportunity: ${updated.title}`,
        metadata: {
          changedFields: changes.fields,
        },
      });
    }

    return { opportunity: updated };
  });

// ============================================================================
// UPDATE OPPORTUNITY STAGE
// ============================================================================

/**
 * Update opportunity stage with validation for win/loss
 */
export const updateOpportunityStage = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema.merge(updateOpportunityStageSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });
    const logger = createActivityLoggerWithContext(ctx);

    const { id, stage, probability, winLossReasonId, lostNotes, competitorName, version } = data;

    // Require version for optimistic locking — prevents stale-data overwrites
    if (version === undefined) {
      throw new ValidationError('Version is required for optimistic locking. Please refresh and try again.');
    }

    // Get current opportunity using shared helper
    const current = await db
      .select()
      .from(opportunities)
      .where(buildOpportunityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const before = current[0];
    const previousStage = before.stage;

    // Validate stage transition is allowed (business rule)
    if (!validateStageTransition(previousStage, stage)) {
      throw new ValidationError('Invalid stage transition', {
        stage: [`Cannot transition from '${previousStage}' to '${stage}'. Valid transitions: ${STAGE_TRANSITIONS[previousStage]?.join(', ') || 'none'}`],
      });
    }

    // Validate win/loss reason for closed stages
    if ((stage === 'won' || stage === 'lost') && !winLossReasonId) {
      // Allow closing without reason, but validate if provided
    }

    // Use default probability for new stage if not provided
    const actualProbability = probability ?? getDefaultProbability(stage);

    // Prepare update data using shared helper
    const updateData = prepareStageUpdateData({
      stage,
      probability: actualProbability,
      value: current[0].value,
      currentStage: before.stage,
      updatedBy: ctx.user.id,
      winLossReasonId,
      lostNotes,
      competitorName,
    });

    // Wrap update and activity log in transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Atomic optimistic locking: version check in WHERE clause + increment in SET
      const updateResult = await tx
        .update(opportunities)
        .set({
          ...updateData,
          version: sql`${opportunities.version} + 1`,
        })
        .where(
          and(
            eq(opportunities.id, id),
            eq(opportunities.version, version)
          )
        )
        .returning();

      // If no rows updated, another user modified the record
      if (updateResult.length === 0) {
        throw new ConflictError(
          'Opportunity has been modified by another user. Please refresh and try again.'
        );
      }

      // Log stage change activity within same transaction
      await logStageChangeActivity(tx, {
        organizationId: ctx.organizationId,
        opportunityId: id,
        previousStage: before.stage,
        newStage: stage,
        createdBy: ctx.user.id,
      });

      return updateResult[0] ?? null;
    });

    // Log stage change to audit trail
    logger.logAsync({
      entityType: 'opportunity',
      entityId: result.id,
      action: 'updated',
      changes: {
        before: { stage: previousStage },
        after: { stage: result.stage },
        fields: ['stage'],
      },
      description: `Stage changed: ${previousStage} → ${result.stage}${result.stage === 'won' ? ' (Won)' : result.stage === 'lost' ? ' (Lost)' : ''}`,
      metadata: {
        previousStage,
        newStage: result.stage,
        probability: result.probability ?? undefined,
      },
    });

    return { opportunity: result };
  });

// ============================================================================
// BULK UPDATE OPPORTUNITY STAGE
// ============================================================================

/**
 * Bulk update opportunity stages.
 * Updates multiple opportunities to a new stage in a single transaction.
 * Returns count of successful updates and list of failed opportunity IDs.
 */
export const bulkUpdateOpportunityStage = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      opportunityIds: z.array(z.string().uuid()).min(1),
      stage: opportunityStageSchema,
      probability: percentageSchema.optional(),
      winLossReasonId: z.string().uuid().optional(),
      lostNotes: z.string().max(2000).optional(),
      competitorName: z.string().max(100).optional(),
    })
  )
  .handler(
    async ({
      data: { opportunityIds, stage, probability, winLossReasonId, lostNotes, competitorName },
    }): Promise<{ updated: number; failed: string[] }> => {
      const ctx = await withAuth({
        permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
      });
      const logger = createActivityLoggerWithContext(ctx);

      if (opportunityIds.length === 0) {
        throw new ValidationError('No opportunity IDs provided', {
          opportunityIds: ['At least one opportunity ID is required'],
        });
      }

      const updated: string[] = [];
      const failed: string[] = [];

      // PERFORMANCE: Batch fetch all opportunities in a single query instead of N queries
      const existingOpportunities = await db
        .select()
        .from(opportunities)
        .where(
          and(
            buildOpportunityBaseWhere(ctx.organizationId),
            inArray(opportunities.id, opportunityIds)
          )
        );

      // Create lookup map for O(1) access
      const opportunityMap = new Map(existingOpportunities.map(o => [o.id, o]));

      // Use default probability for new stage if not provided
      const actualProbability = probability ?? getDefaultProbability(stage);

      // Track opportunities that passed validation (store version for optimistic locking)
      const validUpdates: Array<{
        opportunity: typeof existingOpportunities[0];
        version: number;
      }> = [];

      // Validate all opportunities first (in memory, no DB queries)
      for (const opportunityId of opportunityIds) {
        const existing = opportunityMap.get(opportunityId);

        if (!existing) {
          failed.push(`${opportunityId}: Opportunity not found`);
          continue;
        }

        // Validate stage transition is allowed (business rule)
        if (!validateStageTransition(existing.stage, stage)) {
          failed.push(
            `${opportunityId}: Invalid transition from '${existing.stage}' to '${stage}'. Valid transitions: ${STAGE_TRANSITIONS[existing.stage]?.join(', ') || 'none'}`
          );
          continue;
        }

        // Validate win/loss reason for closed stages
        if ((stage === 'won' || stage === 'lost') && !winLossReasonId) {
          // Allow closing without reason, but log warning
        }

        validUpdates.push({ 
          opportunity: existing,
          version: existing.version ?? 1, // Store version for optimistic locking
        });
      }

      // Process valid updates in a transaction for atomicity
      // NOTE: We use N queries in a loop because each row requires optimistic locking (version check).
      // This is necessary for data integrity but means we can't batch into a single UPDATE.
      // For large batches (100+), consider implementing a batch update pattern with CASE statements.
      if (validUpdates.length > 0) {
        await db.transaction(async (tx) => {
          for (const { opportunity: existing, version } of validUpdates) {
            try {
              // Prepare update data using shared helper
              const updateData = prepareStageUpdateData({
                stage,
                probability: actualProbability,
                value: existing.value,
                currentStage: existing.stage,
                updatedBy: ctx.user.id,
                winLossReasonId,
                lostNotes,
                competitorName,
              });

              // Atomic optimistic locking: version check in WHERE clause + increment in SET
              const updateResult = await tx
                .update(opportunities)
                .set({
                  ...updateData,
                  version: sql`${opportunities.version} + 1`,
                })
                .where(
                  and(
                    eq(opportunities.id, existing.id),
                    eq(opportunities.organizationId, ctx.organizationId),
                    eq(opportunities.version, version), // Optimistic lock: only update if version matches
                    isNull(opportunities.deletedAt)
                  )
                )
                .returning();

              if (updateResult.length > 0) {
                updated.push(existing.id);
              } else {
                const errorMsg = `Update failed (concurrent modification - version mismatch)`;
                failed.push(`${existing.id}: ${errorMsg}`);
                // Log version mismatch for observability (use logger for errors, not activity log)
                pipelineLogger.error('[Bulk Update] Version mismatch', undefined, {
                  opportunityId: existing.id,
                  expectedVersion: version,
                  stage,
                  organizationId: ctx.organizationId,
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              const errorStack = error instanceof Error ? error.stack : undefined;
              failed.push(`${existing.id}: ${errorMessage}`);
              
              // Log error with full context for debugging
              pipelineLogger.error('[Bulk Update] Exception', error, {
                opportunityId: existing.id,
                error: errorMessage,
                stack: errorStack,
                stage,
                organizationId: ctx.organizationId,
              });
            }
          }

          // Log single bulk activity record (not per-opportunity)
          if (updated.length > 0) {
            await tx.insert(opportunityActivities).values({
              organizationId: ctx.organizationId,
              opportunityId: updated[0], // Use first ID as representative
              type: 'note',
              description: `Bulk stage change: ${updated.length} opportunity${updated.length !== 1 ? 'ies' : ''} updated to ${stage}`,
              createdBy: ctx.user.id,
            });
          }
        });

        // Log bulk operation to audit trail with structured metadata
        if (updated.length > 0) {
          logger.logAsync({
            action: 'updated',
            entityType: 'opportunity',
            entityId: updated[0], // Use first updated ID as representative
            description: `Bulk stage change: ${updated.length} opportunity${updated.length !== 1 ? 'ies' : ''} updated to ${stage}`,
            metadata: {
              stage,
              previousStage: validUpdates[0]?.opportunity.stage,
              newStage: stage,
              recordCount: updated.length, // Use recordCount for bulk operations
            },
          });
        }
      }

      return { updated: updated.length, failed };
    }
  );

// ============================================================================
// DELETE OPPORTUNITY (Soft Delete)
// ============================================================================

/**
 * Soft delete an opportunity
 */
export const deleteOpportunity = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.delete ?? 'opportunity:delete',
    });
    const logger = createActivityLoggerWithContext(ctx);

    const { id } = data;

    // Verify ownership
    const current = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, id),
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const opportunityToDelete = current[0];

    await db.transaction(async (tx) => {
      await tx
        .update(opportunities)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(opportunities.id, id),
            eq(opportunities.organizationId, ctx.organizationId)
          )
        );

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'opportunity',
          entityId: id,
          action: 'delete',
        },
        tx
      );
    });

    // Log opportunity deletion
    logger.logAsync({
      entityType: 'opportunity',
      entityId: id,
      action: 'deleted',
      changes: computeChanges({
        before: opportunityToDelete,
        after: null,
        excludeFields: OPPORTUNITY_EXCLUDED_FIELDS as never[],
      }),
      description: `Deleted opportunity: ${opportunityToDelete.title}`,
      metadata: {
        stage: opportunityToDelete.stage,
        value: opportunityToDelete.value,
      },
    });

    return { success: true };
  });

// ============================================================================
// PIPELINE METRICS
// ============================================================================

/**
 * Get comprehensive pipeline metrics
 */
export const getPipelineMetrics = createServerFn({ method: 'GET' })
  .inputValidator(pipelineMetricsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo, assignedTo, customerId } = data;

    // Build base conditions using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    if (dateFrom) {
      conditions.push(gte(opportunities.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(opportunities.createdAt, new Date(dateTo)));
    }
    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }

    const whereClause = and(baseWhere, ...conditions);

    // Get totals
    const totalsResult = await db
      .select({
        totalValue: sum(opportunities.value),
        weightedValue: sum(opportunities.weightedValue),
        count: count(),
      })
      .from(opportunities)
      .where(whereClause);

    // Get by stage
    const byStageResult = await db
      .select({
        stage: opportunities.stage,
        count: count(),
        value: sum(opportunities.value),
        weightedValue: sum(opportunities.weightedValue),
        avgDaysInStage: sql<number>`COALESCE(AVG(${opportunities.daysInStage}), 0)`,
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(opportunities.stage);

    // Build byStage and avgDaysInStage objects
    // Note: Drizzle's count() and sum() return number | null, so we handle nulls explicitly
    const byStage: Record<string, { count: number; value: number; weightedValue: number }> = {};
    const avgDaysInStage: Record<string, number> = {};

    for (const row of byStageResult) {
      // Drizzle's sum() returns number | null, but can be string for very large numbers
      // Ensure we convert to number safely
      const count = typeof row.count === 'number' ? row.count : Number(row.count) || 0;
      const value = typeof row.value === 'number' ? row.value : Number(row.value) || 0;
      const weightedValue = typeof row.weightedValue === 'number' ? row.weightedValue : Number(row.weightedValue) || 0;
      
      byStage[row.stage] = {
        count,
        value,
        weightedValue,
      };
      avgDaysInStage[row.stage] = Math.round(row.avgDaysInStage ?? 0);
    }

    // Calculate conversion rate (won / (won + lost))
    const wonCount = byStage['won']?.count ?? 0;
    const lostCount = byStage['lost']?.count ?? 0;
    const totalClosed = wonCount + lostCount;
    const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    // Validate totals result exists
    if (!totalsResult[0]) {
      throw new Error('Failed to fetch pipeline metrics totals');
    }

    // Drizzle's sum() returns number | null, ensure we convert to number safely
    const totalValueRaw = totalsResult[0].totalValue;
    const weightedValueRaw = totalsResult[0].weightedValue;
    const countRaw = totalsResult[0].count;
    
    return {
      totalValue: typeof totalValueRaw === 'number' ? totalValueRaw : Number(totalValueRaw) || 0,
      weightedValue: typeof weightedValueRaw === 'number' ? weightedValueRaw : Number(weightedValueRaw) || 0,
      opportunityCount: typeof countRaw === 'number' ? countRaw : Number(countRaw) || 0,
      byStage,
      avgDaysInStage,
      conversionRate,
    };
  });

// ============================================================================
// CONVERT TO ORDER (Stub)
// ============================================================================

/**
 * Map quote line items to CreateOrder line items.
 * Uses latest quote version. Generates lineNumber as "1", "2", ...
 */
function quoteToOrderPayload(
  opportunity: { id: string; customerId: string | null },
  items: QuoteLineItem[]
): CreateOrder {
  if (!opportunity.customerId) {
    throw new ValidationError('Opportunity must have a customer to convert to order');
  }
  if (items.length === 0) {
    throw new ValidationError('Quote must have at least one line item to convert');
  }

  const lineItems = items.map((item, index) => {
    if (!item.description || item.quantity == null || item.unitPrice == null) {
      throw new ValidationError(
        `Quote line item ${index + 1} missing required fields (description, quantity, unitPrice)`
      );
    }
    return {
      lineNumber: (index + 1).toString(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productId: item.productId,
      sku: item.sku,
      discountPercent: item.discountPercent,
      taxType: 'gst' as const,
    };
  });

  return {
    customerId: opportunity.customerId,
    status: 'draft',
    paymentStatus: 'pending',
    shippingAmount: 0,
    metadata: { externalRef: `opportunity:${opportunity.id}` },
    lineItems,
  };
}

/**
 * Convert a won opportunity to an order
 *
 * Uses latest quote version. Maps quote line items to order line items.
 */
export const convertToOrder = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { id } = data;

    // Get opportunity
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(buildOpportunityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!opportunity) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    // Validate stage is "won"
    if (opportunity.stage !== 'won') {
      throw new ValidationError('Only won opportunities can be converted to orders');
    }

    // Check quote validity
    if (opportunity.quoteExpiresAt && new Date(opportunity.quoteExpiresAt) < new Date()) {
      throw new ValidationError(
        'Quote has expired. Please extend validity or create a new quote before converting.'
      );
    }

    // Fetch latest quote version (highest versionNumber)
    const [latestQuote] = await db
      .select({
        id: quoteVersions.id,
        items: quoteVersions.items,
      })
      .from(quoteVersions)
      .where(
        and(
          eq(quoteVersions.opportunityId, id),
          eq(quoteVersions.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(quoteVersions.versionNumber))
      .limit(1);

    if (!latestQuote || !latestQuote.items || latestQuote.items.length === 0) {
      throw new ValidationError(
        'No quote with line items found. Create and approve a quote before converting.'
      );
    }

    const payload = quoteToOrderPayload(
      { id: opportunity.id, customerId: opportunity.customerId },
      latestQuote.items as QuoteLineItem[]
    );

    const order = await createOrder({ data: payload });

    return {
      success: true,
      order,
      opportunityId: id,
    };
  });

// ============================================================================
// ACTIVITY LOGGING API
// ============================================================================

/**
 * List activities with filtering
 * Supports filtering by opportunity, type, date range, and completion status
 */
export const listActivities = createServerFn({ method: 'GET' })
  .inputValidator(paginationSchema.merge(opportunityActivityFilterSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const {
      page = 1,
      pageSize = 50,
      opportunityId,
      type,
      scheduledFrom,
      scheduledTo,
      completed,
    } = data;

    // Build conditions using shared helper
    const baseWhere = buildActivityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    if (opportunityId) {
      conditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }
    if (type) {
      conditions.push(eq(opportunityActivities.type, type));
    }
    if (scheduledFrom) {
      conditions.push(gte(opportunityActivities.scheduledAt, new Date(scheduledFrom)));
    }
    if (scheduledTo) {
      conditions.push(lte(opportunityActivities.scheduledAt, new Date(scheduledTo)));
    }
    if (completed === true) {
      conditions.push(isNotNull(opportunityActivities.completedAt));
    } else if (completed === false) {
      conditions.push(isNull(opportunityActivities.completedAt));
    }

    const whereClause = conditions.length > 0 
      ? and(baseWhere, ...conditions) 
      : baseWhere;

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(opportunityActivities)
      .where(whereClause);

    // Validate count result exists
    if (!countResult[0]) {
      throw new Error('Failed to fetch activity count');
    }
    // Drizzle's count() returns number | null, ensure we convert to number
    const totalItems = typeof countResult[0].count === 'number' ? countResult[0].count : Number(countResult[0].count) || 0;

    // Get activities with pagination
    const activities = await db
      .select()
      .from(opportunityActivities)
      .where(whereClause)
      .orderBy(desc(opportunityActivities.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: activities,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Get a single activity by ID
 */
export const getActivity = createServerFn({ method: 'GET' })
  .inputValidator(opportunityActivityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { id } = data;

    const activity = await db
      .select()
      .from(opportunityActivities)
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!activity[0]) {
      throw new NotFoundError('Activity not found', 'opportunityActivity');
    }

    return { activity: activity[0] };
  });

/**
 * Log a new activity for an opportunity
 * Validates type and opportunity ownership
 */
export const logActivity = createServerFn({ method: 'POST' })
  .inputValidator(createOpportunityActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { opportunityId, type, description, outcome, scheduledAt, completedAt } = data;

    // Wrap check-then-insert in a transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Verify opportunity exists and belongs to org
      const opportunity = await tx
        .select()
        .from(opportunities)
        .where(buildOpportunityByIdWhere(opportunityId, ctx.organizationId))
        .limit(1);

      if (!opportunity[0]) {
        throw new NotFoundError('Opportunity not found', 'opportunity');
      }

      // Create activity
      const [activity] = await tx
        .insert(opportunityActivities)
        .values({
          organizationId: ctx.organizationId,
          opportunityId,
          type,
          description,
          outcome: outcome ?? null,
          scheduledAt: scheduledAt ?? null,
          completedAt: completedAt ?? null,
          createdBy: ctx.user.id,
        })
        .returning();

      return activity;
    });

    return { activity: result };
  });

/**
 * Update an activity (for scheduling follow-ups or marking complete)
 */
export const updateActivity = createServerFn({ method: 'POST' })
  .inputValidator(
    opportunityActivityParamsSchema.merge(
      createOpportunityActivitySchema.partial().omit({ opportunityId: true })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { id, ...updates } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Activity not found', 'opportunityActivity');
    }

    // Prepare update
    const updateData: Record<string, unknown> = {};

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
    if (updates.scheduledAt !== undefined) updateData.scheduledAt = updates.scheduledAt;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;

    if (Object.keys(updateData).length === 0) {
      return { activity: current[0] };
    }

    // MUST include organizationId filter in update WHERE clause
    const result = await db
      .update(opportunityActivities)
      .set(updateData)
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .returning();

    return { activity: result[0] };
  });

/**
 * Mark an activity as complete
 */
export const completeActivity = createServerFn({ method: 'POST' })
  .inputValidator(
    opportunityActivityParamsSchema.extend({
      outcome: z.string().max(1000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { id, outcome } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Activity not found', 'opportunityActivity');
    }

    // MUST include organizationId filter in update WHERE clause
    const result = await db
      .update(opportunityActivities)
      .set({
        completedAt: new Date(),
        outcome: outcome ?? current[0].outcome,
      })
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .returning();

    return { activity: result[0] };
  });

/**
 * Delete an activity
 */
export const deleteActivity = createServerFn({ method: 'POST' })
  .inputValidator(opportunityActivityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.opportunity?.update ?? 'opportunity:update',
    });

    const { id } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(buildActivityByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Activity not found', 'opportunityActivity');
    }

    await db
      .delete(opportunityActivities)
      .where(buildActivityByIdWhere(id, ctx.organizationId));

    return { success: true };
  });

/**
 * Get activity timeline for an opportunity
 * Returns activities grouped by date with counts
 */
export const getActivityTimeline = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
      days: z.number().int().positive().default(30),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { opportunityId, days } = data;

    // Verify opportunity belongs to org
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new NotFoundError('Opportunity not found', 'opportunity');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get activities for timeline — bounded by LIMIT to prevent unbounded queries
    // MUST include organizationId filter for security
    const activities = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.opportunityId, opportunityId),
          eq(opportunityActivities.organizationId, ctx.organizationId),
          gte(opportunityActivities.createdAt, startDate)
        )
      )
      .orderBy(desc(opportunityActivities.createdAt))
      .limit(MAX_ACTIVITY_TIMELINE_ITEMS);

    // Group by date (JS grouping is acceptable for bounded data from the LIMIT above)
    const byDate: Record<string, typeof activities> = {};
    for (const activity of activities) {
      const dateKey = activity.createdAt.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      byDate[dateKey].push(activity);
    }

    return {
      activities,
      byDate,
      totalCount: activities.length,
    };
  });

/**
 * Get upcoming follow-ups (scheduled activities not yet completed)
 */
export const getUpcomingFollowUps = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(7),
      opportunityId: z.string().uuid().optional(),
      assignedTo: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { days, opportunityId, assignedTo } = data;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Build base conditions for activities
    const activityConditions = [
      eq(opportunityActivities.organizationId, ctx.organizationId),
      isNull(opportunityActivities.completedAt),
      isNotNull(opportunityActivities.scheduledAt),
      lte(opportunityActivities.scheduledAt, endDate),
    ];

    if (opportunityId) {
      activityConditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }

    // Build join conditions (always include organizationId for security)
    const joinConditions = [
      eq(opportunityActivities.opportunityId, opportunities.id),
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
    ];

    // Add assignedTo filter to join conditions if specified
    const whereConditions = [...activityConditions];
    if (assignedTo) {
      whereConditions.push(eq(opportunities.assignedTo, assignedTo));
    }

    const followUps = await db
      .select({
        activity: opportunityActivities,
        opportunity: {
          id: opportunities.id,
          title: opportunities.title,
          stage: opportunities.stage,
          assignedTo: opportunities.assignedTo,
        },
      })
      .from(opportunityActivities)
      .innerJoin(opportunities, and(...joinConditions))
      .where(and(...whereConditions))
      .orderBy(asc(opportunityActivities.scheduledAt))
      .limit(MAX_FOLLOW_UPS);

    // Separate overdue and upcoming
    const now = new Date();
    const overdue = followUps.filter((f) => f.activity.scheduledAt && f.activity.scheduledAt < now);
    const upcoming = followUps.filter(
      (f) => f.activity.scheduledAt && f.activity.scheduledAt >= now
    );

    return {
      followUps,
      overdue,
      upcoming,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
    };
  });

/**
 * Get activity analytics for a time period
 */
export const getActivityAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      opportunityId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo, opportunityId } = data;

    // Build conditions using shared helper
    const baseWhere = buildActivityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    if (dateFrom) {
      conditions.push(gte(opportunityActivities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(opportunityActivities.createdAt, dateTo));
    }
    if (opportunityId) {
      conditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }

    const whereClause = conditions.length > 0 ? and(baseWhere, ...conditions) : baseWhere;

    // Get totals by type
    const byTypeResult = await db
      .select({
        type: opportunityActivities.type,
        count: count(),
        completedCount: sql<number>`SUM(CASE WHEN ${opportunityActivities.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(opportunityActivities)
      .where(whereClause)
      .groupBy(opportunityActivities.type);

    const byType: Record<
      string,
      { count: number; completedCount: number; completionRate: number }
    > = {};
    let totalCount = 0;
    let totalCompleted = 0;

    for (const row of byTypeResult) {
      const count = row.count ?? 0;
      const completedCount = row.completedCount ?? 0;
      byType[row.type] = {
        count,
        completedCount,
        completionRate: count > 0 ? Math.round((completedCount / count) * 100) : 0,
      };
      totalCount += count;
      totalCompleted += completedCount;
    }

    // Get daily activity counts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyResult = await db
      .select({
        date: sql<string>`DATE(${opportunityActivities.createdAt})`,
        count: count(),
      })
      .from(opportunityActivities)
      .where(and(baseWhere, ...conditions, gte(opportunityActivities.createdAt, thirtyDaysAgo)))
      .groupBy(sql`DATE(${opportunityActivities.createdAt})`)
      .orderBy(sql`DATE(${opportunityActivities.createdAt})`);

    const dailyCounts = dailyResult.map((row) => ({
      date: row.date,
      count: row.count ?? 0,
    }));

    return {
      totalCount,
      totalCompleted,
      completionRate: totalCount > 0 ? Math.round((totalCompleted / totalCount) * 100) : 0,
      byType,
      dailyCounts,
    };
  });

// ============================================================================
// FORECASTING
// ============================================================================

import {
  forecastQuerySchema,
  velocityQuerySchema,
  revenueAttributionQuerySchema,
  type ForecastPeriod,
  type RevenueAttribution,
} from '@/lib/schemas';

/**
 * Get pipeline forecast by time periods.
 * Groups opportunities by expected close date into periods (month, quarter, week).
 */
export const getPipelineForecast = createServerFn({ method: 'GET' })
  .inputValidator(forecastQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { startDate, endDate, groupBy, includeWeighted, assignedTo, customerId, stages } = data;

    // Build base conditions using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [
      gte(opportunities.expectedCloseDate, startDate),
      lte(opportunities.expectedCloseDate, endDate),
    ];

    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }
    if (stages && stages.length > 0) {
      conditions.push(inArray(opportunities.stage, stages));
    }

    const whereClause = and(baseWhere, ...conditions);

    // Determine period expression based on groupBy
    let periodExpr: ReturnType<typeof sql>;
    switch (groupBy) {
      case 'quarter':
        periodExpr = sql<string>`TO_CHAR(${opportunities.expectedCloseDate}, 'YYYY-"Q"Q')`;
        break;
      case 'week':
        periodExpr = sql<string>`TO_CHAR(${opportunities.expectedCloseDate}, 'IYYY-"W"IW')`;
        break;
      case 'month':
      default:
        periodExpr = sql<string>`TO_CHAR(${opportunities.expectedCloseDate}, 'YYYY-MM')`;
        break;
    }

    // Get forecast data grouped by period
    const forecastResult = await db
      .select({
        period: periodExpr,
        periodStart: sql<Date>`MIN(${opportunities.expectedCloseDate})`,
        periodEnd: sql<Date>`MAX(${opportunities.expectedCloseDate})`,
        opportunityCount: count(),
        totalValue: sum(opportunities.value),
        weightedValue: sum(opportunities.weightedValue),
        wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
        lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
        avgProbability: sql<number>`COALESCE(AVG(${opportunities.probability}), 0)`,
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(periodExpr)
      .orderBy(periodExpr);

    const forecast: ForecastPeriod[] = forecastResult.map((row) => {
      // Drizzle's sum() returns number | null, but can be string for very large numbers
      // Ensure we convert to number safely
      const opportunityCount = typeof row.opportunityCount === 'number' ? row.opportunityCount : Number(row.opportunityCount) || 0;
      const totalValue = typeof row.totalValue === 'number' ? row.totalValue : Number(row.totalValue) || 0;
      const weightedValueRaw = typeof row.weightedValue === 'number' ? row.weightedValue : Number(row.weightedValue) || 0;
      
      return {
        period: String(row.period),
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        opportunityCount,
        totalValue,
        weightedValue: includeWeighted ? weightedValueRaw : totalValue,
        wonValue: row.wonValue ?? 0,
        lostValue: row.lostValue ?? 0,
        avgProbability: Math.round(row.avgProbability ?? 0),
      };
    });

    // Calculate summary
    const summary = forecast.reduce(
      (acc, period) => ({
        totalValue: acc.totalValue + period.totalValue,
        weightedValue: acc.weightedValue + period.weightedValue,
        opportunityCount: acc.opportunityCount + period.opportunityCount,
        wonValue: acc.wonValue + period.wonValue,
        lostValue: acc.lostValue + period.lostValue,
      }),
      { totalValue: 0, weightedValue: 0, opportunityCount: 0, wonValue: 0, lostValue: 0 }
    );

    return {
      forecast,
      summary,
      groupBy,
      dateRange: { startDate, endDate },
    };
  });

/**
 * Get forecast grouped by sales rep or customer.
 */
export const getForecastByEntity = createServerFn({ method: 'GET' })
  .inputValidator(forecastQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { startDate, endDate, groupBy, assignedTo, customerId } = data;

    // Build conditions using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [
      gte(opportunities.expectedCloseDate, startDate),
      lte(opportunities.expectedCloseDate, endDate),
    ];

    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }

    const whereClause = and(baseWhere, ...conditions);

    if (groupBy === 'rep') {
      // Group by assigned user
      const result = await db
        .select({
          entityId: opportunities.assignedTo,
          opportunityCount: count(),
          totalValue: sum(opportunities.value),
          weightedValue: sum(opportunities.weightedValue),
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
        })
        .from(opportunities)
        .where(whereClause)
        .groupBy(opportunities.assignedTo);

      return {
        groupBy: 'rep',
        data: result.map((row) => {
          // Drizzle's sum() returns number | null, ensure we convert to number safely
          const opportunityCount = typeof row.opportunityCount === 'number' ? row.opportunityCount : Number(row.opportunityCount) || 0;
          const totalValue = typeof row.totalValue === 'number' ? row.totalValue : Number(row.totalValue) || 0;
          const weightedValue = typeof row.weightedValue === 'number' ? row.weightedValue : Number(row.weightedValue) || 0;
          const wonValue = typeof row.wonValue === 'number' ? row.wonValue : Number(row.wonValue) || 0;
          const wonCount = typeof row.wonCount === 'number' ? row.wonCount : Number(row.wonCount) || 0;
          const lostCount = typeof row.lostCount === 'number' ? row.lostCount : Number(row.lostCount) || 0;
          const totalClosed = wonCount + lostCount;
          
          return {
            entityId: row.entityId,
            opportunityCount,
            totalValue,
            weightedValue,
            wonValue,
            wonCount,
            lostCount,
            conversionRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
          };
        }),
      };
    } else if (groupBy === 'customer') {
      // Group by customer with join to get customer name
      const result = await db
        .select({
          entityId: opportunities.customerId,
          customerName: customers.name,
          opportunityCount: count(),
          totalValue: sum(opportunities.value),
          weightedValue: sum(opportunities.weightedValue),
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
        })
        .from(opportunities)
        .leftJoin(
          customers,
          and(
            eq(opportunities.customerId, customers.id),
            buildCustomerJoinWhere(ctx.organizationId)
          )
        )
        .where(whereClause)
        .groupBy(opportunities.customerId, customers.name);

      return {
        groupBy: 'customer',
        data: result.map((row) => ({
          entityId: row.entityId,
          entityName: row.customerName,
          opportunityCount: Number(row.opportunityCount ?? 0),
          totalValue: Number(row.totalValue ?? 0),
          weightedValue: Number(row.weightedValue ?? 0),
          wonValue: Number(row.wonValue),
          wonCount: Number(row.wonCount),
          lostCount: Number(row.lostCount),
          conversionRate:
            Number(row.wonCount) + Number(row.lostCount) > 0
              ? Math.round(
                  (Number(row.wonCount) / (Number(row.wonCount) + Number(row.lostCount))) * 100
                )
              : 0,
        })),
      };
    }

    return { groupBy, data: [] };
  });

/**
 * Get pipeline velocity metrics.
 * Measures how quickly deals move through the pipeline.
 */
export const getPipelineVelocity = createServerFn({ method: 'GET' })
  .inputValidator(velocityQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo } = data;

    // Build base conditions using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [];

    if (dateFrom) {
      conditions.push(gte(opportunities.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(opportunities.createdAt, new Date(dateTo)));
    }

    const whereClause = and(baseWhere, ...conditions);

    // Get won opportunities for sales cycle calculation
    // MUST include organizationId filter
    const wonOpportunities = await db
      .select({
        avgDealSize: sql<number>`COALESCE(AVG(${opportunities.value}), 0)`,
        avgSalesCycle: sql<number>`COALESCE(AVG(
          CASE WHEN ${opportunities.actualCloseDate} IS NOT NULL
          THEN EXTRACT(EPOCH FROM (${opportunities.actualCloseDate} - ${opportunities.createdAt})) / 86400
          ELSE NULL END
        ), 0)`,
        wonCount: count(),
        totalWonValue: sum(opportunities.value),
      })
      .from(opportunities)
      .where(and(whereClause, eq(opportunities.stage, 'won')));

    // Get overall counts for rates
    const allOpportunities = await db
      .select({
        totalCount: count(),
        wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
        lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
      })
      .from(opportunities)
      .where(whereClause);

    // Get average time in each stage
    const stageMetrics = await db
      .select({
        stage: opportunities.stage,
        avgDaysInStage: sql<number>`COALESCE(AVG(${opportunities.daysInStage}), 0)`,
        count: count(),
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(opportunities.stage);

    const avgTimeInStage: Record<string, number> = {};
    const stageConversionRates: Record<string, number> = {};

    // Validate results exist
    if (!allOpportunities[0]) {
      throw new Error('Failed to fetch pipeline velocity metrics');
    }
    if (!wonOpportunities[0]) {
      throw new Error('Failed to fetch won opportunities metrics');
    }

    // Calculate stage conversion rates (simplified - % in each stage)
    // Drizzle's count() returns number | null, ensure we convert to number
    const totalCountRaw = allOpportunities[0].totalCount;
    const totalCount = typeof totalCountRaw === 'number' ? totalCountRaw : Number(totalCountRaw) || 0;
    
    for (const row of stageMetrics) {
      avgTimeInStage[row.stage] = Math.round(row.avgDaysInStage ?? 0);
      const countRaw = row.count;
      const count = typeof countRaw === 'number' ? countRaw : Number(countRaw) || 0;
      stageConversionRates[row.stage] =
        totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    }

    const wonCountRaw = allOpportunities[0].wonCount;
    const lostCountRaw = allOpportunities[0].lostCount;
    const wonCount = typeof wonCountRaw === 'number' ? wonCountRaw : Number(wonCountRaw) || 0;
    const lostCount = typeof lostCountRaw === 'number' ? lostCountRaw : Number(lostCountRaw) || 0;
    const closedCount = wonCount + lostCount;

    // Calculate pipeline velocity (won value per day)
    const daysInRange =
      dateFrom && dateTo
        ? Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000))
        : 30; // Default 30 days
    // Drizzle's sum() returns number | null, ensure we convert to number
    const totalWonValueRaw = wonOpportunities[0].totalWonValue;
    const totalWonValue = typeof totalWonValueRaw === 'number' ? totalWonValueRaw : Number(totalWonValueRaw) || 0;
    const pipelineVelocity = Math.round(totalWonValue / daysInRange);

    return {
      avgDealSize: Math.round(wonOpportunities[0].avgDealSize ?? 0),
      avgSalesCycle: Math.round(wonOpportunities[0].avgSalesCycle ?? 0),
      avgTimeInStage,
      winRate: closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0,
      lossRate: closedCount > 0 ? Math.round((lostCount / closedCount) * 100) : 0,
      stageConversionRates,
      pipelineVelocity,
    };
  });

/**
 * Get revenue attribution by rep, customer, source, or month.
 * Shows where won revenue came from.
 */
export const getRevenueAttribution = createServerFn({ method: 'GET' })
  .inputValidator(revenueAttributionQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? 'opportunity:read' });

    const { dateFrom, dateTo, groupBy } = data;

    // Base conditions for closed opportunities in date range using shared helper
    const baseWhere = buildOpportunityBaseWhere(ctx.organizationId);
    const conditions: ReturnType<typeof and>[] = [
      gte(opportunities.actualCloseDate, dateFrom),
      lte(opportunities.actualCloseDate, dateTo),
      or(eq(opportunities.stage, 'won'), eq(opportunities.stage, 'lost')),
    ];

    const whereClause = and(baseWhere, ...conditions);

    let result: RevenueAttribution[] = [];

    if (groupBy === 'rep') {
      const queryResult = await db
        .select({
          groupId: opportunities.assignedTo,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
          lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
        })
        .from(opportunities)
        .where(whereClause)
        .groupBy(opportunities.assignedTo);

      result = queryResult.map((row) => {
        const metrics = calculateConversionMetrics({
          wonCount: row.wonCount ?? 0,
          lostCount: row.lostCount ?? 0,
          wonValue: row.wonValue ?? 0,
          lostValue: row.lostValue ?? 0,
        });
        return {
          group: row.groupId ?? 'Unassigned',
          groupId: row.groupId ?? undefined,
          ...metrics,
          pipelineCount: 0,
          pipelineValue: 0,
        };
      });
    } else if (groupBy === 'customer') {
      const queryResult = await db
        .select({
          groupId: opportunities.customerId,
          groupName: customers.name,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
          lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
        })
        .from(opportunities)
        .leftJoin(
          customers,
          and(
            eq(opportunities.customerId, customers.id),
            buildCustomerJoinWhere(ctx.organizationId)
          )
        )
        .where(whereClause)
        .groupBy(opportunities.customerId, customers.name);

      result = queryResult.map((row) => {
        const metrics = calculateConversionMetrics({
          wonCount: row.wonCount ?? 0,
          lostCount: row.lostCount ?? 0,
          wonValue: row.wonValue ?? 0,
          lostValue: row.lostValue ?? 0,
        });
        return {
          group: row.groupName ?? 'Unknown',
          groupId: row.groupId,
          ...metrics,
          pipelineCount: 0,
          pipelineValue: 0,
        };
      });
    } else if (groupBy === 'month') {
      const queryResult = await db
        .select({
          group: sql<string>`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
          lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
        })
        .from(opportunities)
        .where(whereClause)
        .groupBy(sql`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${opportunities.actualCloseDate}, 'YYYY-MM')`);

      result = queryResult.map((row) => {
        const metrics = calculateConversionMetrics({
          wonCount: row.wonCount ?? 0,
          lostCount: row.lostCount ?? 0,
          wonValue: row.wonValue ?? 0,
          lostValue: row.lostValue ?? 0,
        });
        return {
          group: row.group,
          ...metrics,
          pipelineCount: 0,
          pipelineValue: 0,
        };
      });
    }

    // Calculate totals
    const totals = result.reduce(
      (acc, row) => ({
        wonCount: acc.wonCount + row.wonCount,
        wonValue: acc.wonValue + row.wonValue,
        lostCount: acc.lostCount + row.lostCount,
        lostValue: acc.lostValue + row.lostValue,
      }),
      { wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 }
    );

    return {
      groupBy,
      items: result, // Renamed from 'data' to 'items' for clarity and to avoid nested data.data access
      totals: {
        ...totals,
        conversionRate:
          totals.wonCount + totals.lostCount > 0
            ? Math.round((totals.wonCount / (totals.wonCount + totals.lostCount)) * 100)
            : 0,
      },
      dateRange: { dateFrom, dateTo },
    };
  });

// ============================================================================
// DELETE QUOTE (Soft Delete)
// ============================================================================

/**
 * Fields to exclude from quote activity change tracking (system-managed)
 */
const QUOTE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
];

/**
 * Soft delete a quote.
 * Cannot delete quotes that have been accepted.
 */
export const deleteQuote = createServerFn({ method: 'POST' })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({
      permission: PERMISSIONS.quote.delete,
    });
    const logger = createActivityLoggerWithContext(ctx);

    const { id } = data;

    // Verify ownership
    const current = await db
      .select()
      .from(quotes)
        .where(buildQuoteByIdWhere(id, ctx.organizationId))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError('Quote not found', 'quote');
    }

    const quoteToDelete = current[0];

    // Guard: Cannot delete accepted quotes
    if (quoteToDelete.status === 'accepted') {
      throw new ValidationError('Cannot delete an accepted quote');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(quotes)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(quotes.id, id));

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'quote',
          entityId: id,
          action: 'delete',
        },
        tx
      );
    });

    // Log quote deletion
    logger.logAsync({
      entityType: 'quote',
      entityId: id,
      action: 'deleted',
      changes: computeChanges({
        before: quoteToDelete,
        after: null,
        excludeFields: QUOTE_EXCLUDED_FIELDS as never[],
      }),
      description: `Deleted quote: ${quoteToDelete.quoteNumber}`,
      metadata: {
        status: quoteToDelete.status,
        total: quoteToDelete.total,
      },
    });

    return { success: true };
  });
