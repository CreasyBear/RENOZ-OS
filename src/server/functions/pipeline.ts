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
 * - All monetary values in AUD cents
 * - 10% GST applied to quotes
 * - Pipeline stages: New (10%) → Qualified (30%) → Proposal (60%) → Negotiation (80%) → Won/Lost
 *
 * @see src/lib/schemas/pipeline.ts for validation schemas
 * @see drizzle/schema/pipeline.ts for database schema
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, ilike, desc, asc, sql, inArray, gte, lte, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  opportunities,
  opportunityActivities,
  quoteVersions,
  winLossReasons,
  customers,
  contacts,
} from "@/../drizzle/schema";
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
  opportunityListQuerySchema,
  opportunityParamsSchema,
  pipelineMetricsQuerySchema,
  STAGE_PROBABILITY_DEFAULTS,
  createOpportunityActivitySchema,
  opportunityActivityFilterSchema,
  opportunityActivityParamsSchema,
  type OpportunityStage,
} from "@/lib/schemas/pipeline";
import { paginationSchema } from "@/lib/schemas/patterns";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate weighted value: value * probability / 100
 */
function calculateWeightedValue(value: number, probability: number | null): number {
  if (probability === null) return 0;
  return Math.round((value * probability) / 100);
}

/**
 * Get default probability for a stage
 */
function getDefaultProbability(stage: OpportunityStage): number {
  return STAGE_PROBABILITY_DEFAULTS[stage] ?? 10;
}

// ============================================================================
// LIST OPPORTUNITIES
// ============================================================================

/**
 * List opportunities with filtering, pagination, and metrics
 */
export const listOpportunities = createServerFn({ method: "GET" })
  .inputValidator(opportunityListQuerySchema)
  // @ts-expect-error - TanStack Start type issue: handler expects ServerFn type but we provide function with ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

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

    // Build where conditions - ALWAYS include organizationId for isolation
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
    ];

    // Exclude won/lost by default unless includeWonLost is true
    if (!includeWonLost) {
      conditions.push(
        and(
          ne(opportunities.stage, "won"),
          ne(opportunities.stage, "lost")
        )!
      );
    }

    if (search) {
      conditions.push(ilike(opportunities.title, `%${search}%`));
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
      conditions.push(gte(opportunities.expectedCloseDate, expectedCloseDateFrom.toISOString().split('T')[0]));
    }
    if (expectedCloseDateTo) {
      conditions.push(lte(opportunities.expectedCloseDate, expectedCloseDateTo.toISOString().split('T')[0]));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn = sortBy === "title" ? opportunities.title
      : sortBy === "value" ? opportunities.value
      : sortBy === "expectedCloseDate" ? opportunities.expectedCloseDate
      : sortBy === "stage" ? opportunities.stage
      : opportunities.createdAt;
    const orderDirection = sortOrder === "asc" ? asc : desc;

    const items = await db
      .select()
      .from(opportunities)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    // Calculate metrics for current filter
    const metricsResult = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
      })
      .from(opportunities)
      .where(whereClause);

    const metrics = {
      totalValue: Number(metricsResult[0]?.totalValue ?? 0),
      weightedValue: Number(metricsResult[0]?.weightedValue ?? 0),
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

// ============================================================================
// GET OPPORTUNITY
// ============================================================================

/**
 * Get a single opportunity with full details including customer, contact, activities, and quote versions
 */
export const getOpportunity = createServerFn({ method: "GET" })
  .inputValidator(opportunityParamsSchema)
  // @ts-expect-error - TanStack Start type issue: handler expects ServerFn type but we provide function with ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { id } = data;

    // Get opportunity with organization check
    const opportunity = await db
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

    if (!opportunity[0]) {
      throw new Error("Opportunity not found");
    }

    // Get customer
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, opportunity[0].customerId))
      .limit(1);

    // Get contact if exists
    let contact = null;
    if (opportunity[0].contactId) {
      const contactResult = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, opportunity[0].contactId))
        .limit(1);
      contact = contactResult[0] ?? null;
    }

    // Get activities
    const activities = await db
      .select()
      .from(opportunityActivities)
      .where(eq(opportunityActivities.opportunityId, id))
      .orderBy(desc(opportunityActivities.createdAt))
      .limit(50);

    // Get quote versions
    const versions = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.opportunityId, id))
      .orderBy(desc(quoteVersions.versionNumber))
      .limit(20);

    // Get win/loss reason if applicable
    let winLossReason = null;
    if (opportunity[0].winLossReasonId) {
      const reasonResult = await db
        .select()
        .from(winLossReasons)
        .where(eq(winLossReasons.id, opportunity[0].winLossReasonId))
        .limit(1);
      winLossReason = reasonResult[0] ?? null;
    }

    return {
      opportunity: opportunity[0],
      customer: customer[0] ?? null,
      contact,
      activities,
      versions,
      winLossReason,
    };
  });

