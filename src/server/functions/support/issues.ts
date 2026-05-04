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
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  issues,
  slaConfigurations,
  slaTracking,
  slaEvents,
  businessHoursConfig,
  organizationHolidays,
  customers,
  serviceSystems,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  createIssueSchema,
  updateIssueSchema,
  getIssuesSchema,
  getIssuesCursorSchema,
  getIssueByIdSchema,
  type IssueRmaState,
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
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';
import { createSerializedMutationError, serializedMutationSuccess } from '@/lib/server/serialized-mutation-contract';
import {
  buildIssueAnchorState,
  assertIssueAnchors,
  extractIssueAnchorValues,
  getIssueRelatedContext,
  previewIssueAnchors,
  resolveIssueAnchors,
  syncIssueAnchorMetadata,
} from './_shared/issue-anchor-resolution';
import { getIssueRemedyContext } from './_shared/issue-remedy-context';

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

function applyLineageStateFilter(
  conditions: Array<ReturnType<typeof eq>>,
  state: 'any' | 'present' | 'missing' | undefined,
  column: typeof issues.serialNumber | typeof issues.warrantyId | typeof issues.orderId | typeof issues.serviceSystemId
) {
  if (state === 'present') {
    conditions.push(isNotNull(column) as never);
  } else if (state === 'missing') {
    conditions.push(isNull(column) as never);
  }
}

function applyOptionalEqualityFilter(
  conditions: Array<ReturnType<typeof eq>>,
  value: string | undefined,
  column: typeof issues.nextActionType
) {
  if (value) {
    conditions.push(eq(column, value as never) as never);
  }
}

function buildIssueSearchCondition(search: string, organizationId: string) {
  const pattern = containsPattern(search);
  return or(
    ilike(issues.title, pattern),
    ilike(issues.issueNumber, pattern),
    sql`EXISTS (
      SELECT 1
      FROM ${customers}
      WHERE ${customers.id} = ${issues.customerId}
        AND ${customers.organizationId} = ${organizationId}
        AND ${customers.deletedAt} IS NULL
        AND ${customers.name} ILIKE ${pattern}
    )`
  )!;
}

function matchesRmaState(
  requestedState: IssueRmaState | undefined,
  actualState: 'ready' | 'blocked' | 'linked' | null
) {
  if (!requestedState || requestedState === 'any') return true;
  return actualState === requestedState;
}

type IssueListQueryRow = {
  issue: typeof issues.$inferSelect;
  tracking: typeof slaTracking.$inferSelect | null;
  config: typeof slaConfigurations.$inferSelect | null;
  customer: { id: string; name: string } | null;
  serviceSystem: { id: string; displayName: string } | null;
};

function mapIssueRowsWithMetrics(rows: IssueListQueryRow[]): IssueWithSlaMetrics[] {
  return rows.map(({ issue, tracking, config, customer, serviceSystem }) => {
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
      serviceSystem: serviceSystem?.id
        ? { id: serviceSystem.id, displayName: serviceSystem.displayName }
        : null,
    };
  });
}

