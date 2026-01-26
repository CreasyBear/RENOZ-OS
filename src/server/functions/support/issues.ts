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
import { eq, and, desc, ilike, or, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  issues,
  slaConfigurations,
  slaTracking,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  createIssueSchema,
  updateIssueSchema,
  getIssuesSchema,
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
} from '@/lib/sla';
import type {
  SlaConfiguration,
  BusinessHoursConfig as BusinessHoursConfigType,
} from '@/lib/sla/types';
import { NotFoundError } from '@/lib/server/errors';

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

    // Create the issue first
    const [issue] = await db
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
    let slaTrackingRecord = null;
    if (data.slaConfigurationId) {
      slaTrackingRecord = await startSlaTrackingForIssue(
        ctx.organizationId,
        ctx.user.id,
        issue.id,
        data.slaConfigurationId
      );

      // Update issue with SLA tracking ID
      await db
        .update(issues)
        .set({ slaTrackingId: slaTrackingRecord.id })
        .where(eq(issues.id, issue.id));
    } else {
      // Try to find default SLA configuration for support domain
      const [defaultConfig] = await db
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
        slaTrackingRecord = await startSlaTrackingForIssue(
          ctx.organizationId,
          ctx.user.id,
          issue.id,
          defaultConfig.id
        );

        // Update issue with SLA tracking ID
        await db
          .update(issues)
          .set({ slaTrackingId: slaTrackingRecord.id })
          .where(eq(issues.id, issue.id));
      }
    }

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
  configId: string
) {
  // Get the SLA configuration first (needed to determine if we need business hours)
  const [config] = await db
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
      ? db
          .select()
          .from(businessHoursConfig)
          .where(eq(businessHoursConfig.id, config.businessHoursConfigId))
          .limit(1)
      : Promise.resolve([]),
    db
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
    ? {
        id: bh.id,
        organizationId: bh.organizationId,
        name: bh.name,
        weeklySchedule: bh.weeklySchedule as any,
        timezone: bh.timezone,
        isDefault: bh.isDefault,
      }
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
  const [tracking] = await db.insert(slaTracking).values(initialValues).returning();

  // Create started event
  await db.insert(slaEvents).values({
    organizationId,
    slaTrackingId: tracking.id,
    eventType: 'started',
    eventData: buildStartedEventData(tracking as any),
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
      conditions.push(eq(issues.status, data.status));
    }
    if (data.priority) {
      conditions.push(eq(issues.priority, data.priority));
    }
    if (data.type) {
      conditions.push(eq(issues.type, data.type));
    }
    if (data.customerId) {
      conditions.push(eq(issues.customerId, data.customerId));
    }
    if (data.assignedToUserId) {
      conditions.push(eq(issues.assignedToUserId, data.assignedToUserId));
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
        slaState = computeStateSnapshot(slaData.tracking as any, slaData.config as any);
      }
    }

    return {
      ...issue,
      slaState,
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

    // Handle SLA pause/resume on status change
    if (updates.status && existing.slaTrackingId) {
      const [tracking] = await db
        .select()
        .from(slaTracking)
        .where(eq(slaTracking.id, existing.slaTrackingId))
        .limit(1);

      if (tracking) {
        // Pause SLA when going to on_hold status
        if (updates.status === 'on_hold' && existing.status !== 'on_hold' && !tracking.isPaused) {
          const pauseReason = updates.holdReason ?? 'On hold';
          const pauseUpdates = calculatePauseUpdate(tracking as any, pauseReason);

          await db.update(slaTracking).set(pauseUpdates).where(eq(slaTracking.id, tracking.id));

          await db.insert(slaEvents).values({
            organizationId: ctx.organizationId,
            slaTrackingId: tracking.id,
            eventType: 'paused',
            eventData: buildPausedEventData(pauseReason),
            triggeredByUserId: ctx.user.id,
          });
        }

        // Resume SLA when coming out of on_hold status
        if (existing.status === 'on_hold' && updates.status !== 'on_hold' && tracking.isPaused) {
          const resumeUpdates = calculateResumeUpdate(tracking as any);
          const pauseDuration =
            resumeUpdates.totalPausedDurationSeconds! - tracking.totalPausedDurationSeconds;

          await db.update(slaTracking).set(resumeUpdates).where(eq(slaTracking.id, tracking.id));

          await db.insert(slaEvents).values({
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

        // Record resolution when issue is resolved or closed
        if (
          (updates.status === 'resolved' || updates.status === 'closed') &&
          existing.status !== 'resolved' &&
          existing.status !== 'closed' &&
          !tracking.resolvedAt
        ) {
          const resolvedAt = new Date();
          const resolutionUpdates = calculateResolutionUpdate(tracking as any, resolvedAt);

          await db
            .update(slaTracking)
            .set(resolutionUpdates)
            .where(eq(slaTracking.id, tracking.id));

          await db.insert(slaEvents).values({
            organizationId: ctx.organizationId,
            slaTrackingId: tracking.id,
            eventType: 'resolved',
            eventData: buildResolvedEventData(tracking as any, resolvedAt),
            triggeredByUserId: ctx.user.id,
          });

          // Track resolvedAt to include in the issue update
          issueResolvedAt = resolvedAt;
        }
      }
    }

    // Update the issue
    const [issue] = await db
      .update(issues)
      .set({
        ...updates,
        ...(issueResolvedAt && { resolvedAt: issueResolvedAt }),
        updatedBy: ctx.user.id,
      })
      .where(eq(issues.id, issueId))
      .returning();

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
      conditions.push(eq(issues.status, data.status));
    }
    if (data.priority) {
      conditions.push(eq(issues.priority, data.priority));
    }
    if (data.type) {
      conditions.push(eq(issues.type, data.type));
    }
    if (data.customerId) {
      conditions.push(eq(issues.customerId, data.customerId));
    }
    if (data.assignedToUserId) {
      conditions.push(eq(issues.assignedToUserId, data.assignedToUserId));
    }
    if (data.search) {
      conditions.push(
        or(ilike(issues.title, containsPattern(data.search)), ilike(issues.issueNumber, containsPattern(data.search)))!
      );
    }

    // Get issues with their SLA tracking data
    const results = await db
      .select({
        issue: issues,
        tracking: slaTracking,
        config: slaConfigurations,
      })
      .from(issues)
      .leftJoin(slaTracking, eq(issues.slaTrackingId, slaTracking.id))
      .leftJoin(slaConfigurations, eq(slaTracking.slaConfigurationId, slaConfigurations.id))
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt))
      .limit(data.limit)
      .offset(data.offset);

    // Compute SLA metrics for each issue
    const issuesWithMetrics: IssueWithSlaMetrics[] = results.map(({ issue, tracking, config }) => {
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

        const snapshot = computeStateSnapshot(trackingData as any, configData as any);

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
      };
    });

    return issuesWithMetrics;
  });
