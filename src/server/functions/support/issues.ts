/**
 * Issues Server Functions
 *
 * Server functions for issue CRUD operations with SLA integration.
 * Uses the unified SLA engine for tracking response and resolution times.
 *
 * @see drizzle/schema/support/issues.ts
 * @see src/lib/sla for SLA calculation and state management
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc, desc, ilike, or, gte, lte, isNull, isNotNull, inArray, sql } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse, encodeCursor } from '@/lib/db/pagination';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  issues,
  slaConfigurations,
  slaTracking,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
  customers,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  createIssueSchema,
  updateIssueSchema,
  getIssuesSchema,
  getIssuesCursorSchema,
  getIssueByIdSchema,
} from '@/lib/schemas/support/issues';
import {
  calculateInitialTracking,
  calculatePauseUpdate,
  calculateResumeUpdate,
  calculateResolutionUpdate,
  computeStateSnapshot,
  buildStartedEventData,
  buildPausedEventData,
  buildResumedEventData,
  buildResolvedEventData,
  type SlaConfiguration,
  type BusinessHoursConfig as BusinessHoursConfigType,
  toBusinessHoursConfig,
  toSlaTracking,
  toSlaConfiguration,
} from '@/lib/sla';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';
import { createSerializedMutationError, serializedMutationSuccess } from '@/lib/server/serialized-mutation-contract';

// ============================================================================
// ACTIVITY LOGGING HELPERS
// ============================================================================

const ISSUE_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
  'slaTrackingId',
];

// ============================================================================
// CREATE ISSUE
// ============================================================================

/**
 * Create a new issue with optional SLA tracking
 */
export const createIssue = createServerFn({ method: 'POST' })
  .inputValidator(createIssueSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    // Wrap issue creation + SLA tracking in a transaction for atomicity
    const { issue, slaTrackingRecord } = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Create the issue first
      const [newIssue] = await tx
        .insert(issues)
        .values({
          organizationId: ctx.organizationId,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          priority: data.priority,
          status: 'open',
          customerId: data.customerId ?? null,
          assignedToUserId: data.assignedToUserId ?? null,
          metadata: data.metadata ?? null,
          tags: data.tags ?? null,
          createdBy: ctx.user.id,
        })
        .returning();

      // If SLA configuration is provided, start SLA tracking
      let slaRecord = null;
      if (data.slaConfigurationId) {
        slaRecord = await startSlaTrackingForIssue(
          ctx.organizationId,
          ctx.user.id,
          newIssue.id,
          data.slaConfigurationId,
          tx as unknown as typeof db
        );

        // Update issue with SLA tracking ID
        await tx
          .update(issues)
          .set({ slaTrackingId: slaRecord.id })
          .where(
            and(
              eq(issues.id, newIssue.id),
              eq(issues.organizationId, ctx.organizationId)
            )
          );
      } else {
        // Try to find default SLA configuration for support domain
        const [defaultConfig] = await tx
          .select()
          .from(slaConfigurations)
          .where(
            and(
              eq(slaConfigurations.organizationId, ctx.organizationId),
              eq(slaConfigurations.domain, 'support'),
              eq(slaConfigurations.isDefault, true),
              eq(slaConfigurations.isActive, true)
            )
          )
          .limit(1);

        if (defaultConfig) {
          slaRecord = await startSlaTrackingForIssue(
            ctx.organizationId,
            ctx.user.id,
            newIssue.id,
            defaultConfig.id,
            tx as unknown as typeof db
          );

          // Update issue with SLA tracking ID
          await tx
            .update(issues)
            .set({ slaTrackingId: slaRecord.id })
            .where(eq(issues.id, newIssue.id));
        }
      }

      return { issue: newIssue, slaTrackingRecord: slaRecord };
    });

    // Log issue creation
    logger.logAsync({
      entityType: 'issue',
      entityId: issue.id,
      action: 'created',
      description: `Created issue: ${issue.issueNumber}`,
      changes: computeChanges({
        before: null,
        after: issue,
        excludeFields: ISSUE_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        customerId: data.customerId ?? undefined,
        status: 'open',
        priority: data.priority,
        customFields: {
          issueNumber: issue.issueNumber,
          type: data.type,
          title: data.title,
          assignedTo: data.assignedToUserId ?? null,
        },
      },
    });

    return {
      ...issue,
      slaTrackingId: slaTrackingRecord?.id ?? null,
    };
  });