async function resolveIssueDetailContext(
  organizationId: string,
  issue: typeof issues.$inferSelect
) {
  const normalizedAnchors = extractIssueAnchorValues(issue);
  const anchorResolution = await resolveIssueAnchors(organizationId, normalizedAnchors);
  const remedyContext = await getIssueRemedyContext({
    organizationId,
    issue: {
      id: issue.id,
      status: issue.status,
      orderId: anchorResolution.anchors.orderId,
      serializedItemId: anchorResolution.anchors.serializedItemId,
      serialNumber: anchorResolution.anchors.serialNumber,
      resolutionCategory: issue.resolutionCategory,
      resolutionNotes: issue.resolutionNotes,
      diagnosisNotes: issue.diagnosisNotes,
      nextActionType: issue.nextActionType,
      resolvedAt: issue.resolvedAt,
      resolvedByUserId: issue.resolvedByUserId,
    },
    supportContext: anchorResolution.supportContext,
  });

  return {
    anchorResolution,
    remedyContext,
  };
}

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
    const issueAnchorState = buildIssueAnchorState({ input: data });
    const resolution = await resolveIssueAnchors(ctx.organizationId, issueAnchorState.anchors);
    assertIssueAnchors({
      anchors: issueAnchorState.anchors,
      explicitFields: issueAnchorState.explicitFields,
      customerId: data.customerId ?? null,
      resolution,
    });

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
          customerId: resolution.commercialCustomerId ?? data.customerId ?? null,
          warrantyId: resolution.anchors.warrantyId,
          warrantyEntitlementId: resolution.anchors.warrantyEntitlementId,
          orderId: resolution.anchors.orderId,
          shipmentId: resolution.anchors.shipmentId,
          productId: resolution.anchors.productId,
          serializedItemId: resolution.anchors.serializedItemId,
          serviceSystemId: resolution.anchors.serviceSystemId,
          serialNumber: resolution.anchors.serialNumber,
          assignedToUserId: data.assignedToUserId ?? null,
          metadata: syncIssueAnchorMetadata(issueAnchorState.metadata, resolution.anchors),
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
    applyOptionalEqualityFilter(conditions as never[], data.nextActionType, issues.nextActionType);
    applyLineageStateFilter(conditions as never[], data.serialState, issues.serialNumber);
    applyLineageStateFilter(conditions as never[], data.warrantyState, issues.warrantyId);
    applyLineageStateFilter(conditions as never[], data.orderState, issues.orderId);
    applyLineageStateFilter(
      conditions as never[],
      data.serviceSystemState,
      issues.serviceSystemId
    );
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
      conditions.push(buildIssueSearchCondition(data.search, ctx.organizationId));
    }

    const needsRmaFiltering = !!data.rmaState && data.rmaState !== 'any';

    const baseQuery = db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt));

    const results = needsRmaFiltering
      ? await baseQuery
      : await baseQuery.limit(data.limit).offset(data.offset);

    const enrichedRows = await enrichIssueListRows(ctx.organizationId, results);
    const filteredRows = enrichedRows.filter((issue) =>
      matchesRmaState(data.rmaState, issue.rmaState ?? null)
    );

    return needsRmaFiltering
      ? filteredRows.slice(data.offset, data.offset + data.limit)
      : filteredRows;
  });

/**
 * Get issues with cursor pagination (recommended for large datasets).
 */