// ============================================================================
// CREATE OPPORTUNITY
// ============================================================================

/**
 * Create a new opportunity
 */
export const createOpportunity = createServerFn({ method: "POST" })
  .inputValidator(createOpportunitySchema)
  // @ts-expect-error - TanStack Start type issue: handler expects ServerFn type but we provide function with ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.create ?? "opportunity:create" });

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

    // Use default probability for stage if not provided
    const actualProbability = probability ?? getDefaultProbability(stage);
    const weightedValue = calculateWeightedValue(value, actualProbability);

    const result = await db
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
        expectedCloseDate: expectedCloseDate?.toISOString().split('T')[0] ?? null,
        metadata: metadata ?? {},
        tags: tags ?? [],
        daysInStage: 0,
        version: 1,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { opportunity: result[0] };
  });

// ============================================================================
// UPDATE OPPORTUNITY
// ============================================================================

/**
 * Update an opportunity
 */
export const updateOpportunity = createServerFn({ method: "POST" })
  .inputValidator(opportunityParamsSchema.merge(updateOpportunitySchema))
  // @ts-expect-error - TanStack Start type issue: handler expects ServerFn type but we provide function with ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id, version, ...updates } = data;

    // Get current opportunity
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
      throw new Error("Opportunity not found");
    }

    // Optimistic locking check
    if (version !== undefined && current[0].version !== version) {
      throw new Error("Opportunity has been modified by another user. Please refresh and try again.");
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      version: current[0].version + 1,
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.customerId !== undefined) updateData.customerId = updates.customerId;
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
      updateData.expectedCloseDate = updates.expectedCloseDate?.toISOString().split('T')[0] ?? null;
    }
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const result = await db
      .update(opportunities)
      .set(updateData)
      .where(eq(opportunities.id, id))
      .returning();

    return { opportunity: result[0] };
  });

// ============================================================================
// UPDATE OPPORTUNITY STAGE
// ============================================================================

/**
 * Update opportunity stage with validation for win/loss
 */
export const updateOpportunityStage = createServerFn({ method: "POST" })
  .inputValidator(opportunityParamsSchema.merge(updateOpportunityStageSchema))
  // @ts-expect-error - TanStack Start type issue: handler expects ServerFn type but we provide function with ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id, stage, probability, winLossReasonId, lostNotes, competitorName, version } = data;

    // Get current opportunity
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
      throw new Error("Opportunity not found");
    }

    // Optimistic locking check
    if (version !== undefined && current[0].version !== version) {
      throw new Error("Opportunity has been modified by another user. Please refresh and try again.");
    }

    // Validate win/loss reason for closed stages
    if ((stage === "won" || stage === "lost") && !winLossReasonId) {
      // Allow closing without reason, but validate if provided
    }

    // Use default probability for new stage if not provided
    const actualProbability = probability ?? getDefaultProbability(stage);
    const weightedValue = calculateWeightedValue(current[0].value, actualProbability);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      stage,
      probability: actualProbability,
      weightedValue,
      updatedBy: ctx.user.id,
      version: current[0].version + 1,
    };

    // Set actual close date for won/lost
    if (stage === "won" || stage === "lost") {
      updateData.actualCloseDate = new Date().toISOString().split('T')[0];
    }

    // Reset days in stage if stage changed
    if (current[0].stage !== stage) {
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

    const result = await db
      .update(opportunities)
      .set(updateData)
      .where(eq(opportunities.id, id))
      .returning();

    // Log stage change activity
    await db.insert(opportunityActivities).values({
      organizationId: ctx.organizationId,
      opportunityId: id,
      type: "note",
      description: `Stage changed from ${current[0].stage} to ${stage}`,
      createdBy: ctx.user.id,
    });

    return { opportunity: result[0] };
  });