/**
 * Helper to start SLA tracking for an issue
 */
async function startSlaTrackingForIssue(
  organizationId: string,
  userId: string,
  issueId: string,
  configId: string,
  executor: typeof db = db
) {
  // Get the SLA configuration first (needed to determine if we need business hours)
  const [config] = await executor
    .select()
    .from(slaConfigurations)
    .where(eq(slaConfigurations.id, configId))
    .limit(1);

  if (!config) {
    throw new NotFoundError('SLA configuration not found', 'slaConfiguration');
  }

  // Fetch business hours and holidays in parallel
  // For holidays, filter to relevant date range: current year ± 1 year to cover SLA periods
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
  const oneYearAhead = new Date(now.getFullYear() + 1, 11, 31).toISOString().split('T')[0];

  const [businessHoursResult, holidays] = await Promise.all([
    config.businessHoursConfigId
      ? executor
          .select()
          .from(businessHoursConfig)
          .where(eq(businessHoursConfig.id, config.businessHoursConfigId))
          .limit(1)
      : Promise.resolve([]),
    executor
      .select()
      .from(organizationHolidays)
      .where(
        and(
          eq(organizationHolidays.organizationId, organizationId),
          or(
            // Include recurring holidays (checked every year)
            eq(organizationHolidays.isRecurring, true),
            // Include non-recurring holidays within the relevant date range
            and(
              gte(organizationHolidays.date, oneYearAgo),
              lte(organizationHolidays.date, oneYearAhead)
            )
          )
        )
      ),
  ]);

  // Transform business hours result if present
  const bh = businessHoursResult[0];
  const businessHours: BusinessHoursConfigType | null = bh
    ? toBusinessHoursConfig(bh)
    : null;

  const holidayDates = holidays.map((h) => new Date(h.date));

  // Calculate initial tracking values
  const configForCalc: SlaConfiguration = {
    id: config.id,
    organizationId: config.organizationId,
    domain: config.domain,
    name: config.name,
    description: config.description,
    responseTargetValue: config.responseTargetValue,
    responseTargetUnit: config.responseTargetUnit,
    resolutionTargetValue: config.resolutionTargetValue,
    resolutionTargetUnit: config.resolutionTargetUnit,
    atRiskThresholdPercent: config.atRiskThresholdPercent,
    escalateOnBreach: config.escalateOnBreach,
    escalateToUserId: config.escalateToUserId,
    businessHoursConfigId: config.businessHoursConfigId,
    isDefault: config.isDefault,
    priorityOrder: config.priorityOrder,
    isActive: config.isActive,
  };

  const initialValues = calculateInitialTracking(
    {
      organizationId,
      domain: 'support',
      entityType: 'issue',
      entityId: issueId,
      configurationId: configId,
      userId,
    },
    configForCalc,
    businessHours,
    holidayDates
  );

  // Create tracking record
  const [tracking] = await executor.insert(slaTracking).values(initialValues).returning();

  // Create started event
  await executor.insert(slaEvents).values({
    organizationId,
    slaTrackingId: tracking.id,
    eventType: 'started',
    eventData: buildStartedEventData(toSlaTracking(tracking)),
    triggeredByUserId: userId,
  });

  return tracking;
}

// ============================================================================
// GET ISSUES
// ============================================================================

/**
 * Get issues with filtering and pagination
 */