export const getIssuesCursor = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const {
      cursor,
      pageSize = 20,
      sortOrder = 'desc',
      status,
      priority,
      type,
      customerId,
      assignedToUserId,
      assignedToFilter,
      search,
      escalated,
      nextActionType,
      rmaState,
    } = data;

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
    applyOptionalEqualityFilter(conditions as never[], nextActionType, issues.nextActionType);
    applyLineageStateFilter(conditions as never[], data.serialState, issues.serialNumber);
    applyLineageStateFilter(conditions as never[], data.warrantyState, issues.warrantyId);
    applyLineageStateFilter(conditions as never[], data.orderState, issues.orderId);
    applyLineageStateFilter(
      conditions as never[],
      data.serviceSystemState,
      issues.serviceSystemId
    );
    if (assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (assignedToFilter === 'me' || assignedToUserId) {
      const userId = assignedToFilter === 'me' ? ctx.user.id : assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (escalated === true) conditions.push(isNotNull(issues.escalatedAt));
    if (search) {
      conditions.push(buildIssueSearchCondition(search, ctx.organizationId));
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const batchSize = rmaState && rmaState !== 'any' ? Math.max(pageSize * 3, 50) : pageSize + 1;
    const selectIssueRows = (
      batchCursor: ReturnType<typeof decodeCursor> | null,
      limit: number
    ) => {
      const batchConditions = [...conditions];
      if (batchCursor) {
        batchConditions.push(
          buildCursorCondition(issues.createdAt, issues.id, batchCursor, sortOrder)
        );
      }

      return db
        .select()
        .from(issues)
        .where(and(...batchConditions))
        .orderBy(orderDir(issues.createdAt), orderDir(issues.id))
        .limit(limit);
    };

    const filteredRows: Awaited<ReturnType<typeof enrichIssueListRows>> = [];
    let batchCursor = cursor ? decodeCursor(cursor) : null;
    let exhausted = false;

    while (filteredRows.length <= pageSize && !exhausted) {
      const results = await selectIssueRows(batchCursor, batchSize);
      if (results.length === 0) {
        exhausted = true;
        break;
      }

      const enrichedRows = await enrichIssueListRows(ctx.organizationId, results);
      filteredRows.push(
        ...enrichedRows.filter((issue) => matchesRmaState(rmaState, issue.rmaState ?? null))
      );

      const lastResult = results[results.length - 1];
      batchCursor = lastResult
        ? { createdAt: lastResult.createdAt.toISOString(), id: lastResult.id }
        : batchCursor;

      if (results.length < batchSize) {
        exhausted = true;
      }
    }

    return buildStandardCursorResponse(filteredRows, pageSize);
  });

/**
 * Get a single issue by ID with SLA state
 */
export const getIssueById = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getIssueByIdSchema))
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
    const { anchorResolution, remedyContext } = await resolveIssueDetailContext(
      ctx.organizationId,
      issue
    );
    const relatedContext = await getIssueRelatedContext({
      organizationId: ctx.organizationId,
      issueId: issue.id,
      issue: {
        id: issue.id,
        customerId: issue.customerId,
        warrantyId: anchorResolution.anchors.warrantyId,
        orderId: anchorResolution.anchors.orderId,
        shipmentId: anchorResolution.anchors.shipmentId,
        serializedItemId: anchorResolution.anchors.serializedItemId,
        serviceSystemId: anchorResolution.anchors.serviceSystemId,
      },
      supportContext: anchorResolution.supportContext,
    });

    return {
      ...issue,
      ...anchorResolution.anchors,
      slaMetrics: slaState,  // Return as slaMetrics to match client expectations
      supportContext: anchorResolution.supportContext,
      resolution: remedyContext.resolution,
      rmaReadiness: remedyContext.rmaReadiness,
      relatedContext,
    };
  });