// ============================================================================
// DELETE OPPORTUNITY (Soft Delete)
// ============================================================================

/**
 * Soft delete an opportunity
 */
export const deleteOpportunity = createServerFn({ method: "POST" })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.delete ?? "opportunity:delete" });

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
      throw new Error("Opportunity not found");
    }

    // Soft delete
    await db
      .update(opportunities)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(opportunities.id, id));

    return { success: true };
  });

// ============================================================================
// PIPELINE METRICS
// ============================================================================

/**
 * Get comprehensive pipeline metrics
 */
export const getPipelineMetrics = createServerFn({ method: "GET" })
  .inputValidator(pipelineMetricsQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { dateFrom, dateTo, assignedTo, customerId } = data;

    // Build base conditions
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
    ];

    if (dateFrom) {
      conditions.push(gte(opportunities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(opportunities.createdAt, dateTo));
    }
    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }

    const whereClause = and(...conditions);

    // Get totals
    const totalsResult = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(opportunities)
      .where(whereClause);

    // Get by stage
    const byStageResult = await db
      .select({
        stage: opportunities.stage,
        count: sql<number>`COUNT(*)`,
        value: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
        avgDaysInStage: sql<number>`COALESCE(AVG(${opportunities.daysInStage}), 0)`,
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(opportunities.stage);

    // Build byStage and avgDaysInStage objects
    const byStage: Record<string, { count: number; value: number; weightedValue: number }> = {};
    const avgDaysInStage: Record<string, number> = {};

    for (const row of byStageResult) {
      byStage[row.stage] = {
        count: Number(row.count),
        value: Number(row.value),
        weightedValue: Number(row.weightedValue),
      };
      avgDaysInStage[row.stage] = Math.round(Number(row.avgDaysInStage));
    }

    // Calculate conversion rate (won / (won + lost))
    const wonCount = byStage["won"]?.count ?? 0;
    const lostCount = byStage["lost"]?.count ?? 0;
    const totalClosed = wonCount + lostCount;
    const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    return {
      totalValue: Number(totalsResult[0]?.totalValue ?? 0),
      weightedValue: Number(totalsResult[0]?.weightedValue ?? 0),
      opportunityCount: Number(totalsResult[0]?.count ?? 0),
      byStage,
      avgDaysInStage,
      conversionRate,
    };
  });

// ============================================================================
// CONVERT TO ORDER (Stub)
// ============================================================================

/**
 * Convert a won opportunity to an order
 * Note: Full implementation depends on Orders domain
 */