export const getIssues = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(issues.organizationId, ctx.organizationId)];

    if (data.status) {
      if (Array.isArray(data.status) && data.status.length > 0) {
        conditions.push(inArray(issues.status, data.status));
      } else if (!Array.isArray(data.status)) {
        conditions.push(eq(issues.status, data.status));
      }
    }
    if (data.priority) {
      if (Array.isArray(data.priority) && data.priority.length > 0) {
        conditions.push(inArray(issues.priority, data.priority));
      } else if (!Array.isArray(data.priority)) {
        conditions.push(eq(issues.priority, data.priority));
      }
    }
    if (data.type) {
      conditions.push(eq(issues.type, data.type));
    }
    if (data.customerId) {
      conditions.push(eq(issues.customerId, data.customerId));
    }
    if (data.assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (data.assignedToFilter === 'me' || data.assignedToUserId) {
      const userId = data.assignedToFilter === 'me' ? ctx.user.id : data.assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (data.escalated === true) {
      conditions.push(isNotNull(issues.escalatedAt));
    }
    if (data.search) {
      conditions.push(
        or(ilike(issues.title, containsPattern(data.search)), ilike(issues.issueNumber, containsPattern(data.search)))!
      );
    }

    const results = await db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt))
      .limit(data.limit)
      .offset(data.offset);

    return results;
  });

/**
 * Get issues with cursor pagination (recommended for large datasets).
 */