export const previewIssueIntake = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      createIssueSchema
        .partial()
        .pick({
          customerId: true,
          warrantyId: true,
          warrantyEntitlementId: true,
          productId: true,
          orderId: true,
          shipmentId: true,
          serializedItemId: true,
          serviceSystemId: true,
          serialNumber: true,
          metadata: true,
        })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const issueAnchorState = buildIssueAnchorState({ input: data });

    return previewIssueAnchors({
      organizationId: ctx.organizationId,
      anchors: issueAnchorState.anchors,
      explicitFields: issueAnchorState.explicitFields,
      customerId: data.customerId ?? null,
    });
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

    const issueAnchorState = buildIssueAnchorState({
      input: updates,
      existing: {
        ...extractIssueAnchorValues(existing),
        metadata: existing.metadata as Record<string, unknown> | null,
      },
    });
    const resolution = await resolveIssueAnchors(ctx.organizationId, issueAnchorState.anchors);
    assertIssueAnchors({
      anchors: issueAnchorState.anchors,
      explicitFields: issueAnchorState.explicitFields,
      customerId:
        Object.prototype.hasOwnProperty.call(updates, 'customerId')
          ? (updates.customerId ?? null)
          : existing.customerId,
      resolution,
    });
    const hasExplicitAnchorChange = Object.entries(issueAnchorState.explicitFields).some(
      ([field, explicit]) => field !== 'customerId' && explicit
    );
    const nextCustomerId = issueAnchorState.explicitFields.customerId
      ? (updates.customerId ?? null)
      : hasExplicitAnchorChange && resolution.commercialCustomerId
        ? resolution.commercialCustomerId
        : existing.customerId;
    const isResolving = updates.status === 'resolved';
    if (isResolving) {
      const validationErrors: Record<string, string[]> = {};
      if (!updates.resolutionCategory) {
        validationErrors.resolutionCategory = ['Resolution category is required.'];
      }
      if (!updates.resolutionNotes?.trim()) {
        validationErrors.resolutionNotes = ['Resolution summary is required.'];
      }
      if (!updates.nextActionType) {
        validationErrors.nextActionType = ['Next action is required.'];
      }
      if (Object.keys(validationErrors).length > 0) {
        throw new ValidationError(
          'Structured resolution details are required before resolving an issue.',
          validationErrors
        );
      }
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
            updates.status === 'resolved' &&
            existing.status !== 'resolved' &&
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
          }
        }
      }

      if (updates.status === 'resolved' && existing.status !== 'resolved') {
        issueResolvedAt = new Date();
      }

      return await tx
        .update(issues)
        .set({
          ...updates,
          customerId: nextCustomerId,
          warrantyId: resolution.anchors.warrantyId,
          warrantyEntitlementId: resolution.anchors.warrantyEntitlementId,
          orderId: resolution.anchors.orderId,
          shipmentId: resolution.anchors.shipmentId,
          productId: resolution.anchors.productId,
          serializedItemId: resolution.anchors.serializedItemId,
          serviceSystemId: resolution.anchors.serviceSystemId,
          serialNumber: resolution.anchors.serialNumber,
          metadata: syncIssueAnchorMetadata(issueAnchorState.metadata, resolution.anchors),
          ...(issueResolvedAt && {
            resolvedAt: issueResolvedAt,
            resolvedByUserId: ctx.user.id,
          }),
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

type EnrichedIssueWithMetrics = IssueWithSlaMetrics & {
  customer?: { id: string; name: string } | null;
  serviceSystem?: { id: string; displayName: string } | null;
  rmaState: 'ready' | 'blocked' | 'linked';
  linkedRmaCount: number;
};

async function enrichIssueListRows<
  TIssue extends typeof issues.$inferSelect & {
    customer?: { id: string; name: string } | null;
    serviceSystem?: { id: string; displayName: string } | null;
    slaMetrics?: IssueSlaMetrics | null;
  },
>(organizationId: string, rows: TIssue[]) {
  return Promise.all(
    rows.map(async (issue) => {
      const { anchorResolution, remedyContext } = await resolveIssueDetailContext(
        organizationId,
        issue
      );

      return {
        ...issue,
        ...anchorResolution.anchors,
        resolutionCategory: issue.resolutionCategory ?? null,
        nextActionType: issue.nextActionType ?? null,
        rmaState: remedyContext.rmaReadiness.state,
        linkedRmaCount: remedyContext.rmaReadiness.existingRmas.length,
      };
    })
  );
}

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
    applyOptionalEqualityFilter(conditions as never[], data.nextActionType, issues.nextActionType);
    applyLineageStateFilter(conditions as never[], data.serialState, issues.serialNumber);
    applyLineageStateFilter(conditions as never[], data.warrantyState, issues.warrantyId);
    applyLineageStateFilter(conditions as never[], data.orderState, issues.orderId);
    applyLineageStateFilter(
      conditions as never[],
      data.serviceSystemState,
      issues.serviceSystemId
    );
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
      conditions.push(buildIssueSearchCondition(data.search, ctx.organizationId));
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

    const needsRmaFiltering = !!data.rmaState && data.rmaState !== 'any';
    const selectIssueRows = (limit: number, offset: number) =>
      db
        .select({
          issue: issues,
          tracking: slaTracking,
          config: slaConfigurations,
          customer: { id: customers.id, name: customers.name },
          serviceSystem: {
            id: serviceSystems.id,
            displayName: serviceSystems.displayName,
          },
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
        .leftJoin(serviceSystems, eq(issues.serviceSystemId, serviceSystems.id))
        .where(and(...conditions))
        .orderBy(desc(issues.createdAt))
        .limit(limit)
        .offset(offset);

    if (!needsRmaFiltering) {
      const results = await selectIssueRows(data.limit, data.offset);
      const issuesWithMetrics = mapIssueRowsWithMetrics(results);
      return enrichIssueListRows(ctx.organizationId, issuesWithMetrics);
    }

    const targetCount = data.offset + data.limit;
    const batchSize = Math.max(data.limit * 3, 50);
    const matchedRows: EnrichedIssueWithMetrics[] = [];
    let fetchOffset = 0;

    while (matchedRows.length < targetCount) {
      const batch = await selectIssueRows(batchSize, fetchOffset);
      if (batch.length === 0) break;

      const issuesWithMetrics = mapIssueRowsWithMetrics(batch);
      const enrichedBatch = await enrichIssueListRows(ctx.organizationId, issuesWithMetrics);
      matchedRows.push(
        ...enrichedBatch.filter((issue) => matchesRmaState(data.rmaState, issue.rmaState ?? null))
      );

      fetchOffset += batch.length;
      if (batch.length < batchSize) break;
    }

    return matchedRows.slice(data.offset, targetCount);
  });

/**
 * Get issues with SLA metrics and cursor pagination (recommended for large datasets).
 */
export const getIssuesWithSlaMetricsCursor = createServerFn({ method: 'GET' })
  .inputValidator(getIssuesCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const {
      cursor,
      pageSize = 20,
      sortOrder = 'desc',
      status,
      priority,
      type,
      customerId,
      assignedToUserId,
      assignedToFilter,
      search,
      slaStatus,
      escalated,
      nextActionType,
      rmaState,
      serialState,
      warrantyState,
      orderState,
      serviceSystemState,
    } = data;

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
    applyOptionalEqualityFilter(conditions as never[], nextActionType, issues.nextActionType);
    applyLineageStateFilter(conditions as never[], serialState, issues.serialNumber);
    applyLineageStateFilter(conditions as never[], warrantyState, issues.warrantyId);
    applyLineageStateFilter(conditions as never[], orderState, issues.orderId);
    applyLineageStateFilter(conditions as never[], serviceSystemState, issues.serviceSystemId);
    if (assignedToFilter === 'unassigned') {
      conditions.push(isNull(issues.assignedToUserId));
    } else if (assignedToFilter === 'me' || assignedToUserId) {
      const userId = assignedToFilter === 'me' ? ctx.user.id : assignedToUserId;
      if (userId) conditions.push(eq(issues.assignedToUserId, userId));
    }
    if (escalated === true) conditions.push(isNotNull(issues.escalatedAt));
    if (search) {
      conditions.push(buildIssueSearchCondition(search, ctx.organizationId));
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

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const batchSize = rmaState && rmaState !== 'any' ? Math.max(pageSize * 3, 50) : pageSize + 1;
    const selectIssueRows = (batchCursor: ReturnType<typeof decodeCursor> | null, limit: number) => {
      const batchConditions = [...conditions];
      if (batchCursor) {
        batchConditions.push(
          buildCursorCondition(issues.createdAt, issues.id, batchCursor, sortOrder)
        );
      }

      return db
        .select({
          issue: issues,
          tracking: slaTracking,
          config: slaConfigurations,
          customer: { id: customers.id, name: customers.name },
          serviceSystem: {
            id: serviceSystems.id,
            displayName: serviceSystems.displayName,
          },
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
        .leftJoin(serviceSystems, eq(issues.serviceSystemId, serviceSystems.id))
        .where(and(...batchConditions))
        .orderBy(orderDir(issues.createdAt), orderDir(issues.id))
        .limit(limit);
    };

    const filteredRows: EnrichedIssueWithMetrics[] = [];
    let batchCursor = cursor ? decodeCursor(cursor) : null;
    let exhausted = false;

    while (filteredRows.length <= pageSize && !exhausted) {
      const results = await selectIssueRows(batchCursor, batchSize);
      if (results.length === 0) {
        exhausted = true;
        break;
      }

      const issuesWithMetrics = mapIssueRowsWithMetrics(results);
      const enrichedRows = await enrichIssueListRows(ctx.organizationId, issuesWithMetrics);
      filteredRows.push(
        ...enrichedRows.filter((issue) => matchesRmaState(rmaState, issue.rmaState ?? null))
      );

      const lastResult = results[results.length - 1]?.issue;
      batchCursor = lastResult
        ? { createdAt: lastResult.createdAt.toISOString(), id: lastResult.id }
        : batchCursor;

      if (results.length < batchSize) {
        exhausted = true;
      }
    }

    const hasNextPage = filteredRows.length > pageSize;
    const pageItems = hasNextPage ? filteredRows.slice(0, pageSize) : filteredRows;

    let nextCursor: string | null = null;
    if (hasNextPage && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
    }

    return {
      items: pageItems,
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