export const convertToOrder = createServerFn({ method: "POST" })
  .inputValidator(opportunityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id } = data;

    // Get opportunity
    const opportunity = await db
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

    if (!opportunity[0]) {
      throw new Error("Opportunity not found");
    }

    // Validate stage is "won"
    if (opportunity[0].stage !== "won") {
      throw new Error("Only won opportunities can be converted to orders");
    }

    // Check quote validity
    if (opportunity[0].quoteExpiresAt && new Date(opportunity[0].quoteExpiresAt) < new Date()) {
      throw new Error("Quote has expired. Please extend validity or create a new quote before converting.");
    }

    // TODO: Implement order creation when Orders domain is ready
    // For now, return a placeholder response
    return {
      success: true,
      message: "Order conversion endpoint ready - awaiting Orders domain integration",
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
export const listActivities = createServerFn({ method: "GET" })
  .inputValidator(
    paginationSchema.merge(opportunityActivityFilterSchema)
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const {
      page = 1,
      pageSize = 50,
      opportunityId,
      type,
      scheduledFrom,
      scheduledTo,
      completed,
    } = data;

    // Build conditions
    const conditions = [
      eq(opportunityActivities.organizationId, ctx.organizationId),
    ];

    if (opportunityId) {
      conditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }
    if (type) {
      conditions.push(eq(opportunityActivities.type, type));
    }
    if (scheduledFrom) {
      conditions.push(gte(opportunityActivities.scheduledAt, scheduledFrom));
    }
    if (scheduledTo) {
      conditions.push(lte(opportunityActivities.scheduledAt, scheduledTo));
    }
    if (completed === true) {
      conditions.push(sql`${opportunityActivities.completedAt} IS NOT NULL`);
    } else if (completed === false) {
      conditions.push(isNull(opportunityActivities.completedAt));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(opportunityActivities)
      .where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

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
export const getActivity = createServerFn({ method: "GET" })
  .inputValidator(opportunityActivityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { id } = data;

    const activity = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.id, id),
          eq(opportunityActivities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!activity[0]) {
      throw new Error("Activity not found");
    }

    return { activity: activity[0] };
  });

/**
 * Log a new activity for an opportunity
 * Validates type and opportunity ownership
 */
export const logActivity = createServerFn({ method: "POST" })
  .inputValidator(createOpportunityActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const {
      opportunityId,
      type,
      description,
      outcome,
      scheduledAt,
      completedAt,
    } = data;

    // Verify opportunity exists and belongs to org
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.organizationId, ctx.organizationId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1);

    if (!opportunity[0]) {
      throw new Error("Opportunity not found");
    }

    // Create activity
    const result = await db
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

    return { activity: result[0] };
  });

/**
 * Update an activity (for scheduling follow-ups or marking complete)
 */
export const updateActivity = createServerFn({ method: "POST" })
  .inputValidator(
    opportunityActivityParamsSchema.merge(
      createOpportunityActivitySchema.partial().omit({ opportunityId: true })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id, ...updates } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.id, id),
          eq(opportunityActivities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!current[0]) {
      throw new Error("Activity not found");
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

    const result = await db
      .update(opportunityActivities)
      .set(updateData)
      .where(eq(opportunityActivities.id, id))
      .returning();

    return { activity: result[0] };
  });

/**
 * Mark an activity as complete
 */
export const completeActivity = createServerFn({ method: "POST" })
  .inputValidator(
    opportunityActivityParamsSchema.extend({
      outcome: z.string().max(1000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id, outcome } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.id, id),
          eq(opportunityActivities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!current[0]) {
      throw new Error("Activity not found");
    }

    const result = await db
      .update(opportunityActivities)
      .set({
        completedAt: new Date(),
        outcome: outcome ?? current[0].outcome,
      })
      .where(eq(opportunityActivities.id, id))
      .returning();

    return { activity: result[0] };
  });

/**
 * Delete an activity
 */
export const deleteActivity = createServerFn({ method: "POST" })
  .inputValidator(opportunityActivityParamsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.update ?? "opportunity:update" });

    const { id } = data;

    // Verify activity exists and belongs to org
    const current = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.id, id),
          eq(opportunityActivities.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!current[0]) {
      throw new Error("Activity not found");
    }

    await db
      .delete(opportunityActivities)
      .where(eq(opportunityActivities.id, id));

    return { success: true };
  });

/**
 * Get activity timeline for an opportunity
 * Returns activities grouped by date with counts
 */