export const getIssuesCursor = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', status, priority, type, customerId, assignedToUserId, assignedToFilter, search, escalated } = data;

    const conditions = [eq(issues.organizationId, ctx.organizationId)];
    if (status) {
      if (Array.isArray(status) && status.length > 0) conditions.push(inArray(issues.status, status));
      else if (!Array.isArray(status)) conditions.push(eq(issues.status, status));
    }
    if (priority) {
      if (Array.isArray(priority) && priority.length > 0) conditions.push(inArray(issues.priority, priority));
      else if (!Array.isArray(priority)) conditions.push(eq(issues.priority, priority));
    }
    if (type) conditions.push(eq(issues.type, type));
    if (customerId) conditions.push(eq(issues.customerId, customerId));
    if (assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (assignedToFilter === 'me' || assignedToUserId) {
      const userId = assignedToFilter === 'me' ? ctx.user.id : assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (escalated === true) conditions.push(isNotNull(issues.escalatedAt));
    if (search) {
      conditions.push(
        or(ilike(issues.title, containsPattern(search)), ilike(issues.issueNumber, containsPattern(search)))!
      );
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(issues.createdAt, issues.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(orderDir(issues.createdAt), orderDir(issues.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(results, pageSize);
  });

/**
 * Get a single issue by ID with SLA state
 */
export const getIssueById = createServerFn({ method: 'GET' })
  .inputValidator(getIssueByIdSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [issue] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, data.issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!issue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    // Get SLA state if tracking exists - use a single JOIN query instead of sequential queries
    let slaState = null;
    if (issue.slaTrackingId) {
      const [slaData] = await db
        .select({
          tracking: slaTracking,
          config: slaConfigurations,
        })
        .from(slaTracking)
        .innerJoin(slaConfigurations, eq(slaTracking.slaConfigurationId, slaConfigurations.id))
        .where(eq(slaTracking.id, issue.slaTrackingId))
        .limit(1);

      if (slaData?.tracking && slaData?.config) {
        slaState = computeStateSnapshot(
          toSlaTracking(slaData.tracking),
          toSlaConfiguration(slaData.config)
        );
      }
    }

    // Extract warrantyId from metadata if present
    const metadata = issue.metadata as Record<string, unknown> | null;
    const warrantyId = metadata?.warrantyId as string | null;

    return {
      ...issue,
      slaMetrics: slaState,  // Return as slaMetrics to match client expectations
      warrantyId: warrantyId ?? null,
    };
  });

// ============================================================================
// UPDATE ISSUE
// ============================================================================

/**
 * Update an issue with SLA pause/resume on status change
 */
export const updateIssue = createServerFn({ method: 'POST' })
  .inputValidator(
    updateIssueSchema.extend({
      issueId: getIssueByIdSchema.shape.issueId,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);
    const { issueId, ...updates } = data;

    // Track resolvedAt separately (set programmatically on resolution)
    let issueResolvedAt: Date | undefined;

    // Get existing issue
    const [existing] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    const [issue] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (updates.status && existing.slaTrackingId) {
        const [tracking] = await tx
          .select()
          .from(slaTracking)
          .where(eq(slaTracking.id, existing.slaTrackingId))
          .limit(1);

        if (tracking) {
          if (updates.status === 'on_hold' && existing.status !== 'on_hold' && !tracking.isPaused) {
            const pauseReason = updates.holdReason ?? 'On hold';
            const pauseUpdates = calculatePauseUpdate(toSlaTracking(tracking), pauseReason);
            await tx.update(slaTracking).set(pauseUpdates).where(eq(slaTracking.id, tracking.id));
            await tx.insert(slaEvents).values({
              organizationId: ctx.organizationId,
              slaTrackingId: tracking.id,
              eventType: 'paused',
              eventData: buildPausedEventData(pauseReason),
              triggeredByUserId: ctx.user.id,
            });
          }

          if (existing.status === 'on_hold' && updates.status !== 'on_hold' && tracking.isPaused) {
            const resumeUpdates = calculateResumeUpdate(toSlaTracking(tracking));
            const pauseDuration =
              resumeUpdates.totalPausedDurationSeconds! - tracking.totalPausedDurationSeconds;
            await tx.update(slaTracking).set(resumeUpdates).where(eq(slaTracking.id, tracking.id));
            await tx.insert(slaEvents).values({
              organizationId: ctx.organizationId,
              slaTrackingId: tracking.id,
              eventType: 'resumed',
              eventData: buildResumedEventData(
                pauseDuration,
                resumeUpdates.totalPausedDurationSeconds!
              ),
              triggeredByUserId: ctx.user.id,
            });
          }

          if (
            (updates.status === 'resolved' || updates.status === 'closed') &&
            existing.status !== 'resolved' &&
            existing.status !== 'closed' &&
            !tracking.resolvedAt
          ) {
            const resolvedAt = new Date();
            const resolutionUpdates = calculateResolutionUpdate(
              toSlaTracking(tracking),
              resolvedAt
            );
            await tx
              .update(slaTracking)
              .set(resolutionUpdates)
              .where(eq(slaTracking.id, tracking.id));
            await tx.insert(slaEvents).values({
              organizationId: ctx.organizationId,
              slaTrackingId: tracking.id,
              eventType: 'resolved',
              eventData: buildResolvedEventData(toSlaTracking(tracking), resolvedAt),
              triggeredByUserId: ctx.user.id,
            });
            issueResolvedAt = resolvedAt;
          }
        }
      }

      return await tx
        .update(issues)
        .set({
          ...updates,
          ...(issueResolvedAt && { resolvedAt: issueResolvedAt }),
          updatedBy: ctx.user.id,
        })
        .where(eq(issues.id, issueId))
        .returning();
    });

    // Log issue update
    const changes = computeChanges({
      before: existing,
      after: issue,
      excludeFields: ISSUE_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'issue',
        entityId: issue.id,
        action: 'updated',
        description: `Updated issue: ${issue.issueNumber}`,
        changes,
        metadata: {
          customerId: issue.customerId ?? undefined,
          status: issue.status,
          changedFields: changes.fields,
          ...(existing.status !== issue.status && {
            previousStatus: existing.status,
            newStatus: issue.status,
          }),
          ...(updates.assignedToUserId && {
            assignedTo: updates.assignedToUserId,
          }),
        },
      });
    }

    return issue;
  });

// ============================================================================
// GET ISSUES WITH SLA METRICS
// ============================================================================

/**
 * Computed SLA metrics for list display
 */
export interface IssueSlaMetrics {
  slaTrackingId: string;
  status: string;
  isPaused: boolean;
  responseBreached: boolean;
  resolutionBreached: boolean;
  isResponseAtRisk: boolean;
  isResolutionAtRisk: boolean;
  responseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;
  responsePercentComplete: number | null;
  resolutionPercentComplete: number | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
}

/**
 * Issue with computed SLA metrics for list views
 */
export type IssueWithSlaMetrics = typeof issues.$inferSelect & {
  slaMetrics: IssueSlaMetrics | null;
};

/**
 * Get issues with computed SLA metrics for list display
 * Uses SLA State Manager computeStateSnapshot for real-time breach/at-risk status
 */
export const getIssuesWithSlaMetrics = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesSchema)
  .handler(async ({ data }): Promise<IssueWithSlaMetrics[]> => {
    const ctx = await withAuth();

    const conditions = [eq(issues.organizationId, ctx.organizationId)];

    if (data.status) {
      if (Array.isArray(data.status) && data.status.length > 0) {
        conditions.push(inArray(issues.status, data.status));
      } else if (!Array.isArray(data.status)) {
        conditions.push(eq(issues.status, data.status));
      }
    }
    if (data.priority) {
      if (Array.isArray(data.priority) && data.priority.length > 0) {
        conditions.push(inArray(issues.priority, data.priority));
      } else if (!Array.isArray(data.priority)) {
        conditions.push(eq(issues.priority, data.priority));
      }
    }
    if (data.type) {
      conditions.push(eq(issues.type, data.type));
    }
    if (data.customerId) {
      conditions.push(eq(issues.customerId, data.customerId));
    }
    if (data.assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (data.assignedToFilter === 'me' || data.assignedToUserId) {
      const userId = data.assignedToFilter === 'me' ? ctx.user.id : data.assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (data.escalated === true) {
      conditions.push(isNotNull(issues.escalatedAt));
    }
    if (data.search) {
      conditions.push(
        or(ilike(issues.title, containsPattern(data.search)), ilike(issues.issueNumber, containsPattern(data.search)))!
      );
    }

    // slaStatus filter: breached = only issues with breached SLA
    if (data.slaStatus === 'breached') {
      conditions.push(
        and(
          isNotNull(slaTracking.id),
          or(
            eq(slaTracking.status, 'breached'),
            eq(slaTracking.responseBreached, true),
            eq(slaTracking.resolutionBreached, true)
          )!
        )!
      );
    }

    // Get issues with their SLA tracking data and customer (for kanban customer link)
    const results = await db
      .select({
        issue: issues,
        tracking: slaTracking,
        config: slaConfigurations,
        customer: { id: customers.id, name: customers.name },
      })
      .from(issues)
      .leftJoin(slaTracking, eq(issues.slaTrackingId, slaTracking.id))
      .leftJoin(slaConfigurations, eq(slaTracking.slaConfigurationId, slaConfigurations.id))
      .leftJoin(
        customers,
        and(
          eq(issues.customerId, customers.id),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt))
      .limit(data.limit)
      .offset(data.offset);

    // Compute SLA metrics for each issue
    const issuesWithMetrics: IssueWithSlaMetrics[] = results.map(({ issue, tracking, config, customer }) => {
      let slaMetrics: IssueSlaMetrics | null = null;

      if (tracking && config) {
        // Convert DB rows to types expected by computeStateSnapshot
        const trackingData = {
          ...tracking,
          startedAt: tracking.startedAt,
          responseDueAt: tracking.responseDueAt,
          resolutionDueAt: tracking.resolutionDueAt,
          respondedAt: tracking.respondedAt,
          resolvedAt: tracking.resolvedAt,
          pausedAt: tracking.pausedAt,
        };

        const configData = {
          id: config.id,
          organizationId: config.organizationId,
          domain: config.domain,
          name: config.name,
          description: config.description,
          responseTargetValue: config.responseTargetValue,
          responseTargetUnit: config.responseTargetUnit,
          resolutionTargetValue: config.resolutionTargetValue,
          resolutionTargetUnit: config.resolutionTargetUnit,
          atRiskThresholdPercent: config.atRiskThresholdPercent,
          escalateOnBreach: config.escalateOnBreach,
          escalateToUserId: config.escalateToUserId,
          businessHoursConfigId: config.businessHoursConfigId,
          isDefault: config.isDefault,
          priorityOrder: config.priorityOrder,
          isActive: config.isActive,
        };

        const snapshot = computeStateSnapshot(
          toSlaTracking(trackingData),
          toSlaConfiguration(configData)
        );

        slaMetrics = {
          slaTrackingId: tracking.id,
          status: tracking.status,
          isPaused: tracking.isPaused,
          responseBreached: tracking.responseBreached,
          resolutionBreached: tracking.resolutionBreached,
          isResponseAtRisk: snapshot.isResponseAtRisk,
          isResolutionAtRisk: snapshot.isResolutionAtRisk,
          responseTimeRemaining: snapshot.responseTimeRemaining,
          resolutionTimeRemaining: snapshot.resolutionTimeRemaining,
          responsePercentComplete: snapshot.responsePercentComplete,
          resolutionPercentComplete: snapshot.resolutionPercentComplete,
          responseDueAt: tracking.responseDueAt,
          resolutionDueAt: tracking.resolutionDueAt,
        };
      }

      return {
        ...issue,
        slaMetrics,
        customer: customer?.id ? { id: customer.id, name: customer.name } : null,
      };
    });

    return issuesWithMetrics;
  });

/**
 * Get issues with SLA metrics and cursor pagination (recommended for large datasets).
 */
export const getIssuesWithSlaMetricsCursor = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', status, priority, type, customerId, assignedToUserId, assignedToFilter, search, slaStatus, escalated } = data;

    const conditions = [eq(issues.organizationId, ctx.organizationId)];
    if (status) {
      if (Array.isArray(status) && status.length > 0) conditions.push(inArray(issues.status, status));
      else if (!Array.isArray(status)) conditions.push(eq(issues.status, status));
    }
    if (priority) {
      if (Array.isArray(priority) && priority.length > 0) conditions.push(inArray(issues.priority, priority));
      else if (!Array.isArray(priority)) conditions.push(eq(issues.priority, priority));
    }
    if (type) conditions.push(eq(issues.type, type));
    if (customerId) conditions.push(eq(issues.customerId, customerId));
    if (assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (assignedToFilter === 'me' || assignedToUserId) {
      const userId = assignedToFilter === 'me' ? ctx.user.id : assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (escalated === true) conditions.push(isNotNull(issues.escalatedAt));
    if (search) {
      conditions.push(
        or(ilike(issues.title, containsPattern(search)), ilike(issues.issueNumber, containsPattern(search)))!
      );
    }
    if (slaStatus === 'breached') {
      conditions.push(
        and(
          isNotNull(slaTracking.id),
          or(
            eq(slaTracking.status, 'breached'),
            eq(slaTracking.responseBreached, true),
            eq(slaTracking.resolutionBreached, true)
          )!
        )!
      );
    }

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(issues.createdAt, issues.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select({
        issue: issues,
        tracking: slaTracking,
        config: slaConfigurations,
        customer: { id: customers.id, name: customers.name },
      })
      .from(issues)
      .leftJoin(slaTracking, eq(issues.slaTrackingId, slaTracking.id))
      .leftJoin(slaConfigurations, eq(slaTracking.slaConfigurationId, slaConfigurations.id))
      .leftJoin(
        customers,
        and(
          eq(issues.customerId, customers.id),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .where(and(...conditions))
      .orderBy(orderDir(issues.createdAt), orderDir(issues.id))
      .limit(pageSize + 1);

    const hasNextPage = results.length > pageSize;
    const pageResults = hasNextPage ? results.slice(0, pageSize) : results;

    const issuesWithMetrics: IssueWithSlaMetrics[] = pageResults.map(({ issue, tracking, config, customer }) => {
      let slaMetrics: IssueSlaMetrics | null = null;

      if (tracking && config) {
        const trackingData = {
          ...tracking,
          startedAt: tracking.startedAt,
          responseDueAt: tracking.responseDueAt,
          resolutionDueAt: tracking.resolutionDueAt,
          respondedAt: tracking.respondedAt,
          resolvedAt: tracking.resolvedAt,
          pausedAt: tracking.pausedAt,
        };
        const configData = {
          id: config.id,
          organizationId: config.organizationId,
          domain: config.domain,
          name: config.name,
          description: config.description,
          responseTargetValue: config.responseTargetValue,
          responseTargetUnit: config.responseTargetUnit,
          resolutionTargetValue: config.resolutionTargetValue,
          resolutionTargetUnit: config.resolutionTargetUnit,
          atRiskThresholdPercent: config.atRiskThresholdPercent,
          escalateOnBreach: config.escalateOnBreach,
          escalateToUserId: config.escalateToUserId,
          businessHoursConfigId: config.businessHoursConfigId,
          isDefault: config.isDefault,
          priorityOrder: config.priorityOrder,
          isActive: config.isActive,
        };
        const snapshot = computeStateSnapshot(
          toSlaTracking(trackingData),
          toSlaConfiguration(configData)
        );
        slaMetrics = {
          slaTrackingId: tracking.id,
          status: tracking.status,
          isPaused: tracking.isPaused,
          responseBreached: tracking.responseBreached,
          resolutionBreached: tracking.resolutionBreached,
          isResponseAtRisk: snapshot.isResponseAtRisk,
          isResolutionAtRisk: snapshot.isResolutionAtRisk,
          responseTimeRemaining: snapshot.responseTimeRemaining,
          resolutionTimeRemaining: snapshot.resolutionTimeRemaining,
          responsePercentComplete: snapshot.responsePercentComplete,
          resolutionPercentComplete: snapshot.resolutionPercentComplete,
          responseDueAt: tracking.responseDueAt,
          resolutionDueAt: tracking.resolutionDueAt,
        };
      }
      return {
        ...issue,
        slaMetrics,
        customer: customer?.id ? { id: customer.id, name: customer.name } : null,
      };
    });

    let nextCursor: string | null = null;
    if (hasNextPage && pageResults.length > 0) {
      const last = pageResults[pageResults.length - 1].issue;
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
    }

    return {
      items: issuesWithMetrics,
      nextCursor,
      hasNextPage,
    };
  });

// ============================================================================
// DELETE ISSUE (SOFT DELETE)
// ============================================================================

/**
 * Soft delete a support issue (archive)
 */
export const deleteIssue = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.support?.delete ?? 'support:delete' });
    const logger = createActivityLoggerWithContext(ctx);
    const { id } = data;

    const existing = await db.query.issues.findFirst({
      where: and(
        eq(issues.id, id),
        eq(issues.organizationId, ctx.organizationId),
          isNull(issues.deletedAt)
      ),
    });

    if (!existing) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    // Guard: Cannot delete issues that are in_progress or escalated
    if (['in_progress', 'escalated'].includes(existing.status)) {
      throw createSerializedMutationError(
        `Cannot delete issue in '${existing.status}' status. Resolve or close it first.`,
        'transition_blocked'
      );
    }

    const [deletedIssue] = await db
      .update(issues)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(issues.id, id))
      .returning({ id: issues.id, issueNumber: issues.issueNumber });

    if (!deletedIssue) {
      throw new NotFoundError('Issue not found', 'issue');
    }

    logger.logAsync({
      entityType: 'issue',
      entityId: id,
      action: 'deleted',
      description: `Deleted issue: ${existing.issueNumber ?? id}`,
      metadata: {
        status: existing.status,
      },
    });

    return serializedMutationSuccess(
      { id: deletedIssue.id },
      `Issue ${deletedIssue.issueNumber ?? deletedIssue.id} deleted.`,
      { affectedIds: [deletedIssue.id] }
    );
  });