export const getActivityTimeline = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      opportunityId: z.string().uuid(),
      days: z.number().int().positive().default(30),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

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
      throw new Error("Opportunity not found");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get activities for timeline
    const activities = await db
      .select()
      .from(opportunityActivities)
      .where(
        and(
          eq(opportunityActivities.opportunityId, opportunityId),
          gte(opportunityActivities.createdAt, startDate)
        )
      )
      .orderBy(desc(opportunityActivities.createdAt));

    // Group by date
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
export const getUpcomingFollowUps = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(7),
      opportunityId: z.string().uuid().optional(),
      assignedTo: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { days, opportunityId, assignedTo } = data;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Build conditions
    const conditions = [
      eq(opportunityActivities.organizationId, ctx.organizationId),
      isNull(opportunityActivities.completedAt),
      sql`${opportunityActivities.scheduledAt} IS NOT NULL`,
      lte(opportunityActivities.scheduledAt, endDate),
    ];

    if (opportunityId) {
      conditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }

    // If filtering by assignedTo, join with opportunities
    let followUps;
    if (assignedTo) {
      followUps = await db
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
        .innerJoin(opportunities, eq(opportunityActivities.opportunityId, opportunities.id))
        .where(
          and(
            ...conditions,
            eq(opportunities.assignedTo, assignedTo)
          )
        )
        .orderBy(asc(opportunityActivities.scheduledAt));
    } else {
      followUps = await db
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
        .innerJoin(opportunities, eq(opportunityActivities.opportunityId, opportunities.id))
        .where(and(...conditions))
        .orderBy(asc(opportunityActivities.scheduledAt));
    }

    // Separate overdue and upcoming
    const now = new Date();
    const overdue = followUps.filter(f => f.activity.scheduledAt && f.activity.scheduledAt < now);
    const upcoming = followUps.filter(f => f.activity.scheduledAt && f.activity.scheduledAt >= now);

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
export const getActivityAnalytics = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      opportunityId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { dateFrom, dateTo, opportunityId } = data;

    // Build conditions
    const conditions = [
      eq(opportunityActivities.organizationId, ctx.organizationId),
    ];

    if (dateFrom) {
      conditions.push(gte(opportunityActivities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(opportunityActivities.createdAt, dateTo));
    }
    if (opportunityId) {
      conditions.push(eq(opportunityActivities.opportunityId, opportunityId));
    }

    const whereClause = and(...conditions);

    // Get totals by type
    const byTypeResult = await db
      .select({
        type: opportunityActivities.type,
        count: sql<number>`COUNT(*)`,
        completedCount: sql<number>`SUM(CASE WHEN ${opportunityActivities.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(opportunityActivities)
      .where(whereClause)
      .groupBy(opportunityActivities.type);

    const byType: Record<string, { count: number; completedCount: number; completionRate: number }> = {};
    let totalCount = 0;
    let totalCompleted = 0;

    for (const row of byTypeResult) {
      const count = Number(row.count);
      const completedCount = Number(row.completedCount);
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
        count: sql<number>`COUNT(*)`,
      })
      .from(opportunityActivities)
      .where(
        and(
          ...conditions,
          gte(opportunityActivities.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${opportunityActivities.createdAt})`)
      .orderBy(sql`DATE(${opportunityActivities.createdAt})`);

    const dailyCounts = dailyResult.map(row => ({
      date: row.date,
      count: Number(row.count),
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
} from "@/lib/schemas/pipeline";

/**
 * Get pipeline forecast by time periods.
 * Groups opportunities by expected close date into periods (month, quarter, week).
 */
export const getPipelineForecast = createServerFn({ method: "GET" })
  .inputValidator(forecastQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const {
      startDate,
      endDate,
      groupBy,
      includeWeighted,
      assignedTo,
      customerId,
      stages,
    } = data;

    // Build base conditions
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
      gte(opportunities.expectedCloseDate, startDate.toISOString().split('T')[0]),
      lte(opportunities.expectedCloseDate, endDate.toISOString().split('T')[0]),
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

    const whereClause = and(...conditions);

    // Determine period expression based on groupBy
    let periodExpr: ReturnType<typeof sql>;
    switch (groupBy) {
      case "quarter":
        periodExpr = sql<string>`TO_CHAR(${opportunities.expectedCloseDate}, 'YYYY-"Q"Q')`;
        break;
      case "week":
        periodExpr = sql<string>`TO_CHAR(${opportunities.expectedCloseDate}, 'IYYY-"W"IW')`;
        break;
      case "month":
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
        opportunityCount: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
        weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
        wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
        lostValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN ${opportunities.value} ELSE 0 END), 0)`,
        avgProbability: sql<number>`COALESCE(AVG(${opportunities.probability}), 0)`,
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(periodExpr)
      .orderBy(periodExpr);

    const forecast: ForecastPeriod[] = forecastResult.map(row => ({
      period: String(row.period),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      opportunityCount: Number(row.opportunityCount),
      totalValue: Number(row.totalValue),
      weightedValue: includeWeighted ? Number(row.weightedValue) : Number(row.totalValue),
      wonValue: Number(row.wonValue),
      lostValue: Number(row.lostValue),
      avgProbability: Math.round(Number(row.avgProbability)),
    }));

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
export const getForecastByEntity = createServerFn({ method: "GET" })
  .inputValidator(forecastQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { startDate, endDate, groupBy, assignedTo, customerId } = data;

    // Build conditions
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
      gte(opportunities.expectedCloseDate, startDate.toISOString().split('T')[0]),
      lte(opportunities.expectedCloseDate, endDate.toISOString().split('T')[0]),
    ];

    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }
    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }

    const whereClause = and(...conditions);

    if (groupBy === "rep") {
      // Group by assigned user
      const result = await db
        .select({
          entityId: opportunities.assignedTo,
          opportunityCount: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
          weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
        })
        .from(opportunities)
        .where(whereClause)
        .groupBy(opportunities.assignedTo);

      return {
        groupBy: "rep",
        data: result.map(row => ({
          entityId: row.entityId,
          opportunityCount: Number(row.opportunityCount),
          totalValue: Number(row.totalValue),
          weightedValue: Number(row.weightedValue),
          wonValue: Number(row.wonValue),
          wonCount: Number(row.wonCount),
          lostCount: Number(row.lostCount),
          conversionRate: (Number(row.wonCount) + Number(row.lostCount)) > 0
            ? Math.round((Number(row.wonCount) / (Number(row.wonCount) + Number(row.lostCount))) * 100)
            : 0,
        })),
      };
    } else if (groupBy === "customer") {
      // Group by customer with join to get customer name
      const result = await db
        .select({
          entityId: opportunities.customerId,
          customerName: customers.name,
          opportunityCount: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
          weightedValue: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
          wonCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
          lostCount: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
        })
        .from(opportunities)
        .leftJoin(customers, eq(opportunities.customerId, customers.id))
        .where(whereClause)
        .groupBy(opportunities.customerId, customers.name);

      return {
        groupBy: "customer",
        data: result.map(row => ({
          entityId: row.entityId,
          entityName: row.customerName,
          opportunityCount: Number(row.opportunityCount),
          totalValue: Number(row.totalValue),
          weightedValue: Number(row.weightedValue),
          wonValue: Number(row.wonValue),
          wonCount: Number(row.wonCount),
          lostCount: Number(row.lostCount),
          conversionRate: (Number(row.wonCount) + Number(row.lostCount)) > 0
            ? Math.round((Number(row.wonCount) / (Number(row.wonCount) + Number(row.lostCount))) * 100)
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
export const getPipelineVelocity = createServerFn({ method: "GET" })
  .inputValidator(velocityQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { dateFrom, dateTo } = data;

    // Build base conditions
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
    ];

    if (dateFrom) {
      conditions.push(gte(opportunities.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(opportunities.createdAt, dateTo));
    }

    const whereClause = and(...conditions);

    // Get won opportunities for sales cycle calculation
    const wonOpportunities = await db
      .select({
        avgDealSize: sql<number>`COALESCE(AVG(${opportunities.value}), 0)`,
        avgSalesCycle: sql<number>`COALESCE(AVG(
          CASE WHEN ${opportunities.actualCloseDate} IS NOT NULL
          THEN EXTRACT(EPOCH FROM (${opportunities.actualCloseDate} - ${opportunities.createdAt})) / 86400
          ELSE NULL END
        ), 0)`,
        wonCount: sql<number>`COUNT(*)`,
        totalWonValue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
      })
      .from(opportunities)
      .where(and(...conditions, eq(opportunities.stage, "won")));

    // Get overall counts for rates
    const allOpportunities = await db
      .select({
        totalCount: sql<number>`COUNT(*)`,
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
        count: sql<number>`COUNT(*)`,
      })
      .from(opportunities)
      .where(whereClause)
      .groupBy(opportunities.stage);

    const avgTimeInStage: Record<string, number> = {};
    const stageConversionRates: Record<string, number> = {};

    // Calculate stage conversion rates (simplified - % in each stage)
    const totalCount = Number(allOpportunities[0]?.totalCount ?? 0);
    for (const row of stageMetrics) {
      avgTimeInStage[row.stage] = Math.round(Number(row.avgDaysInStage));
      stageConversionRates[row.stage] = totalCount > 0
        ? Math.round((Number(row.count) / totalCount) * 100)
        : 0;
    }

    const wonCount = Number(allOpportunities[0]?.wonCount ?? 0);
    const lostCount = Number(allOpportunities[0]?.lostCount ?? 0);
    const closedCount = wonCount + lostCount;

    // Calculate pipeline velocity (won value per day)
    const daysInRange = dateFrom && dateTo
      ? Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / 86400000))
      : 30; // Default 30 days
    const totalWonValue = Number(wonOpportunities[0]?.totalWonValue ?? 0);
    const pipelineVelocity = Math.round(totalWonValue / daysInRange);

    return {
      avgDealSize: Math.round(Number(wonOpportunities[0]?.avgDealSize ?? 0)),
      avgSalesCycle: Math.round(Number(wonOpportunities[0]?.avgSalesCycle ?? 0)),
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
export const getRevenueAttribution = createServerFn({ method: "GET" })
  .inputValidator(revenueAttributionQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.opportunity?.read ?? "opportunity:read" });

    const { dateFrom, dateTo, groupBy } = data;

    // Base conditions for closed opportunities in date range
    const conditions = [
      eq(opportunities.organizationId, ctx.organizationId),
      isNull(opportunities.deletedAt),
      gte(opportunities.actualCloseDate, dateFrom.toISOString().split('T')[0]),
      lte(opportunities.actualCloseDate, dateTo.toISOString().split('T')[0]),
      or(eq(opportunities.stage, "won"), eq(opportunities.stage, "lost")),
    ];

    const whereClause = and(...conditions);

    let result: RevenueAttribution[] = [];

    if (groupBy === "rep") {
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

      result = queryResult.map(row => {
        const wonCount = Number(row.wonCount);
        const lostCount = Number(row.lostCount);
        const total = wonCount + lostCount;
        return {
          group: row.groupId ?? "Unassigned",
          groupId: row.groupId ?? undefined,
          wonCount,
          wonValue: Number(row.wonValue),
          lostCount,
          lostValue: Number(row.lostValue),
          pipelineCount: 0,
          pipelineValue: 0,
          conversionRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
        };
      });
    } else if (groupBy === "customer") {
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
        .leftJoin(customers, eq(opportunities.customerId, customers.id))
        .where(whereClause)
        .groupBy(opportunities.customerId, customers.name);

      result = queryResult.map(row => {
        const wonCount = Number(row.wonCount);
        const lostCount = Number(row.lostCount);
        const total = wonCount + lostCount;
        return {
          group: row.groupName ?? "Unknown",
          groupId: row.groupId,
          wonCount,
          wonValue: Number(row.wonValue),
          lostCount,
          lostValue: Number(row.lostValue),
          pipelineCount: 0,
          pipelineValue: 0,
          conversionRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
        };
      });
    } else if (groupBy === "month") {
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

      result = queryResult.map(row => {
        const wonCount = Number(row.wonCount);
        const lostCount = Number(row.lostCount);
        const total = wonCount + lostCount;
        return {
          group: row.group,
          wonCount,
          wonValue: Number(row.wonValue),
          lostCount,
          lostValue: Number(row.lostValue),
          pipelineCount: 0,
          pipelineValue: 0,
          conversionRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
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
      data: result,
      totals: {
        ...totals,
        conversionRate: (totals.wonCount + totals.lostCount) > 0
          ? Math.round((totals.wonCount / (totals.wonCount + totals.lostCount)) * 100)
          : 0,
      },
      dateRange: { dateFrom, dateTo },
    };
  });
